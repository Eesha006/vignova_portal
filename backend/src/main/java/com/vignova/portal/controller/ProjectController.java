package com.vignova.portal.controller;

import com.vignova.portal.entity.Project;
import com.vignova.portal.entity.TeamMember;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.ClientAssignmentRepository;
import com.vignova.portal.repository.ProjectRepository;
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
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ClientAssignmentRepository clientAssignmentRepository;

    @GetMapping
    public ResponseEntity<List<Project>> getProjects(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Admin sees ALL projects
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(projectRepository.findAll());
        }

        // Team member sees only assigned clients' projects
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.ok(List.of());

            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream()
                .map(a -> a.getClient().getId())
                .collect(Collectors.toList());

            if (assignedClientIds.isEmpty()) return ResponseEntity.ok(List.of());

            List<Project> projects = assignedClientIds.stream()
                .flatMap(cid -> projectRepository.findByClientId(cid).stream())
                .collect(Collectors.toList());

            return ResponseEntity.ok(projects);
        }

        // Client sees own projects
        return ResponseEntity.ok(projectRepository.findByClientId(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        Project project = projectRepository.findById(id).orElseThrow();

        // Team member — verify it belongs to an assigned client
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.status(403).build();
            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream().map(a -> a.getClient().getId()).collect(Collectors.toList());
            Long projectClientId = project.getClient() != null ? project.getClient().getId() : null;
            if (projectClientId == null || !assignedClientIds.contains(projectClientId)) {
                return ResponseEntity.status(403).build();
            }
        }

        return ResponseEntity.ok(project);
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody Project project, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        // Admin can create for any client
        if (user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(projectRepository.save(project));
        }

        // Team member can only create for assigned clients
        if (user.getRole() == User.Role.TEAM_MEMBER) {
            Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
            if (tmOpt.isEmpty()) return ResponseEntity.status(403).body("Not authorized");

            List<Long> assignedClientIds = clientAssignmentRepository
                .findByTeamMemberId(tmOpt.get().getId())
                .stream().map(a -> a.getClient().getId()).collect(Collectors.toList());

            Long projectClientId = project.getClient() != null ? project.getClient().getId() : null;
            if (projectClientId == null || !assignedClientIds.contains(projectClientId)) {
                return ResponseEntity.status(403).body("You can only create projects for your assigned clients");
            }

            return ResponseEntity.ok(projectRepository.save(project));
        }

        return ResponseEntity.status(403).body("Not authorized");
    }

    @PutMapping("/{id}/progress")
    public ResponseEntity<?> updateProgress(@PathVariable Long id,
                                            @RequestBody java.util.Map<String, Integer> body,
                                            Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        Project project = projectRepository.findById(id).orElseThrow();

        if (user.getRole() == User.Role.TEAM_MEMBER) {
            if (!isAssignedToProject(user, project)) {
                return ResponseEntity.status(403).body("Not authorized");
            }
        } else if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        project.setProgressPercent(body.get("progress"));
        return ResponseEntity.ok(projectRepository.save(project));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProject(@PathVariable Long id,
                                           @RequestBody Project updated,
                                           Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        Project project = projectRepository.findById(id).orElseThrow();

        if (user.getRole() == User.Role.TEAM_MEMBER) {
            if (!isAssignedToProject(user, project)) {
                return ResponseEntity.status(403).body("Not authorized");
            }
        } else if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        project.setName(updated.getName());
        project.setDescription(updated.getDescription());
        project.setStatus(updated.getStatus());
        project.setProgressPercent(updated.getProgressPercent());
        project.setEndDate(updated.getEndDate());
        return ResponseEntity.ok(projectRepository.save(project));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        Project project = projectRepository.findById(id).orElseThrow();

        if (user.getRole() == User.Role.TEAM_MEMBER) {
            if (!isAssignedToProject(user, project)) {
                return ResponseEntity.status(403).body("Not authorized");
            }
        } else if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Helper — check if team member is assigned to this project's client
    private boolean isAssignedToProject(User user, Project project) {
        Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
        if (tmOpt.isEmpty()) return false;
        List<Long> assignedClientIds = clientAssignmentRepository
            .findByTeamMemberId(tmOpt.get().getId())
            .stream().map(a -> a.getClient().getId()).collect(Collectors.toList());
        Long projectClientId = project.getClient() != null ? project.getClient().getId() : null;
        return projectClientId != null && assignedClientIds.contains(projectClientId);
    }
}