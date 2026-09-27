import json

import httpx

from app.models import Capture, CheckKey, PhotoInput, Unit
from app.vision import MockVisionProvider, OpenAIVisionProvider, build_provider


def test_mock_provider_returns_six_observations_in_one_call() -> None:
    provider = MockVisionProvider()
    observations = provider.analyze_unit(Unit(unit_id="U1", org_id="O1"), Capture(unit_id="U1", org_id="O1"), [])
    assert provider.calls == 1
    assert len(observations) == 6
    assert {observation.check_key for observation in observations} == set(CheckKey)


def test_openai_provider_selection_is_server_side(monkeypatch) -> None:
    monkeypatch.setenv("VISION_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_VISION_MODEL", "test-model")
    provider = build_provider()
    assert isinstance(provider, OpenAIVisionProvider)
    assert provider.api_key == "test-key"


def test_openai_provider_parses_one_structured_response(monkeypatch) -> None:
    captured: dict = {}

    def fake_post(url, headers, json, timeout):
        captured.update(json)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": json_module.dumps({"observations": [{"check_key": "fnsku_placement", "value": "flat", "confidence": 0.9, "visible_text": "X00DEMO", "evidence_locations": [{"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.1}]}]})}}]},
            request=httpx.Request("POST", url),
        )

    json_module = json
    monkeypatch.setattr(httpx, "post", fake_post)
    provider = OpenAIVisionProvider("test-key", "test-model")
    observations = provider.analyze_unit(
        Unit(unit_id="U1", org_id="O1"),
        Capture(unit_id="U1", org_id="O1"),
        [PhotoInput(filename="front.jpg", mime_type="image/jpeg", data_url="data:image/jpeg;base64,ZmFrZQ==")],
    )
    assert provider.calls == 1
    assert len(observations) == 1
    assert observations[0].evidence_locations[0].width == 0.2
    assert sum(1 for item in captured["messages"][0]["content"] if item["type"] == "image_url") == 1