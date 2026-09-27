# Prep Manager

**A local demo for collecting prep evidence and reviewing unit-level compliance decisions.**

Prep-center operators and self-prepping sellers need a reliable way to show what condition a unit was in when it left prep. Today, a work order can say what should have happened, but without linked observations and review history, a later shipment defect is difficult to investigate. Prep compliance matters before Amazon FBA shipment because a missed or unverified requirement can lead to downstream handling problems, fees, or disputes after the unit has left the operator's control. This prototype does not establish Amazon policy or prove that any particular fee was caused by a prep defect.

## Intended user

A prep-center operator or a seller preparing their own units for Amazon FBA.

## Current workflow

`Photo upload / Camera → Barcode → Unit → Analysis → PASS / FAIL / UNCERTAIN → Evidence → Human Review`

Collect the photos and barcode, identify the unit, and explicitly run one analysis for the unit. The UI then shows check results and linked evidence, and an operator can record an override with a reason.

## What is implemented

- JPG/JPEG, PNG, and WEBP photo upload; multiple images per unit.
- Camera capture on browsers that grant camera access.
- Barcode scanning through browser `BarcodeDetector` when available, plus manual barcode entry.
- A deterministic mock vision provider with named profiles for clean, issue, uncertain, and failure scenarios.
- PASS, FAIL, and UNCERTAIN compliance verdicts derived by deterministic rules from observations.
- Per-observation evidence records linked to a capture/check, shown in the UI.
- Human review and override records containing original verdict, new verdict, reason, operator ID, and timestamp.
- FastAPI analysis and override endpoints and a Next.js frontend.
- A PostgreSQL-compatible schema draft with organization-scoped forced row-level security policies.

## Vision status and evidence honesty

The current demo uses the **mock deterministic vision provider** by default. It selects canned observations from the unit's mock profile; it does not inspect uploaded image pixels. Uploaded images are **not claimed to have been analyzed by OpenAI Vision**. Mock evidence says that no image was analyzed and no bounding box is claimed. The repository contains an optional server-side OpenAI provider implementation behind configuration, but it is not the current demo mode, and this prototype has no verified live-vision evaluation.

## Run locally

Prerequisites: Python with `pip`, Node.js/npm, and two terminals. From the repository root:

```powershell
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The frontend calls `http://localhost:8000` by default. To point it elsewhere, set `NEXT_PUBLIC_API_URL` in the process environment. Do not place secrets in the repository. Backend test command documented by the project: `cd backend; py -m pytest`.

## Short demo flow

1. Start the backend and frontend using the commands above.
2. In the capture workspace, upload one or more product images or take a camera photo.
3. Scan a barcode if the browser supports it, or enter one manually.
4. Keep the default unit/profile or set a demo profile, then select **Analyze unit**.
5. Inspect the overall and per-check verdicts and the mock evidence labels.
6. Select **Review** on a check, choose an updated verdict, provide a reason and operator ID, then submit the override.

Use the mock profiles to demonstrate PASS, FAIL, UNCERTAIN, and pending-review behavior. These are scenarios, not image-derived or real-world evaluation results.

## Known limitations and next steps

- The current default provider returns deterministic profile observations, not image analysis. No OpenAI Vision performance is established.
- Amazon requirement sources are not yet verified or connected; rule source URLs are intentionally unset. Do not treat the demo rules or synthetic sample data as Amazon ground truth.
- Captures and overrides are stored in process memory and disappear when the service restarts. The SQL schema is a persistence starting point, not an active database integration.
- The schema defines forced organization RLS, but the API currently has no database-backed tenant authorization. Tenant isolation is therefore not a runtime guarantee.
- Evidence is not represented as immutable, tamper-evident, or externally anchored.
- Browser barcode detection depends on browser support and camera permissions.
- Evaluation is not completed or verified for this prototype. A held-out image set, two independent labels, agreement reporting, and per-check false-positive/false-negative/UNCERTAIN analysis are required before making quality claims.

Next steps: verify authoritative prep requirements and applicability; define and capture a held-out, independently double-labeled evaluation set; report per-check errors and uncertainty; integrate persistent storage and enforce/test tenant isolation; and validate the end-to-end human workflow with prep operators.

## Repository

[https://github.com/mdsuhana231-gif/cube-02-prep-manager](https://github.com/mdsuhana231-gif/cube-02-prep-manager)

## Submission Documents

- [Customer letter](01-customer-letter.md)
- [PR/FAQ](02-prfaq.md)
- [Project one-pager](03-one-pager.md)
- [Durable project constraints](CLAUDE.md)
- [Build brief](build-brief.md)
- [Build log](build-log.md)
- [Evaluation report](eval-report.md)
- [Evidence record shape](contract/evidence-record.md)
- [Agent/backend behavior](agent/README.md)
