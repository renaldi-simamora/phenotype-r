"""
test_features.py
================
Tests for feature schema and preprocessing utilities.
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import ALL_FEATURES, TARGET_COL, SUBJECT_ID_COL, METADATA_COLS
from src.features.feature_schema import (
    FEATURE_ORDER,
    N_FEATURES,
    AS7341_FEATURES,
    TCS34725_FEATURES,
    VL53L1X_FEATURES,
    validate_feature_list,
)
from src.features.preprocessing import load_dataset, get_X_y_groups, build_svm_pipeline


def test_feature_order_length():
    assert len(FEATURE_ORDER) == 15, f"Expected 15 features, got {len(FEATURE_ORDER)}"
    assert N_FEATURES == 15


def test_feature_groups_sum():
    total = len(AS7341_FEATURES) + len(TCS34725_FEATURES) + len(VL53L1X_FEATURES)
    assert total == 15, f"Feature group sum mismatch: {total}"


def test_feature_order_no_metadata():
    for col in METADATA_COLS:
        assert col not in FEATURE_ORDER, f"Metadata column '{col}' found in FEATURE_ORDER"
    assert TARGET_COL not in FEATURE_ORDER, "Target column found in FEATURE_ORDER"


def test_validate_feature_list_passes():
    result = validate_feature_list(FEATURE_ORDER)
    assert result is True


def test_validate_feature_list_fails_on_missing():
    bad_list = FEATURE_ORDER[1:]  # missing first feature
    with pytest.raises(ValueError):
        validate_feature_list(bad_list)


def test_validate_feature_list_fails_on_extra():
    bad_list = FEATURE_ORDER + ["EXTRA_COL"]
    with pytest.raises(ValueError):
        validate_feature_list(bad_list)


def test_get_X_y_groups():
    df = load_dataset()
    X, y, groups = get_X_y_groups(df)
    assert X.shape == (len(df), 15)
    assert list(X.columns) == ALL_FEATURES
    assert len(y) == len(df)
    assert len(groups) == len(df)


def test_target_not_in_X():
    df = load_dataset()
    X, _, _ = get_X_y_groups(df)
    assert TARGET_COL not in X.columns


def test_metadata_not_in_X():
    df = load_dataset()
    X, _, _ = get_X_y_groups(df)
    for col in METADATA_COLS:
        assert col not in X.columns, f"Metadata column '{col}' found in X"


def test_pipeline_builds():
    pipeline = build_svm_pipeline()
    assert hasattr(pipeline, "fit")
    assert hasattr(pipeline, "predict")
    assert "scaler" in pipeline.named_steps
    assert "classifier" in pipeline.named_steps
