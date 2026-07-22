package com.vignova.portal.controller;

import com.vignova.portal.entity.User;
import com.vignova.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProjectRepository projectRepository;
    private final InvoiceRepository invoiceRepository;
    private final DeliverableRepository deliverableRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final MeetingRequestRepository meetingRequestRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final MessageRepository messageRepository;
    private final ContentCalendarRepository contentCalendarRepository;

    @GetMapping("/clients")
    public ResponseEntity<List<User>> getAllClients() {
        return ResponseEntity.ok(userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.CLIENT).toList());
    }

    @PostMapping("/clients")
    public ResponseEntity<User> createClient(@RequestBody Map<String, String> body) {
        if (userRepository.existsByEmail(body.get("email"))) {
            return ResponseEntity.badRequest().build();
        }
        User user = User.builder()
                .email(body.get("email"))
                .password(passwordEncoder.encode(body.get("password")))
                .fullName(body.get("fullName"))
                .phoneNumber(body.get("phoneNumber"))
                .companyName(body.get("companyName"))
                .accountManager(body.get("accountManager"))
                .role(User.Role.CLIENT)
                .active(true)
                .build();
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/clients/{id}")
    public ResponseEntity<User> updateClient(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id).orElseThrow();
        if (body.containsKey("fullName")) user.setFullName(body.get("fullName"));
        if (body.containsKey("accountManager")) user.setAccountManager(body.get("accountManager"));
        if (body.containsKey("companyName")) user.setCompanyName(body.get("companyName"));
        if (body.containsKey("phoneNumber")) user.setPhoneNumber(body.get("phoneNumber"));
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/clients/{id}")
    public ResponseEntity<Void> deleteClient(@PathVariable Long id) {
        // Delete all related data first to avoid FK constraint errors
        approvalRequestRepository.deleteAll(
            approvalRequestRepository.findByClientIdOrderByCreatedAtDesc(id));
        deliverableRepository.deleteAll(
            deliverableRepository.findByClientIdOrderByCreatedAtDesc(id));
        invoiceRepository.deleteAll(
            invoiceRepository.findByClientIdOrderByCreatedAtDesc(id));
        projectRepository.deleteAll(
            projectRepository.findByClientId(id));
        supportTicketRepository.deleteAll(
            supportTicketRepository.findByClientIdOrderByCreatedAtDesc(id));
        meetingRequestRepository.deleteAll(
            meetingRequestRepository.findByClientIdOrderByCreatedAtDesc(id));
        contentCalendarRepository.deleteAll(
            contentCalendarRepository.findByClientIdOrderByScheduledDateAsc(id));
        messageRepository.deleteAll(
            messageRepository.findConversation(id));
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}