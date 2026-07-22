package com.vignova.portal.repository;

import com.vignova.portal.entity.MeetingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface MeetingRequestRepository extends JpaRepository<MeetingRequest, Long> {
    List<MeetingRequest> findByClientIdOrderByCreatedAtDesc(Long clientId);

    @Query("SELECT m FROM MeetingRequest m WHERE m.client.id = :clientId AND m.status = 'COMPLETED' AND m.createdAt >= :since ORDER BY m.createdAt DESC")
    List<MeetingRequest> findRecentCompleted(@Param("clientId") Long clientId, @Param("since") LocalDateTime since);
}
