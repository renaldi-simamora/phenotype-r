"""
predict.py
==========
Inference pipeline for the SVM phenotype classifier.

This module provides a clean interface for making predictions from
JSON-style sensor readings. It validates input features, enforces
canonical feature order, and returns structured predictions.

Designed for easy integration with:
  - Flask/FastAPI backend
  - ESP32 Wi-Fi payload
  - Web dashboard API calls
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np
import pandas as pd
import joblib

from src.config import MODEL_PATH, METADATA_PATH
from src.features.feature_schema import FEATURE_ORDER, N_FEATURES


class PredictorLoadError(Exception):
    """Raised when the model cannot be loaded."""


class InputValidationError(Exception):
    """Raised when input features are invalid."""


class SVMPredictor:
    """
    Loads and wraps the trained SVM pipeline for inference.

    Parameters
    ----------
    model_path : Path, optional
        Path to the saved .joblib pipeline.
    metadata_path : Path, optional
        Path to metadata.json.
    """

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        metadata_path: Path = METADATA_PATH,
    ) -> None:
        self.model_path = model_path
        self.metadata_path = metadata_path
        self.pipeline = None
        self.metadata: Dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        """Load model pipeline and metadata from disk."""
        if not self.model_path.exists():
            raise PredictorLoadError(
                f"Model not found at {self.model_path}. "
                "Run the training pipeline first."
            )
        self.pipeline = joblib.load(self.model_path)
        print(f"Model loaded from {self.model_path}")

        if self.metadata_path.exists():
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            print(f"Metadata loaded from {self.metadata_path}")

    def _validate_input(self, sensor_data: Dict[str, float]) -> pd.DataFrame:
        """
        Validate input dictionary and build ordered DataFrame.

        Parameters
        ----------
        sensor_data : dict
            Keys must match FEATURE_ORDER exactly.

        Returns
        -------
        pd.DataFrame
            Single-row DataFrame in canonical feature order.

        Raises
        ------
        InputValidationError
            On missing/extra features or non-numeric values.
        """
        provided = set(sensor_data.keys())
        expected = set(FEATURE_ORDER)

        missing = expected - provided
        extra = provided - expected

        if missing:
            raise InputValidationError(
                f"Missing required features: {sorted(missing)}"
            )
        if extra:
            raise InputValidationError(
                f"Unexpected extra features (remove them): {sorted(extra)}"
            )

        # Validate numeric types
        for feat in FEATURE_ORDER:
            val = sensor_data[feat]
            if not isinstance(val, (int, float, np.integer, np.floating)):
                raise InputValidationError(
                    f"Feature '{feat}' must be numeric, got {type(val).__name__}"
                )
            if np.isnan(float(val)) or np.isinf(float(val)):
                raise InputValidationError(
                    f"Feature '{feat}' has invalid value: {val}"
                )

        # Build ordered row
        row = {feat: [sensor_data[feat]] for feat in FEATURE_ORDER}
        return pd.DataFrame(row)

    def predict(
        self,
        sensor_data: Dict[str, float],
        return_probabilities: bool = True,
    ) -> Dict[str, Any]:
        """
        Predict phenotype class from sensor readings.

        Parameters
        ----------
        sensor_data : dict
            JSON-style dictionary of feature values.
            All 15 features must be present with numeric values.
        return_probabilities : bool
            If True, include class probability estimates.
            Note: probabilities are calibrated estimates (Platt scaling),
            not biological probabilities.

        Returns
        -------
        dict with keys:
            - 'predicted_class': str
            - 'probabilities': dict[str, float] (if return_probabilities)
            - 'feature_order': list[str]
            - 'model_note': str

        Raises
        ------
        InputValidationError
            On invalid input.
        PredictorLoadError
            If model is not loaded.
        """
        if self.pipeline is None:
            raise PredictorLoadError("Model pipeline is not loaded.")

        X = self._validate_input(sensor_data)
        predicted_class = self.pipeline.predict(X)[0]

        result: Dict[str, Any] = {
            "predicted_class": str(predicted_class),
            "feature_order": FEATURE_ORDER,
            "model_note": (
                "Pipeline trained on SYNTHETIC data for development only. "
                "Not validated for real phenotype identification."
            ),
        }

        if return_probabilities:
            try:
                probs = self.pipeline.predict_proba(X)[0]
                classes = self.pipeline.classes_
                result["probabilities"] = {
                    str(c): round(float(p), 4)
                    for c, p in zip(classes, probs)
                }
                result["probability_note"] = (
                    "Probabilities are Platt-scaled calibrated estimates, "
                    "not biological phenotype probabilities."
                )
            except AttributeError:
                result["probabilities"] = "Not available (probability=False)"

        return result

    def predict_from_json(
        self,
        json_str: str,
        return_probabilities: bool = True,
    ) -> Dict[str, Any]:
        """
        Predict from a raw JSON string.

        Parameters
        ----------
        json_str : str
            JSON-encoded sensor reading.

        Returns
        -------
        dict
            Same as predict().
        """
        try:
            sensor_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise InputValidationError(f"Invalid JSON string: {e}")
        return self.predict(sensor_data, return_probabilities=return_probabilities)


def load_predictor(
    model_path: Path = MODEL_PATH,
    metadata_path: Path = METADATA_PATH,
) -> SVMPredictor:
    """
    Convenience factory function to load the predictor.

    Returns
    -------
    SVMPredictor
    """
    return SVMPredictor(model_path=model_path, metadata_path=metadata_path)


# ─── Example usage (when run directly) ──────────────────────────────────────
if __name__ == "__main__":
    predictor = load_predictor()

    # Example synthetic input (values from actual dataset row)
    example_input = {
        "AS7341_F1": 116.16,
        "AS7341_F2": 133.07,
        "AS7341_F3": 150.69,
        "AS7341_F4": 149.69,
        "AS7341_F5": 157.87,
        "AS7341_F6": 157.40,
        "AS7341_F7": 145.84,
        "AS7341_F8": 138.25,
        "AS7341_Clear": 767.93,
        "AS7341_NIR": 266.37,
        "TCS34725_R": 120.30,
        "TCS34725_G": 128.55,
        "TCS34725_B": 102.93,
        "TCS34725_Clear": 442.32,
        "VL53L1X_Distance_mm": 36.54,
    }

    result = predictor.predict(example_input)
    print("\nInference Result:")
    print(json.dumps(result, indent=2))
