# Evaluation Report

## Status

**Evaluation is not completed or verified in this prototype.** No held-out image dataset, independent human labels, label-agreement result, model-performance metric, false-positive/false-negative count, or per-check result is provided by the current project files. Deterministic mock profiles are workflow fixtures, not evaluation observations.

## Planned Methodology from `RULES.md` and Project Data Notes

1. Build a separate, unseen/held-out set of 50 units; do not train or tune on this set. Capture representative prep conditions and retain the unit/check applicability context needed to judge each image.
2. Have two human labelers independently label each applicable check using verified authoritative requirements, including PASS, FAIL, or UNCERTAIN. Resolve disagreements only after calculating and reporting initial agreement.
3. Report the labeler agreement method and result, then compare system output against the adjudicated reference while preserving the independent-label disagreement information.
4. Report results separately for every check: false positives and false negatives, with denominators and definitions; count/report UNCERTAIN outcomes separately rather than folding them into PASS or omitting them.
5. Document the image conditions, rule source/version, applicability, model/provider and configuration, exclusions, failures, and named failure modes. Keep the held-out set separate from any tuning examples.

The repository's data notes call for 50 unseen units labeled independently by two humans. The reference CSV is synthetic and explicitly not ground truth. It must not be used to claim Amazon policy correctness or model performance.

## Completed Evaluation

None documented or verified. Existing automated tests exercise deterministic behavior and provider parsing; they are not a vision evaluation and do not estimate real-world performance.

## Current Known Failure Modes and Limitations

- The default mock provider ignores image content and returns observations from a selected profile. Any apparent correctness in its outputs reflects the selected fixture profile, not visual recognition.
- The optional server-side OpenAI provider is not the default demo mode and has no verified held-out performance. Its output can be absent, ambiguous, malformed, or unsupported by sufficient pixels; such cases require reliable uncertainty handling.
- Current rule source URLs are intentionally unset. Without verified authoritative requirements and applicability, a rule-derived verdict is not a validated Amazon compliance determination.
- Camera access and barcode detection are browser/device dependent. Barcode scanning may be unavailable; manual entry is the fallback.
- Provider errors produce a pending capture and uncertain checks, with no generated evidence records in the current failure path.
- The current service uses in-memory data and does not enforce database-backed organization isolation.

## Next Evaluation Gate

Do not make accuracy or automation claims until the held-out set, two independent labels, agreement reporting, and per-check FP/FN/UNCERTAIN analysis are completed and documented. Define acceptance criteria before examining evaluation results; no numeric threshold is invented in this report.
