package com.vignova.portal.controller;

import com.vignova.portal.entity.Deliverable;
import com.vignova.portal.entity.TeamMember;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.ClientAssignmentRepository;
import com.vignova.portal.repository.DeliverableRepository;
import com.vignova.portal.repository.TeamMemberRepository;
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
import java.nio.file.*;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/deliverables")
@RequiredArgsConstructor
public class DeliverableController {

    private final DeliverableRepository deliverableRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ClientAssignmentRepository clientAssignmentRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<List<Deliverable>> getDeliverables(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(deliverableRepository.findAll().stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList()));
        }

        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.ok(List.of());
            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream().map(a -> a.getClient().getId()).collect(Collectors.toList());
            if (assignedClientIds.isEmpty()) return ResponseEntity.ok(List.of());
            List<Deliverable> deliverables = assignedClientIds.stream()
                .flatMap(cid -> deliverableRepository.findByClientIdOrderByCreatedAtDesc(cid).stream())
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());
            return ResponseEntity.ok(deliverables);
        }

        return ResponseEntity.ok(
            deliverableRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Deliverable> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("clientId") Long clientId,
            @RequestParam("name") String name,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "monthYear", required = false) String monthYear) throws IOException {

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

        // Keep original filename with extension
        String originalFilename = file.getOriginalFilename();
        String filename = System.currentTimeMillis() + "_" + originalFilename;
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        User client = userRepository.findById(clientId).orElseThrow();
        Deliverable deliverable = Deliverable.builder()
                .client(client)
                .name(name)
                .filePath(filename)
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .category(category)
                .monthYear(monthYear)
                .build();
        return ResponseEntity.ok(deliverableRepository.save(deliverable));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws IOException {
        Deliverable d = deliverableRepository.findById(id).orElseThrow();
        Path filePath = Paths.get(uploadDir).resolve(d.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        // Detect correct content type from stored fileType or filename
        MediaType mediaType = resolveMediaType(d.getFileType(), d.getFilePath());

        // Use the original file name with correct extension for download
        String downloadName = resolveDownloadFilename(d.getName(), d.getFilePath());

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + downloadName + "\"")
                .body(resource);
    }

    // Resolve MediaType from stored MIME type or fall back to file extension
    private MediaType resolveMediaType(String mimeType, String filePath) {
        if (mimeType != null && !mimeType.isBlank()) {
            try {
                return MediaType.parseMediaType(mimeType);
            } catch (Exception ignored) {}
        }
        // Fallback: detect from file extension
        String ext = getExtension(filePath).toLowerCase();
        return switch (ext) {
            case "mp4"  -> MediaType.parseMediaType("video/mp4");
            case "mov"  -> MediaType.parseMediaType("video/quicktime");
            case "avi"  -> MediaType.parseMediaType("video/x-msvideo");
            case "mkv"  -> MediaType.parseMediaType("video/x-matroska");
            case "webm" -> MediaType.parseMediaType("video/webm");
            case "mp3"  -> MediaType.parseMediaType("audio/mpeg");
            case "wav"  -> MediaType.parseMediaType("audio/wav");
            case "pdf"  -> MediaType.APPLICATION_PDF;
            case "jpg", "jpeg" -> MediaType.IMAGE_JPEG;
            case "png"  -> MediaType.IMAGE_PNG;
            case "gif"  -> MediaType.IMAGE_GIF;
            case "webp" -> MediaType.parseMediaType("image/webp");
            case "doc"  -> MediaType.parseMediaType("application/msword");
            case "docx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            case "xls"  -> MediaType.parseMediaType("application/vnd.ms-excel");
            case "xlsx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "ppt"  -> MediaType.parseMediaType("application/vnd.ms-powerpoint");
            case "pptx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation");
            case "zip"  -> MediaType.parseMediaType("application/zip");
            case "rar"  -> MediaType.parseMediaType("application/x-rar-compressed");
            case "txt"  -> MediaType.TEXT_PLAIN;
            case "svg"  -> MediaType.parseMediaType("image/svg+xml");
            case "psd"  -> MediaType.parseMediaType("image/vnd.adobe.photoshop");
            case "ai"   -> MediaType.parseMediaType("application/postscript");
            default     -> MediaType.APPLICATION_OCTET_STREAM;
        };
    }

    // Make sure download filename has the correct extension
    private String resolveDownloadFilename(String name, String filePath) {
        if (name == null || name.isBlank()) return filePath;
        String nameExt = getExtension(name);
        String fileExt = getExtension(filePath);
        // If name already has extension, use as-is
        if (!nameExt.isEmpty()) return name;
        // Append extension from stored file path
        if (!fileExt.isEmpty()) return name + "." + fileExt;
        return name;
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return "";
        return filename.substring(dot + 1);
    }
}