nts table · SQL
-- ═══════════════════════════════════════════════════════
-- Vignova Portal — Payments Table
-- Run this in your MySQL database: vignova_portal
-- ═══════════════════════════════════════════════════════
 
CREATE TABLE IF NOT EXISTS payments (
    id                   BIGINT          AUTO_INCREMENT PRIMARY KEY,
    razorpay_payment_id  VARCHAR(100)    NOT NULL UNIQUE COMMENT 'Razorpay payment ID e.g. pay_xxxxx',
    razorpay_order_id    VARCHAR(100)    NOT NULL        COMMENT 'Razorpay order ID e.g. order_xxxxx',
    invoice_id           BIGINT          NOT NULL        COMMENT 'FK to invoices table',
    amount               DECIMAL(10,2)   NOT NULL        COMMENT 'Amount in INR (not paise)',
    currency             VARCHAR(10)     DEFAULT 'INR',
    payment_method       VARCHAR(30)                     COMMENT 'upi / card / netbanking / wallet etc.',
    payment_status       ENUM(
                             'SUCCESS',
                             'FAILED',
                             'AUTHORIZED',
                             'REFUNDED'
                         ) NOT NULL,
    razorpay_signature   VARCHAR(255)                    COMMENT 'HMAC signature from frontend verification',
    webhook_event        VARCHAR(100)                    COMMENT 'payment.captured / payment.failed / refund.processed etc.',
    created_at           DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 
    -- Indexes for fast lookups
    INDEX idx_razorpay_payment_id (razorpay_payment_id),
    INDEX idx_razorpay_order_id   (razorpay_order_id),
    INDEX idx_invoice_id          (invoice_id),
    INDEX idx_payment_status      (payment_status),
 
    -- Foreign key to invoices
    CONSTRAINT fk_payment_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 

DESCRIBE payments;
 