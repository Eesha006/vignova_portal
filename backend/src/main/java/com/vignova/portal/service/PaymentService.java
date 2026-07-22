package com.vignova.portal.service;

import com.vignova.portal.entity.Invoice;
import com.vignova.portal.entity.Payment;
import com.vignova.portal.entity.Payment.PaymentStatus;
import com.vignova.portal.repository.InvoiceRepository;
import com.vignova.portal.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Hex;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Value("${razorpay.webhook.secret}")
    private String webhookSecret;

    // ── Verify frontend signature (existing flow — DO NOT BREAK) ───────────
    public boolean verifyFrontendSignature(String orderId,
                                           String paymentId,
                                           String signature) {
        try {
            String data = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String generated = Hex.encodeHexString(
                mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
            return generated.equals(signature);
        } catch (Exception e) {
            log.error("Signature verification error: {}", e.getMessage());
            return false;
        }
    }

    // ── Verify Razorpay webhook signature ──────────────────────────────────
    public boolean verifyWebhookSignature(String payload, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String generated = Hex.encodeHexString(
                mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            return generated.equals(signature);
        } catch (Exception e) {
            log.error("Webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    // ── Save payment record after frontend verification (existing flow) ────
    @Transactional
    public Payment recordFrontendPayment(String razorpayOrderId,
                                          String razorpayPaymentId,
                                          String razorpaySignature,
                                          Long invoiceId) {
        // Prevent duplicate
        if (paymentRepository.existsByRazorpayPaymentId(razorpayPaymentId)) {
            log.warn("Duplicate payment record skipped: {}", razorpayPaymentId);
            return paymentRepository.findByRazorpayPaymentId(razorpayPaymentId).orElseThrow();
        }

        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();

        Payment payment = Payment.builder()
            .razorpayPaymentId(razorpayPaymentId)
            .razorpayOrderId(razorpayOrderId)
            .invoice(invoice)
            .amount(invoice.getAmount())
            .currency("INR")
            .paymentStatus(PaymentStatus.SUCCESS)
            .razorpaySignature(razorpaySignature)
            .webhookEvent("frontend.verified")
            .build();

        Payment saved = paymentRepository.save(payment);

        // Mark invoice as paid
        markInvoicePaid(invoice);

        log.info("Payment recorded via frontend: {} for invoice {}",
            razorpayPaymentId, invoiceId);
        return saved;
    }

    // ── Handle webhook: payment.captured ──────────────────────────────────
    @Transactional
    public void handlePaymentCaptured(Map<String, Object> paymentData) {
        String paymentId = getString(paymentData, "id");
        String orderId   = getString(paymentData, "order_id");
        String method    = getString(paymentData, "method");
        Object amtObj    = paymentData.get("amount");

        if (paymentId == null || paymentId.isBlank()) {
            log.warn("payment.captured received with no payment ID — skipping");
            return;
        }

        // Duplicate check
        if (paymentRepository.existsByRazorpayPaymentId(paymentId)) {
            log.info("Duplicate webhook ignored: {}", paymentId);
            return;
        }

        // Find invoice by order ID
        Optional<Invoice> invoiceOpt = findInvoiceByOrderId(orderId);
        if (invoiceOpt.isEmpty()) {
            log.warn("No invoice found for order: {}", orderId);
            return;
        }
        Invoice invoice = invoiceOpt.get();

        BigDecimal amount = BigDecimal.ZERO;
        if (amtObj != null) {
            // Razorpay sends amount in paise
            amount = new BigDecimal(amtObj.toString())
                .divide(new BigDecimal("100"));
        }

        Payment payment = Payment.builder()
            .razorpayPaymentId(paymentId)
            .razorpayOrderId(orderId != null ? orderId : "")
            .invoice(invoice)
            .amount(amount)
            .currency("INR")
            .paymentMethod(method)
            .paymentStatus(PaymentStatus.SUCCESS)
            .webhookEvent("payment.captured")
            .build();

        paymentRepository.save(payment);

        // Mark invoice paid only if not already paid
        if (invoice.getStatus() != Invoice.Status.PAID) {
            markInvoicePaid(invoice);
        }

        log.info("Webhook payment.captured processed: {} → invoice {}",
            paymentId, invoice.getId());
    }

    // ── Handle webhook: payment.failed ────────────────────────────────────
    @Transactional
    public void handlePaymentFailed(Map<String, Object> paymentData) {
        String paymentId = getString(paymentData, "id");
        String orderId   = getString(paymentData, "order_id");

        if (paymentId == null || paymentId.isBlank()) return;

        if (paymentRepository.existsByRazorpayPaymentId(paymentId)) {
            log.info("Duplicate failed webhook ignored: {}", paymentId);
            return;
        }

        Optional<Invoice> invoiceOpt = findInvoiceByOrderId(orderId);
        if (invoiceOpt.isEmpty()) {
            log.warn("No invoice found for failed order: {}", orderId);
            return;
        }

        Payment payment = Payment.builder()
            .razorpayPaymentId(paymentId)
            .razorpayOrderId(orderId != null ? orderId : "")
            .invoice(invoiceOpt.get())
            .amount(invoiceOpt.get().getAmount())
            .currency("INR")
            .paymentStatus(PaymentStatus.FAILED)
            .webhookEvent("payment.failed")
            .build();

        paymentRepository.save(payment);
        log.warn("Payment FAILED recorded: {} for order {}", paymentId, orderId);
        // Do NOT update invoice status for failed payments
    }

    // ── Handle webhook: payment.authorized ────────────────────────────────
    @Transactional
    public void handlePaymentAuthorized(Map<String, Object> paymentData) {
        String paymentId = getString(paymentData, "id");
        String orderId   = getString(paymentData, "order_id");

        if (paymentId == null || paymentId.isBlank()) return;

        if (paymentRepository.existsByRazorpayPaymentId(paymentId)) {
            // Update existing record to AUTHORIZED if it was in another state
            paymentRepository.findByRazorpayPaymentId(paymentId).ifPresent(p -> {
                p.setPaymentStatus(PaymentStatus.AUTHORIZED);
                p.setWebhookEvent("payment.authorized");
                paymentRepository.save(p);
            });
            return;
        }

        Optional<Invoice> invoiceOpt = findInvoiceByOrderId(orderId);
        if (invoiceOpt.isEmpty()) return;

        Payment payment = Payment.builder()
            .razorpayPaymentId(paymentId)
            .razorpayOrderId(orderId != null ? orderId : "")
            .invoice(invoiceOpt.get())
            .amount(invoiceOpt.get().getAmount())
            .currency("INR")
            .paymentStatus(PaymentStatus.AUTHORIZED)
            .webhookEvent("payment.authorized")
            .build();

        paymentRepository.save(payment);
        log.info("Payment AUTHORIZED: {}", paymentId);
    }

    // ── Handle webhook: refund.processed ──────────────────────────────────
    @Transactional
    public void handleRefundProcessed(Map<String, Object> refundData) {
        String paymentId = getString(refundData, "payment_id");

        if (paymentId == null || paymentId.isBlank()) return;

        paymentRepository.findByRazorpayPaymentId(paymentId).ifPresentOrElse(p -> {
            p.setPaymentStatus(PaymentStatus.REFUNDED);
            p.setWebhookEvent("refund.processed");
            paymentRepository.save(p);
            log.info("Payment REFUNDED: {}", paymentId);
            // Optional: update invoice status to REFUNDED if needed
            // p.getInvoice().setStatus(Invoice.Status.REFUNDED);
        }, () -> log.warn("Refund for unknown payment: {}", paymentId));
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private void markInvoicePaid(Invoice invoice) {
        invoice.setStatus(Invoice.Status.PAID);
        invoice.setPaidDate(LocalDateTime.now());
        invoiceRepository.save(invoice);
        log.info("Invoice {} marked as PAID", invoice.getId());
    }

    private Optional<Invoice> findInvoiceByOrderId(String orderId) {
        if (orderId == null || orderId.isBlank()) return Optional.empty();
        // Look up via payment table first (if order was created and stored)
        Optional<Payment> existing = paymentRepository.findByRazorpayOrderId(orderId);
        if (existing.isPresent()) return Optional.of(existing.get().getInvoice());
        // Fallback — not found
        return Optional.empty();
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    public List<Payment> getPaymentsByInvoice(Long invoiceId) {
        return paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId);
    }
}