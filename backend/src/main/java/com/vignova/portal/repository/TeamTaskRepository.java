package com.vignova.portal.repository;

import com.vignova.portal.entity.TeamTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeamTaskRepository extends JpaRepository<TeamTask, Long> {
    List<TeamTask> findByAssignedToId(Long teamMemberId);
    List<TeamTask> findByClientId(Long clientId);
    List<TeamTask> findByStatus(TeamTask.Status status);
    long countByAssignedToIdAndStatus(Long teamMemberId, TeamTask.Status status);
    long countByStatus(TeamTask.Status status);
}