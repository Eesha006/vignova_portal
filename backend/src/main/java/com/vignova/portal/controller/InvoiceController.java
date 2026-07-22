package com.vignova.portal.controller;

import com.vignova.portal.entity.Invoice;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.InvoiceRepository;
import com.vignova.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<List<Invoice>> getInvoices(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(invoiceRepository.findAll());
        }
        return ResponseEntity.ok(invoiceRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Invoice>> getPendingInvoices(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(invoiceRepository.findByClientIdAndStatus(user.getId(), Invoice.Status.PENDING));
    }

    @GetMapping("/paid")
    public ResponseEntity<List<Invoice>> getPaidInvoices(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(invoiceRepository.findByClientIdAndStatus(user.getId(), Invoice.Status.PAID));
    }

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Invoice> createInvoice(
            @RequestParam("invoiceNumber") String invoiceNumber,
            @RequestParam("amount") BigDecimal amount,
            @RequestParam("clientId") Long clientId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "monthYear", required = false) String monthYear,
            @RequestParam(value = "status", defaultValue = "PENDING") String status,
            @RequestParam(value = "dueDate", required = false) String dueDate,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {

        User client = userRepository.findById(clientId).orElseThrow();

        String filePath = null;
        if (file != null && !file.isEmpty()) {
            Path uploadPath = Paths.get(uploadDir, "invoices");
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
            String filename = "invoice_" + invoiceNumber.replaceAll("[^a-zA-Z0-9]", "_") + "_" + System.currentTimeMillis() + ".pdf";
            Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            filePath = "invoices/" + filename;
        }

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .amount(amount)
                .client(client)
                .description(description)
                .monthYear(monthYear)
                .status(Invoice.Status.valueOf(status))
                .filePath(filePath)
                .dueDate(dueDate != null && !dueDate.isEmpty() ? LocalDateTime.parse(dueDate) : null)
                .build();

        return ResponseEntity.ok(invoiceRepository.save(invoice));
    }

    @PutMapping("/{id}/mark-paid")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Invoice> markPaid(
            @PathVariable Long id,
            @RequestParam(value = "paidDate", required = false) String paidDate) {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow();
        invoice.setStatus(Invoice.Status.PAID);
        invoice.setPaidDate(
            paidDate != null && !paidDate.isEmpty()
                ? LocalDateTime.parse(paidDate)
                : LocalDateTime.now()
        );
        return ResponseEntity.ok(invoiceRepository.save(invoice));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) throws IOException {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow();
        if (invoice.getFilePath() != null) {
            Files.deleteIfExists(Paths.get(uploadDir, invoice.getFilePath()));
        }
        invoiceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadInvoice(@PathVariable Long id) throws IOException {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow();
        if (invoice.getFilePath() == null) return ResponseEntity.notFound().build();
        Path filePath = Paths.get(uploadDir, invoice.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"Invoice_" + invoice.getInvoiceNumber() + ".pdf\"")
                .body(resource);
    }
}