package com.vignova.portal.controller;

import com.vignova.portal.entity.ApprovalRequest;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.ApprovalRequestRepository;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalRequestController {

    private final ApprovalRequestRepository approvalRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<List<ApprovalRequest>> getApprovals(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Admin sees ALL
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(approvalRepository.findAll().stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                }).toList());
        }

        // Team member sees approvals they submitted
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            return ResponseEntity.ok(approvalRepository.findAll().stream()
                .filter(a -> a.getSubmittedBy() != null &&
                    a.getSubmittedBy().getEmail().equals(user.getEmail()))
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                }).toList());
        }

        // Client sees approvals sent TO them (where client = them)
        return ResponseEntity.ok(
            approvalRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
    }

    // Admin or Team Member submits approval WITH file for client to review
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<?> createApprovalWithFile(
            @RequestParam("title") String title,
            @RequestParam(value = "feedback", required = false) String feedback,
            @RequestParam(value = "clientId") Long clientId,
            @RequestParam(value = "websiteLink", required = false) String websiteLink,
            @RequestParam(value = "file", required = false) MultipartFile file,
            Authentication auth) throws IOException {

        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Only admin and team member can send approvals to clients
        if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Clients cannot send approval requests"));
        }

        String filePath = null;
        String fileName = null;
        String fileType = null;
        Long fileSize = null;

        if (file != null && !file.isEmpty()) {
            Path uploadPath = Paths.get(uploadDir, "approvals");
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
            String storedName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(),
                uploadPath.resolve(storedName),
                StandardCopyOption.REPLACE_EXISTING);
            filePath = "approvals/" + storedName;
            fileName = file.getOriginalFilename();
            fileType = file.getContentType();
            fileSize = file.getSize();
        }

        User client = userRepository.findById(clientId).orElseThrow();

        ApprovalRequest approval = ApprovalRequest.builder()
            .title(title)
            .feedback(feedback)
            .client(client)
            .submittedBy(user)
            .filePath(filePath)
            .fileName(fileName)
            .fileType(fileType)
            .fileSize(fileSize)
            .websiteLink(websiteLink)
            .status(ApprovalRequest.Status.PENDING)
            .clientDecisionLocked(false)
            .build();

        return ResponseEntity.ok(approvalRepository.save(approval));
    }

    // Client responds to approval — permanent, cannot be changed once saved
    @PutMapping("/{id}/client-decision")
    public ResponseEntity<?> clientDecision(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {

        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        ApprovalRequest approval = approvalRepository.findById(id).orElseThrow();

        // Only the client this belongs to can respond
        if (approval.getClient() == null ||
            !approval.getClient().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }

        // Once client saves decision, it's locked permanently
        if (Boolean.TRUE.equals(approval.getClientDecisionLocked())) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "Decision already saved and cannot be changed"));
        }

        String decision = body.get("clientDecision");
        if (decision == null || decision.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Decision is required"));
        }

        approval.setClientDecision(decision);
        approval.setClientFeedback(body.getOrDefault("clientFeedback", ""));
        approval.setClientDecisionLocked(true); // PERMANENT — cannot change

        // Update status based on client decision
        if ("APPROVED".equals(decision)) {
            approval.setStatus(ApprovalRequest.Status.APPROVED);
        } else if ("NEEDS_CHANGE".equals(decision)) {
            approval.setStatus(ApprovalRequest.Status.CHANGES_REQUESTED);
        } else {
            approval.setStatus(ApprovalRequest.Status.PENDING);
        }

        return ResponseEntity.ok(approvalRepository.save(approval));
    }

    // Admin or team member updates their own approval (notes, file, title)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateApproval(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {

        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        ApprovalRequest approval = approvalRepository.findById(id).orElseThrow();

        // Admin can update anything
        // Team member can only update their own submissions
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            if (approval.getSubmittedBy() == null ||
                !approval.getSubmittedBy().getEmail().equals(user.getEmail())) {
                return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
            }
        } else if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }

        if (body.containsKey("title")) approval.setTitle(body.get("title"));
        if (body.containsKey("feedback")) approval.setFeedback(body.get("feedback"));
        if (body.containsKey("websiteLink")) approval.setWebsiteLink(body.get("websiteLink"));

        return ResponseEntity.ok(approvalRepository.save(approval));
    }

    // Admin or team member deletes approval
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteApproval(
            @PathVariable Long id,
            Authentication auth) throws IOException {

        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        ApprovalRequest approval = approvalRepository.findById(id).orElseThrow();

        if (user.getRole() == User.Role.CLIENT) {
            return ResponseEntity.status(403).body(Map.of("error", "Clients cannot delete approvals"));
        }

        if (user.getRole() == User.Role.TEAM_MEMBER) {
            if (approval.getSubmittedBy() == null ||
                !approval.getSubmittedBy().getEmail().equals(user.getEmail())) {
                return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
            }
        }

        // Delete file if exists
        if (approval.getFilePath() != null) {
            Files.deleteIfExists(Paths.get(uploadDir, approval.getFilePath()));
        }

        approvalRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Download file attached to approval
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) throws IOException {
        ApprovalRequest approval = approvalRepository.findById(id).orElseThrow();
        if (approval.getFilePath() == null) return ResponseEntity.notFound().build();

        Path filePath = Paths.get(uploadDir, approval.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();

        String mimeType = approval.getFileType() != null
            ? approval.getFileType() : "application/octet-stream";

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(mimeType))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + approval.getFileName() + "\"")
            .body(resource);
    }
}