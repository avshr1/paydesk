# Design Decisions

A record of the key technical decisions in Paydesk and why they were made.

## 1. Money is stored as integers

All amounts are stored in cents, tax rates in basis points (825 = 8.25%), and quantities in hundredths (150 = 1.5 hours).
**Why:** JavaScript floats are imprecise (`0.1 + 0.2 = 0.30000000000000004`), which is unacceptable on a financial document.

## 2. The server recalculates every total

The browser shows a live preview, but the server ignores client-sent totals and recalculates from the line items.
**Why:** Anything sent from the browser can be tampered with.

## 3. Stripe webhooks are idempotent

Each processed Stripe event ID is saved in a `StripeEvent` table in the same transaction that marks the invoice paid.
**Why:** Stripe delivers webhooks "at least once," so duplicates must be safely ignored.

## 4. Public invoice links use random tokens

Clients view invoices at `/i/{publicToken}`, a cryptographically random string, instead of the database ID.
**Why:** Links must be impossible to guess, since anyone with the link can view and pay.

## 5. Sent invoices are locked

Only draft invoices can be edited. Clients with invoices are archived, not deleted.
**Why:** Financial records must stay consistent with what the client was emailed.

## 6. JWT sessions

Auth.js uses JWT sessions instead of database sessions.
**Why:** The email/password (Credentials) provider doesn't support database sessions.

## 7. Single Stripe account (for now)

All payments go to one Stripe test account.
**Future:** A production version would use Stripe Connect so each freelancer receives payments directly.
