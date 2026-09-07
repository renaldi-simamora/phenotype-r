"""
feature_schema.py
=================
Defines the canonical feature order for the SVM phenotype pipeline.

This exact order MUST be maintained across:
  - training
  - testing / evaluation
  - model serialization
  - inference API
  - ESP32 / backend integration

Any deviation from this order will cause silent prediction errors.
"""

from typing import List

# ─── Sensor Feature Groups ──────────────────────────────────────────────────
AS7341_FEATURES: List[str] = [
    "AS7341_F1",
    "AS7341_F2",
    "AS7341_F3",
    "AS7341_F4",
    "AS7341_F5",
    "AS7341_F6",
    "AS7341_F7",
    "AS7341_F8",
    "AS7341_Clear",
    "AS7341_NIR",
]

TCS34725_FEATURES: List[str] = [
    "TCS34725_R",
    "TCS34725_G",
    "TCS34725_B",
    "TCS34725_Clear",
]

VL53L1X_FEATURES: List[str] = [
    "VL53L1X_Distance_mm",
]

# ─── Canonical Full Feature Order ───────────────────────────────────────────
#
#   *** DO NOT REORDER ***
#   This list defines the contract between:
#     - the trained model scaler
#     - the inference API
#     - the ESP32 JSON payload
#
FEATURE_ORDER: List[str] = (
    AS7341_FEATURES
    + TCS34725_FEATURES
    + VL53L1X_FEATURES
)

N_FEATURES: int = len(FEATURE_ORDER)  # 15

# ─── Ablation Study Sensor Configurations ────────────────────────────────────
ABLATION_CONFIGS = {
    "AS7341_only": AS7341_FEATURES,
    "TCS34725_only": TCS34725_FEATURES,
    "VL53L1X_only": VL53L1X_FEATURES,
    "AS7341_TCS34725": AS7341_FEATURES + TCS34725_FEATURES,
    "AS7341_VL53L1X": AS7341_FEATURES + VL53L1X_FEATURES,
    "TCS34725_VL53L1X": TCS34725_FEATURES + VL53L1X_FEATURES,
    "All_sensors": FEATURE_ORDER,
}


def validate_feature_list(features: List[str]) -> bool:
    """
    Validate that a feature list matches the canonical order.

    Parameters
    ----------
    features : list of str
        Feature names to validate.

    Returns
    -------
    bool
        True if features match FEATURE_ORDER exactly.

    Raises
    ------
    ValueError
        If the feature list does not match.
    """
    if features != FEATURE_ORDER:
        missing = set(FEATURE_ORDER) - set(features)
        extra = set(features) - set(FEATURE_ORDER)
        msg = f"Feature list mismatch.\n  Missing: {missing}\n  Extra: {extra}"
        raise ValueError(msg)
    return True
