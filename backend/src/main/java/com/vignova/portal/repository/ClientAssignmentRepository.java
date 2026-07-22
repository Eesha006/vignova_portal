package com.vignova.portal.repository;

import com.vignova.portal.entity.ClientAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClientAssignmentRepository extends JpaRepository<ClientAssignment, Long> {
    List<ClientAssignment> findByTeamMemberId(Long teamMemberId);
    List<ClientAssignment> findByClientId(Long clientId);
    void deleteByTeamMemberIdAndClientId(Long teamMemberId, Long clientId);
    boolean existsByTeamMemberIdAndClientId(Long teamMemberId, Long clientId);
}