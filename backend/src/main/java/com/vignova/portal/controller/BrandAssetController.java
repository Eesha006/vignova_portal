package com.vignova.portal.controller;

import com.vignova.portal.entity.BrandAsset;
import com.vignova.portal.entity.TeamMember;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.BrandAssetRepository;
import com.vignova.portal.repository.ClientAssignmentRepository;
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
@RequestMapping("/api/brand-assets")
@RequiredArgsConstructor
public class BrandAssetController {

    private final BrandAssetRepository brandAssetRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ClientAssignmentRepository clientAssignmentRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    // ── GET — role-based filtering ────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<BrandAsset>> getAssets(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Admin sees ALL
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(brandAssetRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList()));
        }

        // Team member sees only assigned clients' assets
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.ok(List.of());
            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream().map(a -> a.getClient().getId())
                .collect(Collectors.toList());
            if (assignedClientIds.isEmpty()) return ResponseEntity.ok(List.of());
            List<BrandAsset> assets = assignedClientIds.stream()
                .flatMap(cid -> brandAssetRepository
                    .findByClientIdOrderByCreatedAtDesc(cid).stream())
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
            return ResponseEntity.ok(assets);
        }

        // Client sees own assets
        return ResponseEntity.ok(
            brandAssetRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
    }

    // ── UPLOAD — admin only ───────────────────────────────────────────────
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("clientId") Long clientId,
            @RequestParam("name") String name,
            @RequestParam(value = "category", defaultValue = "General") String category,
            @RequestParam(value = "description", required = false) String description)
            throws IOException {

        Path uploadPath = Paths.get(uploadDir, "brand-assets");
        if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

        String storedName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Files.copy(file.getInputStream(),
            uploadPath.resolve(storedName),
            StandardCopyOption.REPLACE_EXISTING);

        User client = userRepository.findById(clientId).orElseThrow();

        BrandAsset asset = BrandAsset.builder()
            .client(client)
            .name(name)
            .filePath("brand-assets/" + storedName)
            .fileName(file.getOriginalFilename())
            .fileType(file.getContentType())
            .fileSize(file.getSize())
            .category(category)
            .description(description)
            .build();

        return ResponseEntity.ok(brandAssetRepository.save(asset));
    }

    // ── UPDATE name/category/description — admin only ─────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BrandAsset> update(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        BrandAsset asset = brandAssetRepository.findById(id).orElseThrow();
        if (body.containsKey("name")) asset.setName(body.get("name"));
        if (body.containsKey("category")) asset.setCategory(body.get("category"));
        if (body.containsKey("description")) asset.setDescription(body.get("description"));
        return ResponseEntity.ok(brandAssetRepository.save(asset));
    }

    // ── DELETE — admin only ───────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) throws IOException {
        BrandAsset asset = brandAssetRepository.findById(id).orElseThrow();
        if (asset.getFilePath() != null) {
            Files.deleteIfExists(Paths.get(uploadDir, asset.getFilePath()));
        }
        brandAssetRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── DOWNLOAD — all authenticated users ───────────────────────────────
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(
            @PathVariable Long id,
            Authentication auth) throws IOException {

        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        BrandAsset asset = brandAssetRepository.findById(id).orElseThrow();

        // Team member — verify it's their assigned client's asset
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isPresent()) {
                List<Long> assignedIds = clientAssignmentRepository
                    .findByTeamMemberId(tmOpt.get().getId())
                    .stream().map(a -> a.getClient().getId())
                    .collect(Collectors.toList());
                if (asset.getClient() == null ||
                    !assignedIds.contains(asset.getClient().getId())) {
                    return ResponseEntity.status(403).build();
                }
            }
        }

        // Client — verify it's their own asset
        if (user.getRole() == User.Role.CLIENT) {
            if (asset.getClient() == null ||
                !asset.getClient().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
        }

        Path filePath = Paths.get(uploadDir, asset.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();

        String mimeType = asset.getFileType() != null
            ? asset.getFileType() : "application/octet-stream";

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(mimeType))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + asset.getFileName() + "\"")
            .body(resource);
    }
}