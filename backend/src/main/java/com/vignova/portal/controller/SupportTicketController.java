package com.vignova.portal.controller;

import com.vignova.portal.entity.SupportTicket;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.SupportTicketRepository;
import com.vignova.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class SupportTicketController {

    private final SupportTicketRepository ticketRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<SupportTicket>> getTickets(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(ticketRepository.findAll());
        }
        return ResponseEntity.ok(ticketRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
    }

    @PostMapping
    public ResponseEntity<SupportTicket> createTicket(@RequestBody SupportTicket ticket, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        ticket.setClient(user);
        ticket.setStatus(SupportTicket.Status.OPEN);
        ticket.setTicketNumber("TKT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicket> updateTicket(@PathVariable Long id, @RequestBody Map<String, String> body) {
        SupportTicket ticket = ticketRepository.findById(id).orElseThrow();
        if (body.containsKey("status")) {
            ticket.setStatus(SupportTicket.Status.valueOf(body.get("status")));
        }
        if (body.containsKey("adminResponse")) {
            ticket.setAdminResponse(body.get("adminResponse"));
        }
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }
}
