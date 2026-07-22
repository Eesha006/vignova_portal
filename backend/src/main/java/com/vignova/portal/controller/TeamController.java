package com.vignova.portal.controller;

import com.vignova.portal.entity.*;
import com.vignova.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
public class TeamController {

    private final TeamMemberRepository teamMemberRepository;
    private final TeamTaskRepository teamTaskRepository;
    private final ClientAssignmentRepository clientAssignmentRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Dashboard — admin only ────────────────────────────────────────────
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Map<String, Object> data = new HashMap<>();
        List<TeamMember> all = teamMemberRepository.findAll();
        data.put("totalMembers", all.size());
        data.put("activeMembers",
            all.stream().filter(m -> m.getStatus() == TeamMember.Status.ACTIVE).count());
        data.put("totalAssignments", clientAssignmentRepository.count());
        data.put("tasksInProgress",
            teamTaskRepository.countByStatus(TeamTask.Status.IN_PROGRESS));
        data.put("tasksCompleted",
            teamTaskRepository.countByStatus(TeamTask.Status.COMPLETED));
        data.put("tasksOverdue",
            teamTaskRepository.countByStatus(TeamTask.Status.OVERDUE));
        double avgWorkload = all.stream()
            .mapToInt(TeamMember::getWorkloadPercent).average().orElse(0);
        data.put("utilizationPercent", Math.round(avgWorkload));
        List<TeamTask> recentTasks = teamTaskRepository.findAll().stream()
            .filter(t -> t.getCreatedAt() != null)
            .sorted(Comparator.comparing(TeamTask::getCreatedAt).reversed())
            .limit(10).toList();
        data.put("recentActivity", recentTasks);
        return ResponseEntity.ok(data);
    }

    // ── Members — admin manages, team member can read their own profile ───
    @GetMapping("/members")
    public ResponseEntity<List<TeamMember>> getMembers(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(teamMemberRepository.findAll());
        }
        // Team member can only see themselves
        return ResponseEntity.ok(
            teamMemberRepository.findByEmail(user.getEmail())
                .map(List::of).orElse(List.of()));
    }

    @GetMapping("/members/{id}")
    public ResponseEntity<Map<String, Object>> getMemberProfile(
            @PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        TeamMember member = teamMemberRepository.findById(id).orElseThrow();

        // Team member can only view their own profile
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tm = teamMemberRepository.findByEmail(user.getEmail());
            if (tm.isEmpty() || !tm.get().getId().equals(id)) {
                return ResponseEntity.status(403).build();
            }
        }

        List<ClientAssignment> assignments =
            clientAssignmentRepository.findByTeamMemberId(id);
        List<TeamTask> tasks = teamTaskRepository.findByAssignedToId(id);

        Map<String, Object> profile = new HashMap<>();
        profile.put("member", member);
        profile.put("assignedClients", assignments);
        profile.put("activeTasks",
            tasks.stream().filter(t -> t.getStatus() == TeamTask.Status.IN_PROGRESS).toList());
        profile.put("pendingTasks",
            tasks.stream().filter(t ->
                t.getStatus() == TeamTask.Status.NOT_STARTED ||
                t.getStatus() == TeamTask.Status.REVIEW_PENDING).toList());
        profile.put("completedTasks",
            tasks.stream().filter(t -> t.getStatus() == TeamTask.Status.COMPLETED).toList());
        profile.put("overdueTasks",
            tasks.stream().filter(t -> t.getStatus() == TeamTask.Status.OVERDUE).toList());

        List<Map<String, Object>> clientProjects = new ArrayList<>();
        for (ClientAssignment ca : assignments) {
            List<Project> projects =
                projectRepository.findByClientId(ca.getClient().getId());
            Map<String, Object> cp = new HashMap<>();
            cp.put("client", ca.getClient());
            cp.put("projects", projects);
            clientProjects.add(cp);
        }
        profile.put("clientProjects", clientProjects);
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/members")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createMember(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (teamMemberRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already exists"));
        }

        String rawPassword = body.getOrDefault("password", "Team@123");
        String encodedPassword = passwordEncoder.encode(rawPassword);

        // Create User account so team member can log in
        User userAccount = null;
        if (!userRepository.existsByEmail(email)) {
            userAccount = User.builder()
                .email(email)
                .password(encodedPassword)
                .fullName(body.get("name"))
                .phoneNumber(body.get("phoneNumber"))
                .role(User.Role.TEAM_MEMBER)
                .active(true)
                .accountManager("Admin")
                .companyName("Vignova Team")
                .build();
            userAccount = userRepository.save(userAccount);
        } else {
            userAccount = userRepository.findByEmail(email).orElse(null);
        }

        TeamMember member = TeamMember.builder()
            .name(body.get("name"))
            .email(email)
            .password(encodedPassword)
            .role(body.get("role"))
            .phoneNumber(body.get("phoneNumber"))
            .status(TeamMember.Status.ACTIVE)
            .workloadPercent(0)
            .userAccount(userAccount)
            .build();

        return ResponseEntity.ok(teamMemberRepository.save(member));
    }

    @PutMapping("/members/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeamMember> updateMember(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        TeamMember member = teamMemberRepository.findById(id).orElseThrow();
        if (body.containsKey("name")) member.setName(body.get("name"));
        if (body.containsKey("role")) member.setRole(body.get("role"));
        if (body.containsKey("phoneNumber")) member.setPhoneNumber(body.get("phoneNumber"));
        if (body.containsKey("status"))
            member.setStatus(TeamMember.Status.valueOf(body.get("status")));
        if (body.containsKey("workloadPercent"))
            member.setWorkloadPercent(Integer.parseInt(body.get("workloadPercent")));
        return ResponseEntity.ok(teamMemberRepository.save(member));
    }

    @DeleteMapping("/members/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        TeamMember member = teamMemberRepository.findById(id).orElseThrow();
        clientAssignmentRepository.deleteAll(
            clientAssignmentRepository.findByTeamMemberId(id));
        teamTaskRepository.deleteAll(
            teamTaskRepository.findByAssignedToId(id));
        Long userAccountId = member.getUserAccount() != null
            ? member.getUserAccount().getId() : null;
        member.setUserAccount(null);
        teamMemberRepository.save(member);
        teamMemberRepository.deleteById(id);
        if (userAccountId != null) {
            userRepository.deleteById(userAccountId);
        }
        return ResponseEntity.noContent().build();
    }

    // ── Assignments ───────────────────────────────────────────────────────
    @GetMapping("/assignments")
    public ResponseEntity<List<ClientAssignment>> getAssignments(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(clientAssignmentRepository.findAll());
        }
        // Team member sees only their assignments
        Optional<TeamMember> tm = teamMemberRepository.findByEmail(user.getEmail());
        if (tm.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(
            clientAssignmentRepository.findByTeamMemberId(tm.get().getId()));
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClientAssignment> assignClient(
            @RequestBody Map<String, Long> body) {
        Long teamMemberId = body.get("teamMemberId");
        Long clientId = body.get("clientId");
        if (clientAssignmentRepository.existsByTeamMemberIdAndClientId(
                teamMemberId, clientId)) {
            return ResponseEntity.badRequest().build();
        }
        TeamMember member = teamMemberRepository.findById(teamMemberId).orElseThrow();
        User client = userRepository.findById(clientId).orElseThrow();
        ClientAssignment assignment = ClientAssignment.builder()
            .teamMember(member).client(client).build();
        return ResponseEntity.ok(clientAssignmentRepository.save(assignment));
    }

    @DeleteMapping("/assignments/{teamMemberId}/{clientId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeAssignment(
            @PathVariable Long teamMemberId,
            @PathVariable Long clientId) {
        clientAssignmentRepository
            .deleteByTeamMemberIdAndClientId(teamMemberId, clientId);
        return ResponseEntity.noContent().build();
    }

    // ── Tasks ─────────────────────────────────────────────────────────────
    @GetMapping("/tasks")
    public ResponseEntity<List<TeamTask>> getTasks(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(teamTaskRepository.findAll());
        }
        // Team member sees only their tasks
        Optional<TeamMember> tm = teamMemberRepository.findByEmail(user.getEmail());
        if (tm.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(
            teamTaskRepository.findByAssignedToId(tm.get().getId()));
    }

    @GetMapping("/tasks/member/{memberId}")
    public ResponseEntity<List<TeamTask>> getMemberTasks(@PathVariable Long memberId) {
        return ResponseEntity.ok(teamTaskRepository.findByAssignedToId(memberId));
    }

    @PostMapping("/tasks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeamTask> createTask(
            @RequestBody Map<String, Object> body) {
        TeamMember member = teamMemberRepository.findById(
            Long.parseLong(body.get("assignedToId").toString())).orElseThrow();
        TeamTask task = TeamTask.builder()
            .title(body.get("title").toString())
            .description(body.containsKey("description")
                ? body.get("description").toString() : "")
            .assignedTo(member)
            .status(TeamTask.Status.NOT_STARTED)
            .dueDate(body.containsKey("dueDate") && body.get("dueDate") != null
                && !body.get("dueDate").toString().isEmpty()
                ? LocalDateTime.parse(body.get("dueDate").toString()) : null)
            .build();
        if (body.containsKey("clientId") && body.get("clientId") != null
                && !body.get("clientId").toString().isEmpty()) {
            userRepository.findById(
                Long.parseLong(body.get("clientId").toString()))
                .ifPresent(task::setClient);
        }
        return ResponseEntity.ok(teamTaskRepository.save(task));
    }

    @PutMapping("/tasks/{id}")
    public ResponseEntity<TeamTask> updateTask(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        TeamTask task = teamTaskRepository.findById(id).orElseThrow();

        // Team member can only update their own tasks
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tm = teamMemberRepository.findByEmail(user.getEmail());
            if (tm.isEmpty() || task.getAssignedTo() == null ||
                !task.getAssignedTo().getId().equals(tm.get().getId())) {
                return ResponseEntity.status(403).build();
            }
        }

        if (body.containsKey("title")) task.setTitle(body.get("title").toString());
        if (body.containsKey("description"))
            task.setDescription(body.get("description").toString());
        if (body.containsKey("status")) {
            TeamTask.Status s = TeamTask.Status.valueOf(body.get("status").toString());
            task.setStatus(s);
            if (s == TeamTask.Status.COMPLETED)
                task.setCompletedAt(LocalDateTime.now());
        }
        if (body.containsKey("dueDate") && body.get("dueDate") != null
                && !body.get("dueDate").toString().isEmpty()) {
            task.setDueDate(LocalDateTime.parse(body.get("dueDate").toString()));
        }
        if (user.getRole() == User.Role.ADMIN
                && body.containsKey("assignedToId")
                && body.get("assignedToId") != null) {
            teamMemberRepository.findById(
                Long.parseLong(body.get("assignedToId").toString()))
                .ifPresent(task::setAssignedTo);
        }
        return ResponseEntity.ok(teamTaskRepository.save(task));
    }

    @DeleteMapping("/tasks/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        teamTaskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}