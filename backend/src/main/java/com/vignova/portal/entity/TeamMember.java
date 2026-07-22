package com.vignova.portal.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String role;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "profile_picture")
    private String profilePicture;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "workload_percent")
    private int workloadPercent = 0;

    @Column(name = "joining_date")
    private LocalDateTime joiningDate;

    @Column(name = "tasks_completed")
    private int tasksCompleted = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Link to User account for login
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "otpCode", "otpExpiry", "hibernateLazyInitializer", "handler"})
    private User userAccount;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (joiningDate == null) joiningDate = LocalDateTime.now();
        if (status == null) status = Status.ACTIVE;
    }

    public enum Status {
        ACTIVE, INACTIVE
    }
}