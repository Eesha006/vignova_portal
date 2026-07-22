package com.vignova.portal.repository;

import com.vignova.portal.entity.ContentCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface ContentCalendarRepository extends JpaRepository<ContentCalendar, Long> {
    List<ContentCalendar> findByClientIdOrderByScheduledDateAsc(Long clientId);
    List<ContentCalendar> findByClientIdAndScheduledDateBetween(Long clientId, LocalDateTime start, LocalDateTime end);
}
