package com.vignova.portal.repository;

import com.vignova.portal.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByClientIdOrderByCreatedAtDesc(Long clientId);
    List<Invoice> findByClientIdAndStatus(Long clientId, Invoice.Status status);
}
