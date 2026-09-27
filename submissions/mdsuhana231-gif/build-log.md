# Build Log

## Scope and chronology note

This log records implementation stages that can be verified from the current repository files. The files do not provide a reliable dated commit-by-commit chronology, so no dates, durations, or undocumented sequence claims are added. This is a description of the present scaffold, not a claim that each test command below has been run successfully.

## Verified implementation stages

1. **Repository and project setup.** The repository includes the Prep Manager brief, repository/engineering rules, sample-data notes, local-development instructions, and separate backend and frontend directories. The participant repository is identified in the submission README.
2. **Backend and frontend scaffold.** The backend contains a FastAPI application, Pydantic models, service/rules/provider modules, and tests. The frontend is a Next.js/React/TypeScript app with a local capture and analysis UI. `LOCAL_DEVELOPMENT.md` documents the two-process local setup.
3. **Deterministic mock provider and rules.** `MockVisionProvider` supplies fixed observations for named profiles and counts one provider call per unit. `rules.py` maps observation values to PASS, FAIL, or UNCERTAIN and calculates an overall verdict. The mock provider explicitly does not represent Amazon ground truth.
4. **Capture and evidence records.** The service creates a capture and, for returned observations, creates evidence records linked to a capture and check. Mock evidence is labelled `mock_observation`; its explanation says no image was analyzed and no bounding box is claimed. Provider exceptions leave the in-memory capture marked pending and return `PENDING_REVIEW` without evidence.
5. **Camera and photo input.** The UI supports multiple JPG/JPEG, PNG, and WEBP file uploads plus browser camera capture. Camera availability and permission are browser-dependent. `LOCAL_DEVELOPMENT.md` documents these supported paths.
6. **Barcode input.** The UI supports browser `BarcodeDetector` use where present and manual barcode fallback. Barcode capture is stored with the unit capture; analysis is a separate explicit action.
7. **Human review and overrides.** The UI lets an operator review checks and submit a replacement verdict and reason. The backend override model stores the original verdict, new verdict, reason, operator ID, and timestamp in an in-memory store.
8. **Local development and persistence draft.** Project docs describe starting FastAPI on port 8000 and Next.js on port 3000. `backend/schema.sql` drafts PostgreSQL tables with forced organization RLS; no database integration is present in the current service.

## Tests and builds documented in the repository

- Backend tests are present in `backend/tests/test_api.py`, `test_rules.py`, and `test_vision.py`. They cover a single provider call and mock evidence, uncertain outcomes, pending behavior on provider failure, multiple photo/barcode capture, override preservation, rule mapping/applicability, and OpenAI-provider parsing/selection with a mocked HTTP call.
- Project documentation gives the backend test command as `py -m pytest` from `backend` (the backend README also shows `pytest`). This log does not assert a test run or pass result.
- `frontend/package.json` defines `npm run build`. This log does not assert a build result.
- No held-out vision evaluation, labeled dataset, accuracy, FP/FN, or human agreement result is documented in this repository.
