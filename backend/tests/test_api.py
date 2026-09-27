from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def payload(profile: str) -> dict:
    return {
        "unit": {
            "unit_id": "UNIT-DEMO-1",
            "org_id": "org_demo_alpha",
            "sku": "SKU-DEMO",
            "mock_profile": profile,
        },
        "photo_refs": ["fixtures/demo/front.jpg"],
    }


def test_analysis_runs_one_provider_call_and_returns_evidence() -> None:
    response = client.post("/api/v1/units/analyze", json=payload("clean"))
    body = response.json()
    assert response.status_code == 200
    assert body["model_calls"] == 1
    assert body["overall_status"] == "PASS"
    assert len(body["checks"]) == 6
    assert len(body["evidence"]) == 6
    assert all(item["source_type"] == "mock_observation" for item in body["evidence"])
    assert all(item["bounding_box"] is None for item in body["evidence"])
    assert all(check["evidence_refs"] for check in body["checks"])

    evidence_by_id = {item["evidence_id"]: item for item in body["evidence"]}
    for check in body["checks"]:
        linked = [evidence_by_id[evidence_id] for evidence_id in check["evidence_refs"]]
        assert all(item["check_id"] == check["check_key"] for item in linked)


def test_uncertain_decision_has_mock_evidence_and_stays_uncertain() -> None:
    response = client.post("/api/v1/units/analyze", json=payload("uncertain"))
    body = response.json()
    assert response.status_code == 200
    assert body["overall_status"] == "UNCERTAIN"
    assert all(check["verdict"] == "UNCERTAIN" for check in body["checks"])
    assert len(body["evidence"]) == 6
    assert all(item["observation"] == "uncertain" for item in body["evidence"])


def test_model_failure_saves_pending_capture() -> None:
    response = client.post("/api/v1/units/analyze", json=payload("model_failure"))
    body = response.json()
    assert response.status_code == 200
    assert body["analysis_status"] == "pending"
    assert body["overall_status"] == "PENDING_REVIEW"
    assert body["capture"]["status"] == "pending"
    assert all(check["verdict"] == "UNCERTAIN" for check in body["checks"])
    assert not body["evidence"]


def test_multiple_photos_and_barcode_are_kept_on_one_capture() -> None:
    request = payload("clean")
    request["photos"] = [
        {"filename": "front.jpg", "mime_type": "image/jpeg", "data_url": "data:image/jpeg;base64,ZmFrZQ==", "source": "upload"},
        {"filename": "back.jpg", "mime_type": "image/jpeg", "data_url": "data:image/jpeg;base64,ZmFrZTI=", "source": "camera"},
    ]
    request["barcode_scan"] = {"barcode_value": "X00DEMO", "barcode_type": "code_128", "scan_source": "manual"}
    response = client.post("/api/v1/units/analyze", json=request)
    body = response.json()
    assert response.status_code == 200
    assert len(body["capture"]["photos"]) == 2
    assert body["capture"]["barcode_scan"]["barcode_value"] == "X00DEMO"
    assert body["model_calls"] == 1


def test_override_preserves_original_decision() -> None:
    response = client.post(
        "/api/v1/units/UNIT-DEMO-1/overrides?org_id=org_demo_alpha",
        json={
            "original_verdict": "FAIL",
            "new_verdict": "PASS",
            "reason": "Operator verified the label on a second angle.",
            "operator_id": "op_demo",
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["original_verdict"] == "FAIL"
    assert body["new_verdict"] == "PASS"
    assert body["reason"]
