package com.vignova.portal.repository;

import com.vignova.portal.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByClientIdOrderByCreatedAtDesc(Long clientId);
}
