from collections.abc import Iterable
from dataclasses import dataclass

from .models import CheckKey, ComplianceCheck, Observation, Verdict

CHECK_LABELS = {
    CheckKey.POLYBAG: "Polybag presence and sealing",
    CheckKey.SUFFOCATION_WARNING: "Suffocation warning",
    CheckKey.FNSKU_PLACEMENT: "FNSKU label placement",
    CheckKey.ORIGINAL_BARCODE: "Original manufacturer barcode covered",
    CheckKey.EXPIRY_DATE: "Expiry date visibility",
    CheckKey.HANDLING_MARKS: "Required handling marks",
}

PASS_VALUES = {
    CheckKey.POLYBAG: {"yes", "not_required"},
    CheckKey.SUFFOCATION_WARNING: {"legible", "not_required"},
    CheckKey.FNSKU_PLACEMENT: {"flat"},
    CheckKey.ORIGINAL_BARCODE: {"yes"},
    CheckKey.EXPIRY_DATE: {"legible", "not_required"},
    CheckKey.HANDLING_MARKS: {"all_present", "not_required"},
}

FAIL_VALUES = {
    CheckKey.POLYBAG: {"not_sealed", "missing"},
    CheckKey.SUFFOCATION_WARNING: {"obscured_by_fold", "missing"},
    CheckKey.FNSKU_PLACEMENT: {"on_seam", "on_curve", "on_edge", "missing"},
    CheckKey.ORIGINAL_BARCODE: {"no"},
    CheckKey.EXPIRY_DATE: {"illegible_after_wrap"},
    CheckKey.HANDLING_MARKS: {"some_missing"},
}


@dataclass(frozen=True)
class RuleSource:
    rule_id: str
    requirement: str
    applicability: str
    source: str
    source_url: str | None
    source_version_date: str | None
    visual_check_possible: bool
    notes: str


# Source URLs remain unset until an authoritative requirement is verified.
RULE_SOURCES = {
    check_key: RuleSource(
        rule_id=f"prep-{check_key.value}",
        requirement=label,
        applicability="Configured per unit/work order when authoritative rules are connected.",
        source="authoritative source pending verification",
        source_url=None,
        source_version_date=None,
        visual_check_possible=True,
        notes="Synthetic mock profiles are not Amazon ground truth.",
    )
    for check_key, label in CHECK_LABELS.items()
}


def evaluate_observation(observation: Observation, applicable: bool = True) -> ComplianceCheck:
    check_key = observation.check_key
    if not applicable:
        verdict = Verdict.PASS
        explanation = "This check is not required for the unit's declared preparation profile."
    elif observation.value in PASS_VALUES[check_key]:
        verdict = Verdict.PASS
        explanation = f"Observed '{observation.value}', which satisfies this check."
    elif observation.value in FAIL_VALUES[check_key]:
        verdict = Verdict.FAIL
        explanation = f"Observed '{observation.value}', which does not satisfy this check."
    else:
        verdict = Verdict.UNCERTAIN
        explanation = "The observation is insufficient for a reliable judgment."

    return ComplianceCheck(
        check_key=check_key,
        label=CHECK_LABELS[check_key],
        verdict=verdict,
        explanation=explanation,
        applicable=applicable,
        evidence_refs=observation.evidence_refs,
    )


def evaluate_all(
    observations: Iterable[Observation],
    applicable_checks: set[CheckKey] | None = None,
) -> list[ComplianceCheck]:
    return [
        evaluate_observation(
            observation,
            applicable_checks is None or observation.check_key in applicable_checks,
        )
        for observation in observations
    ]


def overall_verdict(checks: Iterable[ComplianceCheck]) -> Verdict:
    verdicts = {check.verdict for check in checks}
    if Verdict.FAIL in verdicts:
        return Verdict.FAIL
    if Verdict.UNCERTAIN in verdicts:
        return Verdict.UNCERTAIN
    return Verdict.PASS
