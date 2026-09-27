from abc import ABC, abstractmethod

import json
import os
from typing import Any

import httpx

from .models import Capture, CheckKey, Observation, PhotoInput, Unit


class VisionProvider(ABC):
    @abstractmethod
    def analyze_unit(self, unit: Unit, capture: Capture, photos: list[PhotoInput]) -> list[Observation]:
        """Run exactly one model/provider operation for the complete unit."""


class MockVisionProvider(VisionProvider):
    """Deterministic fixture provider; it never represents Amazon ground truth."""

    def __init__(self) -> None:
        self.calls = 0

    def analyze_unit(self, unit: Unit, capture: Capture, photos: list[PhotoInput]) -> list[Observation]:
        self.calls += 1
        if unit.mock_profile == "model_failure":
            raise RuntimeError("mock vision provider failure")

        profiles = {
            "clean": {
                CheckKey.POLYBAG: "yes",
                CheckKey.SUFFOCATION_WARNING: "legible",
                CheckKey.FNSKU_PLACEMENT: "flat",
                CheckKey.ORIGINAL_BARCODE: "yes",
                CheckKey.EXPIRY_DATE: "legible",
                CheckKey.HANDLING_MARKS: "all_present",
            },
            "issues": {
                CheckKey.POLYBAG: "not_sealed",
                CheckKey.SUFFOCATION_WARNING: "obscured_by_fold",
                CheckKey.FNSKU_PLACEMENT: "on_edge",
                CheckKey.ORIGINAL_BARCODE: "no",
                CheckKey.EXPIRY_DATE: "illegible_after_wrap",
                CheckKey.HANDLING_MARKS: "some_missing",
            },
            "uncertain": {
                CheckKey.POLYBAG: "uncertain",
                CheckKey.SUFFOCATION_WARNING: "uncertain",
                CheckKey.FNSKU_PLACEMENT: "uncertain",
                CheckKey.ORIGINAL_BARCODE: "uncertain",
                CheckKey.EXPIRY_DATE: "uncertain",
                CheckKey.HANDLING_MARKS: "uncertain",
            },
        }
        profiles.update({
            "missing_polybag": {**profiles["clean"], CheckKey.POLYBAG: "missing"},
            "polybag_not_sealed": {**profiles["clean"], CheckKey.POLYBAG: "not_sealed"},
            "missing_warning": {**profiles["clean"], CheckKey.SUFFOCATION_WARNING: "missing"},
            "bad_fnsku": {**profiles["clean"], CheckKey.FNSKU_PLACEMENT: "on_edge"},
            "barcode_visible": {**profiles["clean"], CheckKey.ORIGINAL_BARCODE: "no"},
            "expiry_unclear": {**profiles["clean"], CheckKey.EXPIRY_DATE: "uncertain"},
            "handling_mark_missing": {**profiles["clean"], CheckKey.HANDLING_MARKS: "some_missing"},
        })
        return [
            Observation(
                check_key=check_key,
                value=value,
                confidence=None if value == "uncertain" else 0.98,
                visible_text=None,
            )
            for check_key, value in profiles[unit.mock_profile].items()
        ]


class OpenAIVisionProvider(VisionProvider):
    """One server-side multimodal request for all photos belonging to one unit."""

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model
        self.calls = 0

    def analyze_unit(self, unit: Unit, capture: Capture, photos: list[PhotoInput]) -> list[Observation]:
        self.calls += 1
        content: list[dict[str, Any]] = [{"type": "text", "text": self._prompt(unit)}]
        for photo in photos:
            if photo.data_url:
                content.append({"type": "image_url", "image_url": {"url": photo.data_url, "detail": "high"}})
        if len(content) == 1:
            raise RuntimeError("OpenAI provider requires at least one image payload")

        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": content}],
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        raw = json.loads(payload["choices"][0]["message"]["content"])
        return self._parse_observations(raw)

    @staticmethod
    def _prompt(unit: Unit) -> str:
        return f"""Analyze all images for unit {unit.unit_id} in this single request. Return JSON only with an observations array. Extract observations, not final verdicts, for these keys: {', '.join(key.value for key in CheckKey)}. Each item must include check_key, value, confidence, visible_text, and evidence_locations. Only include a bounding box when the image clearly supports a reliable location; otherwise use an empty array. Do not infer Amazon requirements from memory."""

    @staticmethod
    def _parse_observations(payload: dict[str, Any]) -> list[Observation]:
        return [Observation.model_validate(item) for item in payload.get("observations", [])]


def build_provider() -> VisionProvider:
    provider_name = os.getenv("VISION_PROVIDER", "mock").lower()
    if provider_name == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("VISION_PROVIDER=openai requires OPENAI_API_KEY")
        return OpenAIVisionProvider(api_key, os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini"))
    return MockVisionProvider()
