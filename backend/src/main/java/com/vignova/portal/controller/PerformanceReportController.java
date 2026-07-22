package com.vignova.portal.controller;

import com.vignova.portal.entity.PerformanceReport;
import com.vignova.portal.entity.TeamMember;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.ClientAssignmentRepository;
import com.vignova.portal.repository.PerformanceReportRepository;
import com.vignova.portal.repository.TeamMemberRepository;
import com.vignova.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class PerformanceReportController {

    private final PerformanceReportRepository reportRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ClientAssignmentRepository clientAssignmentRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<List<PerformanceReport>> getReports(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(reportRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList()));
        }

        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.ok(List.of());
            List<Long> ids = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream().map(a -> a.getClient().getId()).collect(Collectors.toList());
            if (ids.isEmpty()) return ResponseEntity.ok(List.of());
            return ResponseEntity.ok(ids.stream()
                .flatMap(cid -> reportRepository.findByClientIdOrderByCreatedAtDesc(cid).stream())
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList()));
        }

        return ResponseEntity.ok(
            reportRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<PerformanceReport>> getClientReports(
            @PathVariable Long clientId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isPresent()) {
                List<Long> ids = clientAssignmentRepository
                    .findByTeamMemberId(tmOpt.get().getId())
                    .stream().map(a -> a.getClient().getId()).collect(Collectors.toList());
                if (!ids.contains(clientId)) return ResponseEntity.status(403).build();
            }
        }

        return ResponseEntity.ok(
            reportRepository.findByClientIdOrderByCreatedAtDesc(clientId));
    }

    // Create or update report metrics
    @PostMapping
    public ResponseEntity<?> createReport(
            @RequestBody PerformanceReport report, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }
        report.setUploadedBy(user);
        return ResponseEntity.ok(reportRepository.save(report));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateReport(
            @PathVariable Long id,
            @RequestBody PerformanceReport updated, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }
        PerformanceReport report = reportRepository.findById(id).orElseThrow();
        report.setMonthYear(updated.getMonthYear());
        report.setReach(updated.getReach());
        report.setEngagement(updated.getEngagement());
        report.setClicks(updated.getClicks());
        report.setFollowers(updated.getFollowers());
        report.setLeads(updated.getLeads());
        report.setAdSpend(updated.getAdSpend());
        report.setCpc(updated.getCpc());
        report.setRoas(updated.getRoas());
        report.setWebsiteTraffic(updated.getWebsiteTraffic());
        report.setInstagramReach(updated.getInstagramReach());
        report.setFacebookReach(updated.getFacebookReach());
        report.setYoutubeReach(updated.getYoutubeReach());
        report.setInstagramEngagement(updated.getInstagramEngagement());
        report.setFacebookEngagement(updated.getFacebookEngagement());
        report.setYoutubeEngagement(updated.getYoutubeEngagement());
        report.setNotes(updated.getNotes());
        return ResponseEntity.ok(reportRepository.save(report));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReport(
            @PathVariable Long id, Authentication auth) throws IOException {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }
        PerformanceReport report = reportRepository.findById(id).orElseThrow();
        if (report.getPdfPath() != null) {
            Files.deleteIfExists(Paths.get(uploadDir, report.getPdfPath()));
        }
        reportRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Upload PDF for a report
    @PostMapping(value = "/{id}/upload-pdf", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadPdf(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication auth) throws IOException {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }
        PerformanceReport report = reportRepository.findById(id).orElseThrow();

        Path uploadPath = Paths.get(uploadDir, "reports");
        if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

        // Delete old PDF if exists
        if (report.getPdfPath() != null) {
            Files.deleteIfExists(Paths.get(uploadDir, report.getPdfPath()));
        }

        String storedName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Files.copy(file.getInputStream(), uploadPath.resolve(storedName),
            StandardCopyOption.REPLACE_EXISTING);

        report.setPdfPath("reports/" + storedName);
        report.setPdfName(file.getOriginalFilename());
        report.setPdfSize(file.getSize());

        return ResponseEntity.ok(reportRepository.save(report));
    }

    // Download PDF
    @GetMapping("/{id}/download-pdf")
    public ResponseEntity<Resource> downloadPdf(
            @PathVariable Long id) throws IOException {
        PerformanceReport report = reportRepository.findById(id).orElseThrow();
        if (report.getPdfPath() == null) return ResponseEntity.notFound().build();

        Path filePath = Paths.get(uploadDir, report.getPdfPath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + report.getPdfName() + "\"")
            .body(resource);
    }

    // Delete just the PDF
    @DeleteMapping("/{id}/pdf")
    public ResponseEntity<?> deletePdf(
            @PathVariable Long id, Authentication auth) throws IOException {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }
        PerformanceReport report = reportRepository.findById(id).orElseThrow();
        if (report.getPdfPath() != null) {
            Files.deleteIfExists(Paths.get(uploadDir, report.getPdfPath()));
            report.setPdfPath(null);
            report.setPdfName(null);
            report.setPdfSize(null);
            reportRepository.save(report);
        }
        return ResponseEntity.ok(Map.of("message", "PDF deleted"));
    }
}