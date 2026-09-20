# Refunds Policy

## Overview

When a return is approved by a BuyEasy administrator, we issue a full refund of your order total to your original payment method. This page explains how the refund process works, how long it takes, and what you can expect at each stage.

## How Refunds Are Processed

BuyEasy refunds are handled in two stages:

1. **Request stage** — You ask our AI support agent to initiate a refund. The agent checks return eligibility using our policy engine and, if you qualify, submits a **refund request** for admin review. No money moves at this stage and no charge is reversed yet.

2. **Approval stage** — A BuyEasy administrator reviews your request. If approved, the refund is executed immediately through our payment processor (Stripe). The full order amount is returned to the card or payment method you used at checkout.

Your refund amount is always the full order total recorded in our system at the time of purchase. Partial refunds are not available through the AI agent.

## Refund to Original Payment Method

Refunds are always returned to the original payment method:

- **Credit / Debit Card** — The refund appears as a credit on your card statement. Processing time varies by bank: typically 5–10 business days after admin approval.
- **PayPal** — Refunds to PayPal accounts typically appear within 3–5 business days.
- **Cash on Delivery** — For COD orders, we will contact you to arrange a bank transfer or store credit. COD refunds are not processed automatically and may take up to 10 business days.

## Refund Status Stages

| Stage | What it means |
|---|---|
| Pending | Your request has been submitted and is waiting for admin review |
| Approved | Admin has approved; Stripe refund has been issued |
| Rejected | Admin has rejected the request (you will receive a reason) |

## Checking Your Refund Status

Ask the BuyEasy AI support agent: *"What is the status of my refund for order [order ID]?"*  
The agent can retrieve the current status of your order and pending approval requests.

## What Happens If a Refund Is Rejected

If an admin rejects your refund request, you will receive a notification with the reason. Common reasons include:

- The return window has expired (more than 30 days since delivery)
- The item category is non-returnable (Food)
- The item shows signs of use or damage not consistent with the reported issue

You may contact our support team directly to appeal a rejected refund.

## Duplicate Refund Protection

Our system prevents duplicate refunds. If you accidentally submit the same refund request twice, or an admin clicks "Approve" more than once, only a single refund will ever be issued for a given order. This is enforced at the database level before any payment processor call is made.
