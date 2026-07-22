package com.vignova.portal.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "approval_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Which client this approval is FOR
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id")
    @JsonIgnoreProperties({"password", "otpCode", "otpExpiry", "hibernateLazyInitializer", "handler"})
    private User client;

    // Who sent this approval (admin or team member)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "submitted_by")
    @JsonIgnoreProperties({"password", "otpCode", "otpExpiry", "hibernateLazyInitializer", "handler"})
    private User submittedBy;

    @Column(nullable = false)
    private String title;

    // Notes from admin/team member
    @Column(columnDefinition = "TEXT")
    private String feedback;

    // File uploaded for client to review
    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    // Optional website link
    @Column(name = "website_link", columnDefinition = "TEXT")
    private String websiteLink;

    // Client's decision — APPROVED / NEEDS_CHANGE / null (not yet decided)
    @Column(name = "client_decision")
    private String clientDecision;

    // Client's feedback when deciding
    @Column(name = "client_feedback", columnDefinition = "TEXT")
    private String clientFeedback;

    // Once client saves decision it's permanently locked
    @Column(name = "client_decision_locked")
    private Boolean clientDecisionLocked = false;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (clientDecisionLocked == null) clientDecisionLocked = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Status {
        PENDING, APPROVED, CHANGES_REQUESTED
    }
}