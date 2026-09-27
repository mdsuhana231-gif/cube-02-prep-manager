# Durable Project Constraints

These constraints apply to future work on Prep Manager. When implementation and documentation disagree, verify the code and document the discrepancy; do not turn a target requirement into a claim about current behavior.

## Decision Semantics

- `PASS`: the evidence supports the condition.
- `FAIL`: the evidence shows the condition is not met.
- `UNCERTAIN`: the evidence is insufficient for a reliable judgment. It is a first-class outcome, not a low-confidence PASS.
- `PENDING_REVIEW` is the overall status when the provider fails in the current service path; the capture is marked pending and the checks are uncertain. Do not relabel this as PASS or FAIL.
- The current rules return PASS for a check explicitly marked not applicable. Applicability must come from declared/configured unit or work-order requirements; do not infer it from sample data.

## Observe, Then Decide

- A vision/provider component may return observations; deterministic rules decide PASS/FAIL/UNCERTAIN.
- Make one provider operation for all checks and photos for a unit, not one call per check.
- The current demo defaults to `MockVisionProvider`. Its profile observations are deterministic and do not analyze uploaded image pixels.
- Never claim that uploaded images were analyzed by OpenAI Vision in the current demo. An optional server-side provider implementation is not equivalent to validated or production-ready live vision.
- Do not let a model invent policy. Retrieve and record authoritative requirements and versions when connected. The current rule source URLs are unset.

## Evidence Integrity

- Never fabricate observations, evidence references, source locations, or bounding boxes. Include a bounding box only when a provider actually supplies a reliable image location.
- Mock evidence must remain clearly identified as mock and explicitly state that no image was analyzed and no bounding box is claimed.
- Do not call evidence immutable, tamper-evident, anchored, or authoritative unless those properties are implemented and demonstrated.
- A human override is additional data: retain the original verdict and record the new verdict, reason, operator, and time. Never silently replace or discard the original decision.

## Fail-Open Behavior

A provider error must not block the operator. Save the capture, mark it pending, return a pending-review outcome, and make no compliance claim. The current service implements this in process memory; persistence across restarts is not yet implemented.

## Tenancy and RLS

- Every tenant-owned persisted table must carry `org_id` and use row-level security that is both enabled and forced.
- Set the tenant context per transaction and test that a second organization sees no rows and cannot fetch another organization's image by guessing a key.
- The SQL schema contains a forced-RLS draft using `app.current_org_id`; the current API does not connect to that database or enforce runtime tenant authorization. Never claim deployed isolation until integration and tests establish it.
- Treat organization IDs from requests as untrusted until authenticated and authorized.

## Honesty and Security

- No API keys, tokens, passwords, credentials, or secret-bearing `.env` files in the repository. Keep optional provider secrets server-side and in the process environment.
- The sample CSV and mock profiles are synthetic. They are not Amazon requirements, real fees, or ground truth.
- Do not invent Amazon policy, customer interviews/quotes, customer data, evaluation sets, labels, metrics, or model-performance claims.
- Report evaluation only from a documented held-out set and methodology, with two-labeler agreement and per-check false positives, false negatives, UNCERTAIN cases, and failure modes.
- Be precise about what exists today, what is optional, and what remains planned or unverified.
