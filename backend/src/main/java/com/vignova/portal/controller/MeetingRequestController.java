package com.vignova.portal.controller;

import com.vignova.portal.entity.MeetingRequest;
import com.vignova.portal.entity.TeamMember;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.MeetingRequestRepository;
import com.vignova.portal.repository.TeamMemberRepository;
import com.vignova.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingRequestController {

    private final MeetingRequestRepository meetingRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;

    @GetMapping
    public ResponseEntity<List<MeetingRequest>> getMeetings(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Admin sees everything
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(meetingRepository.findAll());
        }

        // Team member — find their TeamMember record by email, then filter meetings where they are a participant
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }
            Long tmId = tmOpt.get().getId();
            List<MeetingRequest> assigned = meetingRepository.findAll().stream()
                .filter(m -> m.getParticipants() != null &&
                    m.getParticipants().stream().anyMatch(p -> p.getId().equals(tmId)))
                .collect(Collectors.toList());
            return ResponseEntity.ok(assigned);
        }

        // Client sees their own meetings
        return ResponseEntity.ok(meetingRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> requestMeeting(@RequestBody MeetingRequest request, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        LocalDateTime fourHoursAgo = LocalDateTime.now().minusHours(4);
        List<MeetingRequest> recent = meetingRepository.findRecentCompleted(user.getId(), fourHoursAgo);
        if (!recent.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "You can request another meeting after 4 hours."));
        }

        List<MeetingRequest> all = meetingRepository.findByClientIdOrderByCreatedAtDesc(user.getId());
        boolean hasPending = all.stream().anyMatch(m ->
            m.getStatus() == MeetingRequest.Status.REQUESTED ||
            m.getStatus() == MeetingRequest.Status.CONFIRMED ||
            m.getStatus() == MeetingRequest.Status.SCHEDULED);
        if (hasPending) {
            return ResponseEntity.badRequest().body(Map.of("error", "You already have a pending meeting request."));
        }

        request.setClient(user);
        request.setStatus(MeetingRequest.Status.REQUESTED);
        return ResponseEntity.ok(meetingRepository.save(request));
    }

    @PutMapping("/{id}/schedule")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> scheduleMeeting(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            MeetingRequest meeting = meetingRepository.findById(id).orElseThrow();
            meeting.setStatus(MeetingRequest.Status.SCHEDULED);
            meeting.setScheduledStart(LocalDateTime.parse(body.get("scheduledStart").toString()));
            meeting.setScheduledEnd(LocalDateTime.parse(body.get("scheduledEnd").toString()));

            if (meeting.getRoomCode() == null || meeting.getRoomCode().isEmpty()) {
                meeting.setRoomCode("VIGN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            }

            if (body.containsKey("notes") && body.get("notes") != null) {
                meeting.setNotes(body.get("notes").toString());
            }

            if (body.containsKey("participantIds") && body.get("participantIds") != null) {
                List<?> rawIds = (List<?>) body.get("participantIds");
                List<Long> participantIds = rawIds.stream()
                    .map(o -> Long.valueOf(o.toString()))
                    .collect(Collectors.toList());
                meeting.setParticipants(
                    participantIds.isEmpty() ? new ArrayList<>()
                        : teamMemberRepository.findAllById(participantIds));
            }

            return ResponseEntity.ok(meetingRepository.save(meeting));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to schedule: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/participants")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MeetingRequest> updateParticipants(
            @PathVariable Long id,
            @RequestBody Map<String, List<Object>> body) {
        MeetingRequest meeting = meetingRepository.findById(id).orElseThrow();
        if (body.containsKey("participantIds")) {
            List<Long> ids = body.get("participantIds").stream()
                .map(o -> Long.valueOf(o.toString())).collect(Collectors.toList());
            meeting.setParticipants(teamMemberRepository.findAllById(ids));
        }
        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MeetingRequest> updateMeeting(@PathVariable Long id, @RequestBody Map<String, String> body) {
        MeetingRequest meeting = meetingRepository.findById(id).orElseThrow();
        if (body.containsKey("status") && !body.get("status").isEmpty())
            meeting.setStatus(MeetingRequest.Status.valueOf(body.get("status")));
        if (body.containsKey("notes"))
            meeting.setNotes(body.get("notes"));
        if (body.containsKey("scheduledStart") && !body.get("scheduledStart").isEmpty())
            meeting.setScheduledStart(LocalDateTime.parse(body.get("scheduledStart")));
        if (body.containsKey("scheduledEnd") && !body.get("scheduledEnd").isEmpty())
            meeting.setScheduledEnd(LocalDateTime.parse(body.get("scheduledEnd")));
        if (meeting.getRoomCode() == null &&
            (meeting.getStatus() == MeetingRequest.Status.SCHEDULED ||
             meeting.getStatus() == MeetingRequest.Status.CONFIRMED)) {
            meeting.setRoomCode("VIGN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    @GetMapping("/{id}/room-access")
    public ResponseEntity<Map<String, Object>> checkRoomAccess(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        MeetingRequest meeting = meetingRepository.findById(id).orElseThrow();

        boolean isAdmin = user.getRole() == User.Role.ADMIN;
        boolean isClient = meeting.getClient() != null && meeting.getClient().getId().equals(user.getId());

        // Team member access — match by email
        boolean isParticipant = false;
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            isParticipant = meeting.getParticipants() != null &&
                meeting.getParticipants().stream()
                    .anyMatch(p -> p.getEmail().equals(user.getEmail()));
        }

        Map<String, Object> response = new HashMap<>();

        if (!isAdmin && !isClient && !isParticipant) {
            response.put("access", false);
            response.put("reason", "Unauthorized");
            return ResponseEntity.ok(response);
        }

        if (meeting.getScheduledStart() == null || meeting.getScheduledEnd() == null) {
            response.put("access", false);
            response.put("reason", "Meeting not scheduled yet");
            return ResponseEntity.ok(response);
        }

        LocalDateTime now = LocalDateTime.now();
        boolean isActive = now.isAfter(meeting.getScheduledStart()) && now.isBefore(meeting.getScheduledEnd());

        response.put("scheduledStart", meeting.getScheduledStart().toString());
        response.put("scheduledEnd", meeting.getScheduledEnd().toString());
        response.put("roomCode", meeting.getRoomCode() != null ? meeting.getRoomCode() : "");

        if (isActive) {
            response.put("access", true);
            response.put("reason", "Active");
        } else if (now.isBefore(meeting.getScheduledStart())) {
            response.put("access", false);
            response.put("reason", "Meeting hasn't started yet");
        } else {
            response.put("access", false);
            response.put("reason", "Meeting has ended");
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMeeting(@PathVariable Long id) {
        meetingRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}