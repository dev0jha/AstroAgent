from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import chart as chart_module
import transits as transits_module

app = FastAPI(title="Aradhana Ephemeris Sidecar", version="1.0")

# ── Request/Response models ──────────────────────────────────────────────────

class ChartRequest(BaseModel):
    date: str          # "YYYY-MM-DD"
    time: Optional[str] = None   # "HH:MM" 24h; None = use noon
    latitude: float
    longitude: float
    timezone: str      # IANA, e.g. "Asia/Kolkata"

class TransitRequest(BaseModel):
    date: str          # "YYYY-MM-DD" — the date to compute transits for
    natal_chart: dict  # Full natal chart dict as returned by /compute-chart

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/compute-chart")
def compute_chart(req: ChartRequest):
    try:
        return chart_module.compute(req.date, req.time, req.latitude, req.longitude, req.timezone)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ephemeris error: {str(e)}")

@app.post("/compute-transits")
def compute_transits(req: TransitRequest):
    try:
        return transits_module.compute(req.date, req.natal_chart)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transit error: {str(e)}")

@app.get("/health")
def health():
    return {"status": "ok"}
