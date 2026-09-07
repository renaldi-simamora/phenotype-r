"""
test_inference.py
=================
Tests for the inference pipeline.

These tests require the trained model to exist.
Run run_pipeline.py first to generate models/svm_final_pipeline.joblib.
"""

import sys
from pathlib import Path
import pytest
import json

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import MODEL_PATH, ALL_FEATURES, EXPECTED_CLASSES
from src.features.feature_schema import FEATURE_ORDER

# Example valid input (values from actual dataset row 0)
VALID_INPUT = {
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


@pytest.fixture(scope="module")
def predictor():
    if not MODEL_PATH.exists():
        pytest.skip(f"Model not found at {MODEL_PATH}. Run run_pipeline.py first.")
    from src.inference.predict import load_predictor
    return load_predictor()


def test_model_file_exists():
    assert MODEL_PATH.exists(), f"Model not found: {MODEL_PATH}"


def test_predictor_loads(predictor):
    assert predictor is not None
    assert predictor.pipeline is not None


def test_valid_prediction(predictor):
    result = predictor.predict(VALID_INPUT)
    assert "predicted_class" in result
    assert result["predicted_class"] in EXPECTED_CLASSES


def test_prediction_returns_probabilities(predictor):
    result = predictor.predict(VALID_INPUT, return_probabilities=True)
    assert "probabilities" in result
    probs = result["probabilities"]
    if isinstance(probs, dict):
        assert abs(sum(probs.values()) - 1.0) < 0.01, "Probabilities should sum to ~1.0"


def test_prediction_correct_feature_order(predictor):
    result = predictor.predict(VALID_INPUT)
    assert result["feature_order"] == FEATURE_ORDER


def test_missing_feature_rejected(predictor):
    from src.inference.predict import InputValidationError
    bad_input = VALID_INPUT.copy()
    del bad_input["AS7341_F1"]
    with pytest.raises(InputValidationError):
        predictor.predict(bad_input)


def test_extra_feature_rejected(predictor):
    from src.inference.predict import InputValidationError
    bad_input = VALID_INPUT.copy()
    bad_input["UNKNOWN_FEATURE"] = 999.0
    with pytest.raises(InputValidationError):
        predictor.predict(bad_input)


def test_nan_value_rejected(predictor):
    import math
    from src.inference.predict import InputValidationError
    bad_input = VALID_INPUT.copy()
    bad_input["AS7341_F1"] = float("nan")
    with pytest.raises(InputValidationError):
        predictor.predict(bad_input)


def test_infinite_value_rejected(predictor):
    from src.inference.predict import InputValidationError
    bad_input = VALID_INPUT.copy()
    bad_input["AS7341_F1"] = float("inf")
    with pytest.raises(InputValidationError):
        predictor.predict(bad_input)


def test_json_prediction(predictor):
    json_str = json.dumps(VALID_INPUT)
    result = predictor.predict_from_json(json_str)
    assert result["predicted_class"] in EXPECTED_CLASSES


def test_invalid_json_rejected(predictor):
    from src.inference.predict import InputValidationError
    with pytest.raises(InputValidationError):
        predictor.predict_from_json("not valid json{{{")


def test_feature_count():
    assert len(FEATURE_ORDER) == 15
    assert len(ALL_FEATURES) == 15
    assert FEATURE_ORDER == ALL_FEATURES
