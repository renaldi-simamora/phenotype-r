"""
test_data.py
============
Tests for dataset loading and integrity.
"""

import sys
from pathlib import Path
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import (
    PROCESSED_DATA_PATH,
    ALL_FEATURES,
    TARGET_COL,
    SUBJECT_ID_COL,
    MEASUREMENT_ID_COL,
    MEASUREMENT_INDEX_COL,
    EXPECTED_CLASSES,
    EXPECTED_N_SUBJECTS,
    EXPECTED_MEASUREMENTS_PER_SUBJECT,
)
from src.features.preprocessing import load_dataset


@pytest.fixture(scope="module")
def df():
    return load_dataset(PROCESSED_DATA_PATH)


def test_dataset_file_exists():
    assert PROCESSED_DATA_PATH.exists(), f"Dataset not found: {PROCESSED_DATA_PATH}"


def test_dataset_loads(df):
    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0, "Dataset is empty"


def test_expected_columns_present(df):
    required = [SUBJECT_ID_COL, MEASUREMENT_ID_COL, MEASUREMENT_INDEX_COL] + ALL_FEATURES + [TARGET_COL]
    missing = [c for c in required if c not in df.columns]
    assert missing == [], f"Missing columns: {missing}"


def test_row_count(df):
    expected = EXPECTED_N_SUBJECTS * EXPECTED_MEASUREMENTS_PER_SUBJECT
    assert len(df) == expected, f"Expected {expected} rows, got {len(df)}"


def test_subject_count(df):
    n = df[SUBJECT_ID_COL].nunique()
    assert n == EXPECTED_N_SUBJECTS, f"Expected {EXPECTED_N_SUBJECTS} subjects, got {n}"


def test_no_missing_values(df):
    missing = df.isnull().sum()
    bad = missing[missing > 0]
    assert len(bad) == 0, f"Missing values found: {bad.to_dict()}"


def test_no_duplicate_rows(df):
    dup = df.duplicated().sum()
    assert dup == 0, f"{dup} duplicate rows found"


def test_target_classes(df):
    actual = sorted(df[TARGET_COL].unique())
    expected = sorted(EXPECTED_CLASSES)
    assert actual == expected, f"Expected classes {expected}, got {actual}"


def test_feature_dtypes_numeric(df):
    for feat in ALL_FEATURES:
        assert pd.api.types.is_numeric_dtype(df[feat]), f"Feature {feat} is not numeric"


def test_measurements_per_subject(df):
    counts = df.groupby(SUBJECT_ID_COL).size()
    assert counts.min() == EXPECTED_MEASUREMENTS_PER_SUBJECT
    assert counts.max() == EXPECTED_MEASUREMENTS_PER_SUBJECT
