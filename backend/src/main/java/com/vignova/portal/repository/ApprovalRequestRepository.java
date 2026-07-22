package com.vignova.portal.repository;

import com.vignova.portal.entity.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {
    List<ApprovalRequest> findByClientIdOrderByCreatedAtDesc(Long clientId);

    @Query("SELECT COUNT(a) FROM ApprovalRequest a WHERE a.client.id = :clientId AND a.createdAt >= :since")
    long countTodayRequests(@Param("clientId") Long clientId, @Param("since") LocalDateTime since);
}
