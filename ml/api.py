import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.inference.predict import SVMPredictor, InputValidationError, PredictorLoadError
from src.features.feature_schema import FEATURE_ORDER

# Global Predictor Instance
predictor: Optional[SVMPredictor] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    try:
        predictor = SVMPredictor()
        print("✅ SVMPredictor initialized and model loaded successfully.")
    except Exception as e:
        print(f"⚠️ Warning: Could not initialize SVMPredictor: {e}")
    yield


app = FastAPI(
    title="PhenoNode SVM ML Service",
    description="Machine Learning Inference Service for Multi-Sensor Phenotype Classification",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    measurement_id: str = Field(..., description="Measurement UUID or code")
    features: Optional[List[float]] = Field(
        None,
        description="Array of 15 numerical features in canonical order: AS7341 (10) + TCS34725 (4) + VL53L1X (1)",
    )
    sensor_data: Optional[Dict[str, float]] = Field(
        None,
        description="Key-value dictionary matching FEATURE_ORDER schema",
    )
    model_version: Optional[str] = Field("SVM-v1.0", description="Model version tag")


class PredictResponse(BaseModel):
    measurement_id: str
    prediction: str
    confidence: float
    probabilities: Optional[Dict[str, float]] = None
    model_version: str


@app.get("/health")
def health():
    return {
        "status": "ONLINE",
        "service": "PhenoNode-ML-Service",
        "model_loaded": predictor is not None and predictor.pipeline is not None,
        "feature_count": len(FEATURE_ORDER),
        "features": FEATURE_ORDER,
    }


@app.post("/predict", response_model=PredictResponse)
def predict_endpoint(payload: PredictRequest):
    global predictor
    if predictor is None or predictor.pipeline is None:
        try:
            predictor = SVMPredictor()
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"ML Model is not ready: {str(e)}",
            )

    # 1. Prepare sensor dictionary
    sensor_dict: Dict[str, float] = {}

    if payload.sensor_data:
        sensor_dict = payload.sensor_data
    elif payload.features:
        if len(payload.features) != len(FEATURE_ORDER):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid features length. Expected {len(FEATURE_ORDER)} features, "
                    f"got {len(payload.features)}. Canonical order: {FEATURE_ORDER}"
                ),
            )
        sensor_dict = {
            feat_name: float(payload.features[i])
            for i, feat_name in enumerate(FEATURE_ORDER)
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Either 'features' (list) or 'sensor_data' (dict) must be provided.",
        )

    # 2. Run inference
    try:
        result = predictor.predict(sensor_dict, return_probabilities=True)

        predicted_class = result.get("predicted_class", "Unknown")
        probabilities = result.get("probabilities", {})

        # Compute highest confidence score
        confidence = 0.95
        if isinstance(probabilities, dict) and predicted_class in probabilities:
            confidence = float(probabilities[predicted_class])
        elif isinstance(probabilities, dict) and len(probabilities) > 0:
            confidence = max(float(v) for v in probabilities.values() if isinstance(v, (int, float)))

        return PredictResponse(
            measurement_id=payload.measurement_id,
            prediction=predicted_class,
            confidence=round(confidence, 4),
            probabilities=probabilities if isinstance(probabilities, dict) else None,
            model_version=payload.model_version or "SVM-v1.0",
        )
    except InputValidationError as ive:
        raise HTTPException(status_code=422, detail=f"Validation error: {str(ive)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Starting PhenoNode ML Server on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
