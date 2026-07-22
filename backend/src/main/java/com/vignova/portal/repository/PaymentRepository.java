package com.vignova.portal.repository;

import com.vignova.portal.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    boolean existsByRazorpayPaymentId(String razorpayPaymentId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    List<Payment> findByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);
}