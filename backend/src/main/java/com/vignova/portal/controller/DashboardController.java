package com.vignova.portal.controller;

import com.vignova.portal.entity.*;
import com.vignova.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final InvoiceRepository invoiceRepository;
    private final DeliverableRepository deliverableRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ClientAssignmentRepository clientAssignmentRepository;
    private final TeamTaskRepository teamTaskRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboard(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.ADMIN)
            return ResponseEntity.ok(buildAdminDashboard(user));
        if (user.getRole() == User.Role.TEAM_MEMBER)
            return ResponseEntity.ok(buildTeamMemberDashboard(user));
        return ResponseEntity.ok(buildClientDashboard(user));
    }

    private Map<String, Object> buildAdminDashboard(User user) {
        Map<String, Object> data = new HashMap<>();
        List<Project> allProjects = projectRepository.findAll();
        List<Project> activeProjects = allProjects.stream()
            .filter(p -> p.getStatus() == Project.Status.IN_PROGRESS)
            .collect(Collectors.toList());
        data.put("activeProjects", activeProjects.size());
        data.put("totalProjects", allProjects.size());

        List<Deliverable> allDeliverables = deliverableRepository.findAll().stream()
            .sorted(Comparator.comparing(
                d -> d.getCreatedAt() != null
                    ? d.getCreatedAt() : java.time.LocalDateTime.MIN,
                Comparator.reverseOrder()))
            .collect(Collectors.toList());
        data.put("totalDeliverables", allDeliverables.size());
        data.put("recentDeliverables",
            allDeliverables.stream().limit(5).collect(Collectors.toList()));

        List<ApprovalRequest> allApprovals = approvalRequestRepository.findAll().stream()
            .sorted(Comparator.comparing(
                a -> a.getCreatedAt() != null
                    ? a.getCreatedAt() : java.time.LocalDateTime.MIN,
                Comparator.reverseOrder()))
            .collect(Collectors.toList());
        data.put("recentApprovals",
            allApprovals.stream().limit(5).collect(Collectors.toList()));
        data.put("pendingApprovals", allApprovals.stream()
            .filter(a -> a.getStatus() == ApprovalRequest.Status.PENDING)
            .collect(Collectors.toList()));

        List<Invoice> pendingInvoices = invoiceRepository.findAll().stream()
            .filter(i -> i.getStatus() == Invoice.Status.PENDING)
            .collect(Collectors.toList());
        data.put("currentInvoice",
            pendingInvoices.isEmpty() ? null : pendingInvoices.get(0));

        data.put("accountManager", "Admin");
        data.put("clientName", user.getFullName());
        data.put("companyName", "Vignova Marketing");
        data.put("projects",
            activeProjects.stream().limit(6).collect(Collectors.toList()));

        List<TeamMember> teamMembers = teamMemberRepository.findAll();
        data.put("totalTeamMembers", teamMembers.size());
        data.put("activeTeamMembers", teamMembers.stream()
            .filter(m -> m.getStatus() == TeamMember.Status.ACTIVE).count());

        return data;
    }

    private Map<String, Object> buildTeamMemberDashboard(User user) {
        Map<String, Object> data = new HashMap<>();

        Optional<TeamMember> tmOpt = teamMemberRepository.findByEmail(user.getEmail());
        if (tmOpt.isEmpty()) {
            data.put("activeProjects", 0);
            data.put("totalProjects", 0);
            data.put("totalDeliverables", 0);
            data.put("recentDeliverables", List.of());
            data.put("recentApprovals", List.of());
            data.put("pendingApprovals", List.of());
            data.put("projects", List.of());
            data.put("pendingTasks", List.of());
            data.put("totalPendingTasks", 0);
            data.put("assignedClients", List.of());
            data.put("clientName", user.getFullName());
            data.put("accountManager", "Admin");
            return data;
        }

        TeamMember teamMember = tmOpt.get();
        List<ClientAssignment> assignments =
            clientAssignmentRepository.findByTeamMemberId(teamMember.getId());
        List<Long> assignedClientIds = assignments.stream()
            .map(a -> a.getClient().getId()).collect(Collectors.toList());

        List<Map<String, Object>> assignedClientsInfo = assignments.stream().map(a -> {
            Map<String, Object> cm = new HashMap<>();
            cm.put("id", a.getClient().getId());
            cm.put("fullName", a.getClient().getFullName());
            cm.put("companyName", a.getClient().getCompanyName());
            return cm;
        }).collect(Collectors.toList());

        data.put("assignedClients", assignedClientsInfo);
        data.put("clientName", user.getFullName());
        data.put("accountManager", "Admin");
        data.put("role", teamMember.getRole());

        if (assignedClientIds.isEmpty()) {
            data.put("activeProjects", 0);
            data.put("totalProjects", 0);
            data.put("totalDeliverables", 0);
            data.put("recentDeliverables", List.of());
            data.put("recentApprovals", List.of());
            data.put("pendingApprovals", List.of());
            data.put("projects", List.of());
            data.put("pendingTasks", List.of());
            data.put("totalPendingTasks", 0);
            data.put("completedTasks", 0L);
            data.put("overdueTasks", 0L);
            return data;
        }

        List<Project> allProjects = assignedClientIds.stream()
            .flatMap(cid -> projectRepository.findByClientId(cid).stream())
            .collect(Collectors.toList());
        List<Project> activeProjects = allProjects.stream()
            .filter(p -> p.getStatus() == Project.Status.IN_PROGRESS)
            .collect(Collectors.toList());
        data.put("activeProjects", activeProjects.size());
        data.put("totalProjects", allProjects.size());
        data.put("projects",
            activeProjects.stream().limit(6).collect(Collectors.toList()));

        List<Deliverable> deliverables = assignedClientIds.stream()
            .flatMap(cid ->
                deliverableRepository.findByClientIdOrderByCreatedAtDesc(cid).stream())
            .sorted(Comparator.comparing(
                d -> d.getCreatedAt() != null
                    ? d.getCreatedAt() : java.time.LocalDateTime.MIN,
                Comparator.reverseOrder()))
            .collect(Collectors.toList());
        data.put("totalDeliverables", deliverables.size());
        data.put("recentDeliverables",
            deliverables.stream().limit(5).collect(Collectors.toList()));

        List<ApprovalRequest> approvals = assignedClientIds.stream()
            .flatMap(cid ->
                approvalRequestRepository.findByClientIdOrderByCreatedAtDesc(cid).stream())
            .sorted(Comparator.comparing(
                a -> a.getCreatedAt() != null
                    ? a.getCreatedAt() : java.time.LocalDateTime.MIN,
                Comparator.reverseOrder()))
            .collect(Collectors.toList());
        data.put("recentApprovals",
            approvals.stream().limit(5).collect(Collectors.toList()));
        data.put("pendingApprovals", approvals.stream()
            .filter(a -> a.getStatus() == ApprovalRequest.Status.PENDING)
            .collect(Collectors.toList()));

        List<TeamTask> myTasks =
            teamTaskRepository.findByAssignedToId(teamMember.getId());
        List<TeamTask> pendingTasks = myTasks.stream()
            .filter(t ->
                t.getStatus() == TeamTask.Status.NOT_STARTED ||
                t.getStatus() == TeamTask.Status.IN_PROGRESS ||
                t.getStatus() == TeamTask.Status.REVIEW_PENDING)
            .collect(Collectors.toList());

        data.put("pendingTasks",
            pendingTasks.stream().limit(5).collect(Collectors.toList()));
        data.put("totalPendingTasks", pendingTasks.size());
        data.put("completedTasks", myTasks.stream()
            .filter(t -> t.getStatus() == TeamTask.Status.COMPLETED).count());
        data.put("overdueTasks", myTasks.stream()
            .filter(t -> t.getStatus() == TeamTask.Status.OVERDUE).count());

        if (!assignedClientIds.isEmpty()) {
            List<Invoice> pendingInvoices = invoiceRepository
                .findByClientIdAndStatus(assignedClientIds.get(0), Invoice.Status.PENDING);
            data.put("currentInvoice",
                pendingInvoices.isEmpty() ? null : pendingInvoices.get(0));
        }

        return data;
    }

    private Map<String, Object> buildClientDashboard(User user) {
        Map<String, Object> data = new HashMap<>();

        List<Project> projects = projectRepository.findByClientId(user.getId());
        long activeCount = projects.stream()
            .filter(p -> p.getStatus() == Project.Status.IN_PROGRESS).count();
        data.put("activeProjects", activeCount);
        data.put("totalProjects", projects.size());
        data.put("projects", projects);

        List<Deliverable> deliverables =
            deliverableRepository.findByClientIdOrderByCreatedAtDesc(user.getId());
        data.put("totalDeliverables", deliverables.size());
        data.put("recentDeliverables",
            deliverables.stream().limit(5).collect(Collectors.toList()));

        List<ApprovalRequest> approvals =
            approvalRequestRepository.findByClientIdOrderByCreatedAtDesc(user.getId());
        data.put("recentApprovals",
            approvals.stream().limit(5).collect(Collectors.toList()));
        data.put("pendingApprovals", approvals.stream()
            .filter(a -> a.getStatus() == ApprovalRequest.Status.PENDING)
            .collect(Collectors.toList()));

        List<Invoice> pendingInvoices = invoiceRepository
            .findByClientIdAndStatus(user.getId(), Invoice.Status.PENDING);
        data.put("currentInvoice",
            pendingInvoices.isEmpty() ? null : pendingInvoices.get(0));

        data.put("clientName", user.getFullName());
        data.put("companyName", user.getCompanyName());

        List<ClientAssignment> assignments =
            clientAssignmentRepository.findByClientId(user.getId());
        if (!assignments.isEmpty()) {
            String allManagers = assignments.stream()
                .map(a -> a.getTeamMember().getName())
                .collect(Collectors.joining(", "));
            data.put("accountManager", allManagers);
            data.put("accountManagerRole",
                assignments.get(0).getTeamMember().getRole());
        } else {
            String am = user.getAccountManager();
            if (am != null && !am.isBlank()
                && !am.equalsIgnoreCase("Assigned")
                && !am.equalsIgnoreCase("Admin")) {
                data.put("accountManager", am);
            } else {
                data.put("accountManager", null);
            }
        }

        return data;
    }
}