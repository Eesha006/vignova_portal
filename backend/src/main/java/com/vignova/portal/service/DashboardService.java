package com.vignova.portal.service;

import com.vignova.portal.entity.*;
import com.vignova.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final InvoiceRepository invoiceRepository;
    private final DeliverableRepository deliverableRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final UserRepository userRepository;

    public Map<String, Object> getClientDashboard(Long clientId) {
        Map<String, Object> data = new HashMap<>();

        // Stats
        data.put("activeProjects", projectRepository.countByClientIdAndStatus(clientId, Project.Status.IN_PROGRESS));
        data.put("totalProjects", projectRepository.countByClientId(clientId));
        data.put("totalDeliverables", deliverableRepository.countByClientId(clientId));

        // Projects
        data.put("projects", projectRepository.findByClientId(clientId));

        // Recent deliverables (last 5)
        List<Deliverable> deliverables = deliverableRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        data.put("recentDeliverables", deliverables.stream().limit(5).toList());

        // Pending approvals
        List<ApprovalRequest> approvals = approvalRequestRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        data.put("pendingApprovals", approvals.stream()
                .filter(a -> a.getStatus() == ApprovalRequest.Status.PENDING).toList());

        // Current invoice
        List<Invoice> pendingInvoices = invoiceRepository.findByClientIdAndStatus(clientId, Invoice.Status.PENDING);
        data.put("currentInvoice", pendingInvoices.isEmpty() ? null : pendingInvoices.get(0));

        // Account manager
        User client = userRepository.findById(clientId).orElse(null);
        if (client != null) {
            data.put("accountManager", client.getAccountManager());
            data.put("clientName", client.getFullName());
            data.put("companyName", client.getCompanyName());
        }

        return data;
    }
}
