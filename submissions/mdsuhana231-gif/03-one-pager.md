# Prep Manager — Project One-Pager

## Problem

When a prep defect is reported after an Amazon FBA shipment leaves a prep operation, the operator may have no unit-specific record of the unit's condition at prep time. A work order describes intended work; it is not evidence that the work was completed.

## User

Prep-center operator or self-prepping seller preparing units for Amazon FBA.

## Solution

A unit-level workflow for collecting photos and barcode information, returning check observations and verdicts, linking evidence records, and allowing a human to review and record an override. It is an evidence workflow prototype, not a source of authoritative Amazon policy.

## Workflow

`Photo upload / Camera → Barcode → Unit → Analysis → PASS / FAIL / UNCERTAIN → Evidence → Human Review`

## Key Features

- Multiple JPG/JPEG, PNG, or WEBP uploads and camera capture.
- Browser barcode scanning when `BarcodeDetector` is available, with manual entry fallback.
- One provider operation per unit, with observations for six configured prep checks.
- Deterministic rule mapping from observations to PASS, FAIL, or UNCERTAIN.
- Evidence records linked to captures and check keys.
- Human override with original verdict, new verdict, reason, operator ID, and timestamp.
- FastAPI backend and Next.js/Tailwind frontend.

## Architecture Summary

The Next.js client posts a unit, photos, and optional barcode scan to the FastAPI analysis endpoint. `AnalysisService` creates a capture, invokes the configured `VisionProvider` once, builds evidence objects from observations, and asks deterministic rules to derive check and overall verdicts. A mock provider is selected by default. The API also accepts review overrides. Its current capture and override stores are in-memory dictionaries. `backend/schema.sql` sketches PostgreSQL tables and forced organization-scoped RLS but is not connected to the service.

## Current Status

The local prototype includes the capture, mock analysis, evidence display, and override workflow. The default mock's answers are selected from a demo profile; uploaded images are not analyzed by that provider. The optional OpenAI provider code path is not the current demo mode. No vision quality evaluation is completed or verified.

## Known Limitations

- No verified authoritative prep-rule source or current requirement lookup; rule source URLs are unset.
- Mock results do not depend on image pixels. Optional provider output has not been validated against a held-out set.
- In-memory persistence; data does not survive service restarts.
- RLS is present only in an unintegrated schema draft; runtime tenant authorization is not established.
- No immutable/tamper-evident evidence guarantee.
- No operator research or production validation is documented.

## Evaluation Status

Not completed/verified in this prototype. Required next evaluation: an unseen held-out set, independently assigned labels from two labelers, label agreement, and per-check false positives, false negatives, UNCERTAIN counts, and failure modes. Do not infer performance from deterministic mock profiles or synthetic CSV values.

## Kill Condition

**Kill or pivot away from automated PASS/FAIL disposition if a representative held-out, independently labeled evaluation cannot support reliable per-check judgments under real prep conditions.** In that case, preserve only the capture/evidence/human-review workflow until a defensible signal exists. The original project brief explicitly says this vision assumption is untested; no numeric acceptance threshold has yet been defined.
