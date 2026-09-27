from app.models import CheckKey, Observation, Verdict
from app.rules import RULE_SOURCES, evaluate_all, evaluate_observation, overall_verdict


def test_uncertain_is_first_class_verdict() -> None:
    result = evaluate_observation(
        Observation(check_key=CheckKey.EXPIRY_DATE, value="uncertain")
    )
    assert result.verdict is Verdict.UNCERTAIN
    assert "insufficient" in result.explanation


def test_failure_wins_over_uncertain_for_overall_status() -> None:
    checks = evaluate_all(
        [
            Observation(check_key=CheckKey.POLYBAG, value="uncertain"),
            Observation(check_key=CheckKey.ORIGINAL_BARCODE, value="no"),
        ]
    )
    assert overall_verdict(checks) is Verdict.FAIL


def test_clean_observation_passes() -> None:
    result = evaluate_observation(
        Observation(check_key=CheckKey.HANDLING_MARKS, value="all_present")
    )
    assert result.verdict is Verdict.PASS


def test_applicability_marks_non_required_check_without_uncertainty() -> None:
    result = evaluate_observation(
        Observation(check_key=CheckKey.EXPIRY_DATE, value="uncertain"),
        applicable=False,
    )
    assert result.applicable is False
    assert result.verdict is Verdict.PASS
    assert "not required" in result.explanation


def test_each_check_has_explicit_rule_source_shape_without_fabricating_authority() -> None:
    assert set(RULE_SOURCES) == set(CheckKey)
    assert all(source.source_url is None for source in RULE_SOURCES.values())
    assert all(source.visual_check_possible for source in RULE_SOURCES.values())
