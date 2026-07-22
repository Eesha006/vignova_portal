package com.vignova.portal.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "performance_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PerformanceReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id")
    @JsonIgnoreProperties({"password","otpCode","otpExpiry","hibernateLazyInitializer","handler"})
    private User client;

    @Column(name = "month_year", nullable = false)
    private String monthYear;

    // Metrics
    private Long reach;
    private Long engagement;
    private Long clicks;
    private Long followers;
    private Long leads;

    @Column(name = "ad_spend")
    private Double adSpend;

    private String cpc;
    private String roas;

    @Column(name = "website_traffic")
    private Long websiteTraffic;

    @Column(name = "instagram_reach")
    private Long instagramReach;

    @Column(name = "facebook_reach")
    private Long facebookReach;

    @Column(name = "youtube_reach")
    private Long youtubeReach;

    @Column(name = "instagram_engagement")
    private Long instagramEngagement;

    @Column(name = "facebook_engagement")
    private Long facebookEngagement;

    @Column(name = "youtube_engagement")
    private Long youtubeEngagement;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // PDF report upload
    @Column(name = "pdf_path")
    private String pdfPath;

    @Column(name = "pdf_name")
    private String pdfName;

    @Column(name = "pdf_size")
    private Long pdfSize;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "uploaded_by")
    @JsonIgnoreProperties({"password","otpCode","otpExpiry","hibernateLazyInitializer","handler"})
    private User uploadedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}