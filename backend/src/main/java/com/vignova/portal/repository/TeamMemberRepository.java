package com.vignova.portal.repository;

import com.vignova.portal.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    Optional<TeamMember> findByEmail(String email);
    boolean existsByEmail(String email);
    List<TeamMember> findByStatus(TeamMember.Status status);
}