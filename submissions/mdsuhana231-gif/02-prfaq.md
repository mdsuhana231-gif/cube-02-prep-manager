# Prep Manager: PR/FAQ

## Press Release

**Prep Manager helps operators keep a reviewable record for each prepared unit.** The local prototype brings photos, barcode details, unit information, compliance observations, and human review into one workflow. It is designed for prep-center operators and self-prepping sellers who need to understand what was checked before an Amazon FBA shipment leaves their control.

The prototype currently uses deterministic mock observations. It is not a live AI vision product and does not establish that an image meets an Amazon requirement.

## Frequently Asked Questions

### Who is the customer, and what problem are we solving?

The intended customer is a prep-center operator or self-prepping seller. When a prep defect is reported later, operators may have only a work order and memory rather than unit-specific evidence of the condition at shipment time.

### What is the proposed solution?

A unit-level capture and review workflow that associates images and barcode input with analysis observations, rule-derived verdicts, supporting evidence records, and traceable human overrides.

### What is the workflow?

`Photo upload / Camera → Barcode → Unit → Analysis → PASS / FAIL / UNCERTAIN → Evidence → Human Review`

The operator gathers all available views and barcode details, identifies the unit, runs a single unit-level analysis, reviews check outcomes and evidence, and may record a reasoned override.

### What is working today?

The frontend supports multiple photo uploads, camera capture, browser barcode scanning where supported, and manual barcode fallback. The FastAPI backend accepts a unit-level analysis request, calls a deterministic mock provider by default, derives check verdicts through rules, and returns linked evidence. An override endpoint records the original/new verdicts, reason, operator, and timestamp. The Next.js UI displays the returned checks and evidence.

### Is this live AI vision?

No. The current demo uses the mock deterministic vision provider. Uploaded images are **not claimed to have been analyzed by OpenAI Vision**. An optional server-side OpenAI provider code path exists, but it is not the current demo mode and has no verified performance evaluation. No live AI claim is made here.

### Why does prep compliance matter before Amazon FBA shipment?

A prep issue may be discovered after the unit has left the operator's control, making it harder to inspect, correct, or investigate. A contemporaneous record can support review of what was observed; it does not by itself prove Amazon's rules or establish the cause of a later fee.

### What are the limitations?

The default provider selects canned observations from a mock profile and does not inspect image pixels. Authoritative rule sources are not connected. Data is stored in memory, the SQL schema is not active, and tenant isolation is not enforced by the running API. Evidence is not immutable or tamper-evident. No held-out evaluation or real-world vision performance is verified.

### What remains unanswered?

- Which published requirements and unit-specific applicability sources should be authoritative, and how should their versions be recorded?
- Can image-based observation be reliable across product types, packaging, lighting, and long-tail catalogues?
- What evidence format and identifiers are needed by downstream systems, if any?
- What review interface fits actual prep-floor timing and connectivity constraints?
- What per-check error and uncertainty levels would be acceptable before any automation is considered?
- What persistence, retention, access-control, and image privacy policies should apply?
