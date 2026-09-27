# Agent / Backend Behavior

## Current Runtime Path

1. FastAPI exposes `GET /health`, `POST /api/v1/units/analyze`, and `POST /api/v1/units/{unit_id}/overrides`.
2. The analysis request contains a `Unit`, optional photo references, `PhotoInput` values, and optional barcode scan.
3. `AnalysisService.process_unit` creates a capture and stores it in an in-memory dictionary, then calls the configured provider once for the unit.
4. `build_provider()` selects `MockVisionProvider` by default (`VISION_PROVIDER` defaults to `mock`). The mock returns fixed observations based on `mock_profile`; it does not inspect uploaded images. The mock profiles include clean, issues, uncertain, model-failure, and individual issue cases.
5. On a successful provider return, the service creates evidence records for returned observations, links their IDs, applies the deterministic rules, and responds with observations, checks, evidence, overall status, analysis status, and model-call count.
6. On provider exception, the service leaves the capture stored in memory with status `pending`, creates uncertain observations/checks, returns overall `PENDING_REVIEW`, and makes no evidence records for that failed operation.
7. The override endpoint stores the original verdict, new verdict, reason, operator ID, organization ID, and timestamp in a second in-memory dictionary. It does not update or delete the original check.

## Decisions

The provider is expected to report observations. `rules.py` maps configured observation values to PASS or FAIL; values that do not match the maps become UNCERTAIN. Overall status is FAIL if any check fails, otherwise UNCERTAIN if any check is uncertain, otherwise PASS. A non-applicable check is currently marked PASS with an explanation that it is not required.

The six check keys are polybag presence/sealing, suffocation warning, FNSKU placement, original barcode coverage, expiry-date visibility, and required handling marks. `RULE_SOURCES` currently leaves source URLs and version dates unset; these verdicts must not be represented as authoritative Amazon determinations.

## Optional Provider Path

`OpenAIVisionProvider` is implemented as an optional server-side provider selected with `VISION_PROVIDER=openai` and `OPENAI_API_KEY`; the model is configured through `OPENAI_VISION_MODEL`. It sends all available photo data URLs in one request and parses structured observations. The current demo uses the mock provider unless explicitly configured otherwise. The existence of this optional code path is not evidence of a live demo using OpenAI Vision, image-analysis accuracy, or production readiness.

## Frontend Behavior

The Next.js page supports photo upload, camera capture, barcode camera scanning when browser support exists, manual barcode entry, unit/profile fields, an explicit analyze action, check/evidence display, and a review form. Upload or scan does not automatically start analysis. The frontend sends `NEXT_PUBLIC_API_URL` or defaults to `http://localhost:8000`.

## Runtime Boundaries

- Captures and overrides are in-memory only and are lost on process restart.
- `backend/schema.sql` is a persistence draft and is not used by this API.
- The API does not presently enforce authentication or database-backed organization isolation. Do not treat request `org_id` as authorization.
- No image object storage or durable evidence guarantees are implemented.
- The frontend can display a mock-derived PASS even when photos were supplied; this is a deterministic demo path, not proof that those images were analyzed.
