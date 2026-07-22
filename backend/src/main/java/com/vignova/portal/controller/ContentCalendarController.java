package com.vignova.portal.controller;

import com.vignova.portal.entity.ContentCalendar;
import com.vignova.portal.entity.TeamMember;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.ClientAssignmentRepository;
import com.vignova.portal.repository.ContentCalendarRepository;
import com.vignova.portal.repository.TeamMemberRepository;
import com.vignova.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class ContentCalendarController {

    private final ContentCalendarRepository calendarRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ClientAssignmentRepository clientAssignmentRepository;

    @GetMapping
    public ResponseEntity<List<ContentCalendar>> getCalendar(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Admin sees all
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(calendarRepository.findAll());
        }

        // Team member sees only assigned clients calendars
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.ok(List.of());

            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream()
                .map(a -> a.getClient().getId())
                .collect(Collectors.toList());

            if (assignedClientIds.isEmpty()) return ResponseEntity.ok(List.of());

            List<ContentCalendar> entries = assignedClientIds.stream()
                .flatMap(cid -> calendarRepository
                    .findByClientIdOrderByScheduledDateAsc(cid).stream())
                .collect(Collectors.toList());

            return ResponseEntity.ok(entries);
        }

        // Client sees own calendar
        return ResponseEntity.ok(
            calendarRepository.findByClientIdOrderByScheduledDateAsc(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ContentCalendar entry, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Admin can create for any client
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(calendarRepository.save(entry));
        }

        // Team member can only create for assigned clients
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.status(403).body("Not authorized");

            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream()
                .map(a -> a.getClient().getId())
                .collect(Collectors.toList());

            Long entryClientId = entry.getClient() != null ? entry.getClient().getId() : null;
            if (entryClientId == null || !assignedClientIds.contains(entryClientId)) {
                return ResponseEntity.status(403).body("You can only add events for your assigned clients");
            }

            return ResponseEntity.ok(calendarRepository.save(entry));
        }

        return ResponseEntity.status(403).body("Not authorized");
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody ContentCalendar updated,
                                    Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        ContentCalendar entry = calendarRepository.findById(id).orElseThrow();

        // Team member — verify the entry belongs to their assigned client
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.status(403).body("Not authorized");

            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream()
                .map(a -> a.getClient().getId())
                .collect(Collectors.toList());

            Long entryClientId = entry.getClient() != null ? entry.getClient().getId() : null;
            if (entryClientId == null || !assignedClientIds.contains(entryClientId)) {
                return ResponseEntity.status(403).body("You can only edit events for your assigned clients");
            }
        } else if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        entry.setTitle(updated.getTitle());
        entry.setDescription(updated.getDescription());
        entry.setContentType(updated.getContentType());
        entry.setStatus(updated.getStatus());
        entry.setScheduledDate(updated.getScheduledDate());
        entry.setPlatform(updated.getPlatform());
        return ResponseEntity.ok(calendarRepository.save(entry));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        ContentCalendar entry = calendarRepository.findById(id).orElseThrow();

        // Team member — verify assigned client
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.status(403).body("Not authorized");

            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream()
                .map(a -> a.getClient().getId())
                .collect(Collectors.toList());

            Long entryClientId = entry.getClient() != null ? entry.getClient().getId() : null;
            if (entryClientId == null || !assignedClientIds.contains(entryClientId)) {
                return ResponseEntity.status(403).body("You can only delete events for your assigned clients");
            }
        } else if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        calendarRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}