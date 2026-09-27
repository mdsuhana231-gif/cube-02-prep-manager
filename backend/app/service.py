from .models import (
    AnalysisResponse,
    AnalysisStatus,
    Capture,
    CheckKey,
    Evidence,
    Observation,
    OverrideRequest,
    PhotoInput,
    ReviewOverride,
    Unit,
    Verdict,
)
from .rules import evaluate_all, overall_verdict
from .vision import VisionProvider


class AnalysisService:
    def __init__(self, vision_provider: VisionProvider) -> None:
        self.vision_provider = vision_provider
        self.captures: dict[str, Capture] = {}
        self.overrides: dict[str, ReviewOverride] = {}

    def process_unit(
        self,
        unit: Unit,
        photo_refs: list[str],
        photos: list[PhotoInput] | None = None,
        barcode_scan=None,
    ) -> AnalysisResponse:
        photos = photos or []
        capture = Capture(
            unit_id=unit.unit_id,
            org_id=unit.org_id,
            photo_refs=photo_refs,
            photos=photos,
            barcode_scan=barcode_scan,
        )
        self.captures[capture.capture_id] = capture
        evidence: list[Evidence] = []

        try:
            observations = self.vision_provider.analyze_unit(unit, capture, photos)
        except Exception:
            capture.status = AnalysisStatus.PENDING
            observations = [
                Observation(
                    check_key=check_key,
                    value="model_unavailable",
                    confidence=None,
                )
                for check_key in CheckKey
            ]
            checks = evaluate_all(observations)
            for check in checks:
                check.explanation = "Model unavailable. Capture saved for human review; no compliance claim was made."
            return AnalysisResponse(
                unit_id=unit.unit_id,
                capture=capture,
                observations=observations,
                checks=checks,
                evidence=evidence,
                overall_status="PENDING_REVIEW",
                analysis_status=AnalysisStatus.PENDING,
                model_calls=1,
            )

        for observation in observations:
            source_type = "mock_observation" if self.vision_provider.__class__.__name__ == "MockVisionProvider" else "provider_observation"
            source_ref = photos[0].photo_id if observation.evidence_locations and photos else None
            reference_location = "mock_profile:" + unit.mock_profile if source_type == "mock_observation" else None
            item = Evidence(
                capture_id=capture.capture_id,
                check_id=observation.check_key,
                source_type=source_type,
                observation=observation.value,
                source_ref=source_ref,
                reference_location=reference_location,
                bounding_box=observation.evidence_locations[0] if observation.evidence_locations else None,
                explanation=(
                    "Deterministic mock observation; no image was analyzed and no bounding box is claimed."
                    if source_type == "mock_observation"
                    else "Provider observation; location is included only when supplied by the provider."
                ),
            )
            evidence.append(item)
            observation.evidence_refs.append(item.evidence_id)

        applicable_checks = set(unit.applicable_checks) if unit.applicable_checks is not None else None
        checks = evaluate_all(observations, applicable_checks)
        return AnalysisResponse(
            unit_id=unit.unit_id,
            capture=capture,
            observations=observations,
            checks=checks,
            evidence=evidence,
            overall_status=overall_verdict(checks),
            analysis_status=AnalysisStatus.COMPLETE,
            model_calls=1,
        )

    def create_override(
        self,
        org_id: str,
        unit_id: str,
        request: OverrideRequest,
    ) -> ReviewOverride:
        override = ReviewOverride(
            org_id=org_id,
            unit_id=unit_id,
            original_verdict=request.original_verdict,
            new_verdict=request.new_verdict,
            reason=request.reason,
            operator_id=request.operator_id,
        )
        self.overrides[override.review_id] = override
        return override
