package com.vignova.portal.repository;

import com.vignova.portal.entity.PerformanceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PerformanceReportRepository extends JpaRepository<PerformanceReport, Long> {
    List<PerformanceReport> findByClientIdOrderByCreatedAtDesc(Long clientId);
    Optional<PerformanceReport> findByClientIdAndMonthYear(Long clientId, String monthYear);
}