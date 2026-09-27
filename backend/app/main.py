from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import AnalysisResponse, AnalyzeUnitRequest, OverrideRequest, ReviewOverride
from .service import AnalysisService
from .vision import build_provider

provider = build_provider()
service = AnalysisService(provider)
app = FastAPI(title="Prep Manager API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/units/analyze", response_model=AnalysisResponse)
def analyze_unit(request: AnalyzeUnitRequest) -> AnalysisResponse:
    return service.process_unit(
        request.unit,
        request.photo_refs,
        request.photos,
        request.barcode_scan,
    )


@app.post("/api/v1/units/{unit_id}/overrides", response_model=ReviewOverride)
def create_override(unit_id: str, request: OverrideRequest, org_id: str) -> ReviewOverride:
    return service.create_override(org_id, unit_id, request)
