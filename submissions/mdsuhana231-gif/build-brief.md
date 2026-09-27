# Build Brief — Prep Manager

## Original Problem

Prep is the second stage in the commerce workflow, before inbound shipment to Amazon. When a prep issue is reported later, a prep operator may have only a work order describing the expected action and their recollection of the unit. Unit-specific, contemporaneous compliance evidence can make later review more informative. A record is not proof of Amazon policy or automatic proof of who caused a downstream defect.

## Intended User

A prep-center operator or a seller preparing their own units for Amazon FBA. The operator needs a fast way to gather unit evidence, see why a check received a verdict, and preserve human corrections.

## Scope

### In scope for this prototype

- Create a unit-level capture from photos and optional barcode input.
- Support image upload and camera capture.
- Support browser barcode scanning where available and manual barcode fallback.
- Run a single analysis operation for a unit and return observations for six prep-check categories.
- Convert observations into PASS, FAIL, or UNCERTAIN with deterministic rules.
- Link evidence records to checks and show the reasons in the UI.
- Record a human override without losing the original verdict.
- Provide a local FastAPI service and Next.js frontend with deterministic mock behavior.

### Out of scope or not yet established

- Verified, live Amazon policy retrieval or authoritative applicability configuration.
- Validated image-based vision performance or autonomous disposition.
- Production persistence, authentication, deployed tenant isolation, image object storage, or retention controls.
- Immutable/tamper-evident evidence.
- Any external pod/API contract beyond the fields supported by this repository.

## Current Workflow

`Photo upload / Camera → Barcode → Unit → Analysis → PASS / FAIL / UNCERTAIN → Evidence → Human Review`

The operator captures all useful views, obtains barcode data if available, supplies unit identifiers/profile, and explicitly starts one unit analysis. Results display overall and per-check status with evidence. A human can record an override with a reason.

## Requirements and Guardrails

- Use one model/provider operation per unit, carrying all applicable checks and photos.
- Model/provider observes; deterministic rules decide.
- Treat UNCERTAIN as a valid verdict distinct from PASS.
- Fail open on provider failure: retain the capture and mark it pending for review.
- Look up authoritative rules rather than inferring them from examples. Current rule source URLs are unset, so this remains unmet.
- Never invent evidence, image locations, bounding boxes, policy, or evaluation results.
- Preserve both original and overridden decisions with reason/operator/time.
- Do not treat synthetic sample data or mock profiles as Amazon ground truth.
- Keep credentials out of source control.
- For persisted multi-tenant data, enable and force RLS and verify cross-organization isolation, including image access. Current database schema is a draft and is not used by the API.

## Architecture

- **Frontend:** Next.js 15, React, TypeScript, and Tailwind. Handles photo uploads, camera capture, browser barcode detection/manual entry, unit fields, results/evidence display, and review override form.
- **API:** FastAPI endpoints for health, unit analysis, and override creation.
- **Service:** creates a capture, calls the configured provider once, creates evidence from observations, evaluates checks through deterministic rules, and keeps captures/overrides in process memory.
- **Provider:** `build_provider()` defaults to `MockVisionProvider`; a server-side OpenAI provider implementation can be selected by environment variables. Optional provider mode is not the current demo mode and has no verified evaluation.
- **Data model:** Pydantic models describe units, captures, observations, verdicts, evidence, and overrides.
- **Persistence draft:** PostgreSQL-compatible `schema.sql` defines tenant columns and forced RLS policies but is not integrated.

## MVP / Beta Boundary

The MVP demonstrated by this repository is a local interaction prototype with deterministic mock observations. It tests the workflow shape, not image recognition or Amazon compliance accuracy. A beta that influences shipment decisions requires, at minimum, verified authoritative requirements, real data handling and tenant security, operator workflow validation, persistent traceability, and a held-out double-labeled evaluation with per-check FP/FN and UNCERTAIN reporting. Those gates are not complete or verified here.
