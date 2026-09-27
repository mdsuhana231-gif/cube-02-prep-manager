from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


class Verdict(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    UNCERTAIN = "UNCERTAIN"


class AnalysisStatus(str, Enum):
    COMPLETE = "complete"
    PENDING = "pending"


class CheckKey(str, Enum):
    POLYBAG = "polybag_presence_sealing"
    SUFFOCATION_WARNING = "suffocation_warning"
    FNSKU_PLACEMENT = "fnsku_placement"
    ORIGINAL_BARCODE = "original_barcode_covered"
    EXPIRY_DATE = "expiry_date_visibility"
    HANDLING_MARKS = "handling_marks"


class PhotoSource(str, Enum):
    UPLOAD = "upload"
    CAMERA = "camera"


class BarcodeSource(str, Enum):
    CAMERA = "camera"
    MANUAL = "manual"
    VISION_OCR = "vision_ocr"


class BoundingBox(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class Unit(BaseModel):
    unit_id: str = Field(min_length=1)
    org_id: str = Field(min_length=1)
    sku: str | None = None
    asin: str | None = None
    fnsku: str | None = None
    barcode: str | None = None
    work_order_id: str | None = None
    operator_id: str = "operator_demo"
    applicable_checks: list[CheckKey] | None = None
    mock_profile: Literal[
        "clean", "issues", "uncertain", "model_failure", "missing_polybag",
        "polybag_not_sealed", "missing_warning", "bad_fnsku", "barcode_visible",
        "expiry_unclear", "handling_mark_missing",
    ] = "clean"


class PhotoInput(BaseModel):
    photo_id: str = Field(default_factory=lambda: f"IMG-{uuid4().hex[:12]}")
    filename: str
    mime_type: str
    data_url: str | None = None
    source: PhotoSource = PhotoSource.UPLOAD


class BarcodeScan(BaseModel):
    barcode_value: str = Field(min_length=1)
    barcode_type: str = "unknown"
    scan_source: BarcodeSource
    scan_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Capture(BaseModel):
    capture_id: str = Field(default_factory=lambda: f"CAP-{uuid4().hex[:12]}")
    unit_id: str
    org_id: str
    photo_refs: list[str] = Field(default_factory=list)
    photos: list[PhotoInput] = Field(default_factory=list)
    barcode_scan: BarcodeScan | None = None
    captured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: AnalysisStatus = AnalysisStatus.COMPLETE


class Evidence(BaseModel):
    evidence_id: str = Field(default_factory=lambda: f"EVD-{uuid4().hex[:12]}")
    capture_id: str
    check_id: CheckKey
    source_type: Literal["mock_observation", "provider_observation", "image"]
    observation: str
    source_ref: str | None = None
    reference_location: str | None = None
    bounding_box: BoundingBox | None = None
    explanation: str


class Observation(BaseModel):
    check_key: CheckKey
    value: str
    confidence: float | None = Field(default=None, ge=0, le=1)
    visible_text: str | None = None
    evidence_locations: list[BoundingBox] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)


class ComplianceCheck(BaseModel):
    check_key: CheckKey
    label: str
    verdict: Verdict
    explanation: str
    applicable: bool = True
    evidence_refs: list[str] = Field(default_factory=list)


class ReviewOverride(BaseModel):
    review_id: str = Field(default_factory=lambda: f"REV-{uuid4().hex[:12]}")
    org_id: str
    unit_id: str
    original_verdict: Verdict
    new_verdict: Verdict
    reason: str = Field(min_length=1)
    operator_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnalyzeUnitRequest(BaseModel):
    unit: Unit
    photo_refs: list[str] = Field(default_factory=list)
    photos: list[PhotoInput] = Field(default_factory=list)
    barcode_scan: BarcodeScan | None = None


class OverrideRequest(BaseModel):
    original_verdict: Verdict
    new_verdict: Verdict
    reason: str = Field(min_length=1)
    operator_id: str = Field(min_length=1)


class AnalysisResponse(BaseModel):
    unit_id: str
    capture: Capture
    observations: list[Observation]
    checks: list[ComplianceCheck]
    evidence: list[Evidence]
    overall_status: Verdict | Literal["PENDING_REVIEW"]
    analysis_status: AnalysisStatus
    model_calls: int
