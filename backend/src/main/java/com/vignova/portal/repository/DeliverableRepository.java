package com.vignova.portal.repository;

import com.vignova.portal.entity.Deliverable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeliverableRepository extends JpaRepository<Deliverable, Long> {
    List<Deliverable> findByClientIdOrderByCreatedAtDesc(Long clientId);
    long countByClientId(Long clientId);
}
