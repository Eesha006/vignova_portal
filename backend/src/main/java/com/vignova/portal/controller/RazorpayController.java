package com.vignova.portal.controller;

import com.vignova.portal.entity.Invoice;
import com.vignova.portal.entity.Payment;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.InvoiceRepository;
import com.vignova.portal.repository.PaymentRepository;
import com.vignova.portal.repository.UserRepository;
import com.vignova.portal.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class RazorpayController {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    // ── Get publishable key for frontend ──────────────────────────────────
    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        return ResponseEntity.ok(Map.of("keyId", keyId));
    }

    // ── Create Razorpay order ─────────────────────────────────────────────
    @PostMapping("/create-order/{invoiceId}")
    public ResponseEntity<?> createOrder(@PathVariable Long invoiceId,
                                         Authentication auth) throws Exception {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();

        if (!invoice.getClient().getId().equals(user.getId())
                && user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }

        if (invoice.getStatus() == Invoice.Status.PAID) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invoice already paid"));
        }

        long amountInPaise = invoice.getAmount()
            .multiply(new BigDecimal(100)).longValue();

        String credentials = Base64.getEncoder()
            .encodeToString((keyId + ":" + keySecret).getBytes());

        String requestBody = String.format(
            "{\"amount\":%d,\"currency\":\"INR\",\"receipt\":\"invoice_%d\"," +
            "\"notes\":{\"invoiceId\":\"%d\",\"invoiceNumber\":\"%s\"}}",
            amountInPaise, invoiceId, invoiceId, invoice.getInvoiceNumber()
        );

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.razorpay.com/v1/orders"))
            .header("Content-Type", "application/json")
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            String body = response.body();
            String orderId = extractJsonField(body, "id");
            log.info("Razorpay order created: {} for invoice {}", orderId, invoiceId);
            return ResponseEntity.ok(Map.of(
                "orderId", orderId,
                "amount", amountInPaise,
                "currency", "INR",
                "keyId", keyId,
                "invoiceId", invoiceId,
                "invoiceNumber", invoice.getInvoiceNumber(),
                "clientName", user.getFullName(),
                "clientEmail", user.getEmail()
            ));
        }

        log.error("Razorpay order creation failed: {}", response.body());
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Failed to create payment order: " + response.body()));
    }

    // ── Verify payment from frontend after checkout ───────────────────────
    // This is your EXISTING working flow — kept exactly as before
    @PostMapping("/verify/{invoiceId}")
    public ResponseEntity<?> verifyPayment(@PathVariable Long invoiceId,
                                            @RequestBody Map<String, String> body,
                                            Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();

        if (!invoice.getClient().getId().equals(user.getId())
                && user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }

        String razorpayOrderId   = body.get("razorpay_order_id");
        String razorpayPaymentId = body.get("razorpay_payment_id");
        String razorpaySignature = body.get("razorpay_signature");

        // Verify signature using existing PaymentService logic
        boolean valid = paymentService.verifyFrontendSignature(
            razorpayOrderId, razorpayPaymentId, razorpaySignature);

        if (!valid) {
            log.warn("Invalid payment signature for invoice {}", invoiceId);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid payment signature. Payment not verified."));
        }

        // Record payment + mark invoice paid (idempotent — safe to call even if webhook arrives first)
        Payment payment = paymentService.recordFrontendPayment(
            razorpayOrderId, razorpayPaymentId, razorpaySignature, invoiceId);

        log.info("Payment verified via frontend: {} for invoice {}",
            razorpayPaymentId, invoiceId);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Payment successful! Invoice marked as paid.",
            "paymentId", razorpayPaymentId,
            "invoiceNumber", invoice.getInvoiceNumber(),
            "dbPaymentId", payment.getId()
        ));
    }

    // ── Get payment history for an invoice ───────────────────────────────
    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<List<Payment>> getPaymentsByInvoice(
            @PathVariable Long invoiceId) {
        return ResponseEntity.ok(paymentService.getPaymentsByInvoice(invoiceId));
    }

    // ── Razorpay Webhook — production grade ───────────────────────────────
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        // 1. Verify webhook signature first — never trust unverified payload
        if (signature == null || signature.isBlank()) {
            log.warn("Webhook received without signature — rejected");
            return ResponseEntity.badRequest().body("Missing signature");
        }

        if (!paymentService.verifyWebhookSignature(payload, signature)) {
            log.error("Invalid webhook signature — possible spoofing attempt");
            return ResponseEntity.badRequest().body("Invalid signature");
        }

        // 2. Parse event type
        String event = extractJsonField(payload, "event");
        log.info("Razorpay webhook received: {}", event);

        try {
            switch (event != null ? event : "") {

                case "payment.captured" -> {
                    Map<String, Object> paymentData = extractPaymentEntity(payload);
                    paymentService.handlePaymentCaptured(paymentData);
                }

                case "payment.failed" -> {
                    Map<String, Object> paymentData = extractPaymentEntity(payload);
                    paymentService.handlePaymentFailed(paymentData);
                }

                case "payment.authorized" -> {
                    Map<String, Object> paymentData = extractPaymentEntity(payload);
                    paymentService.handlePaymentAuthorized(paymentData);
                }

                case "refund.processed" -> {
                    Map<String, Object> refundData = extractRefundEntity(payload);
                    paymentService.handleRefundProcessed(refundData);
                }

                default -> log.info("Unhandled webhook event: {}", event);
            }
        } catch (Exception e) {
            log.error("Error processing webhook event {}: {}", event, e.getMessage(), e);
            // Still return 200 — Razorpay retries on non-200
            // We log the error but don't want infinite retries
        }

        // Always return 200 to Razorpay so it doesn't retry
        return ResponseEntity.ok("received");
    }

    // ── JSON field extraction helpers ─────────────────────────────────────
    private String extractJsonField(String json, String key) {
        String search = "\"" + key + "\":\"";
        int start = json.indexOf(search);
        if (start == -1) return null;
        start += search.length();
        int end = json.indexOf("\"", start);
        if (end == -1) return null;
        return json.substring(start, end);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractPaymentEntity(String payload) {
        // Simple extraction of payload.payment.entity fields
        // Works with Razorpay's standard webhook payload structure
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("id",       extractJsonField(payload, "id"));
        result.put("order_id", extractJsonField(payload, "order_id"));
        result.put("method",   extractJsonField(payload, "method"));
        result.put("amount",   extractJsonField(payload, "amount"));
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractRefundEntity(String payload) {
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("id",         extractJsonField(payload, "id"));
        result.put("payment_id", extractJsonField(payload, "payment_id"));
        result.put("amount",     extractJsonField(payload, "amount"));
        return result;
    }
}