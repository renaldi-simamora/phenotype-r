"""
test_model.py
=============
Tests for model training, splitting, and subject-level integrity.
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import SUBJECT_ID_COL, TARGET_COL, RANDOM_SEED, ALL_FEATURES
from src.features.preprocessing import load_dataset, get_X_y_groups, build_svm_pipeline
from src.data.splitting import subject_level_train_test_split, verify_no_subject_overlap


@pytest.fixture(scope="module")
def df():
    return load_dataset()


@pytest.fixture(scope="module")
def split(df):
    return subject_level_train_test_split(df)


def test_train_test_split_no_overlap(split):
    df_train, df_test = split
    train_subjects = set(df_train[SUBJECT_ID_COL].unique())
    test_subjects = set(df_test[SUBJECT_ID_COL].unique())
    overlap = train_subjects & test_subjects
    assert len(overlap) == 0, f"Subject overlap detected: {overlap}"


def test_train_test_split_sizes(split, df):
    df_train, df_test = split
    total_subjects = df[SUBJECT_ID_COL].nunique()
    train_subjects = df_train[SUBJECT_ID_COL].nunique()
    test_subjects = df_test[SUBJECT_ID_COL].nunique()
    assert train_subjects + test_subjects == total_subjects
    assert train_subjects > 0
    assert test_subjects > 0


def test_train_test_all_classes_present(split):
    df_train, df_test = split
    assert df_train[TARGET_COL].nunique() == 3, "Train split missing classes"
    assert df_test[TARGET_COL].nunique() == 3, "Test split missing classes"


def test_svm_pipeline_fits_and_predicts(split):
    df_train, df_test = split
    X_train, y_train, _ = get_X_y_groups(df_train)
    X_test, y_test, _ = get_X_y_groups(df_test)

    pipeline = build_svm_pipeline()
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    assert len(y_pred) == len(y_test)
    assert set(y_pred).issubset({"Class_A", "Class_B", "Class_C"})


def test_predictions_are_valid_classes(split):
    df_train, df_test = split
    X_train, y_train, _ = get_X_y_groups(df_train)
    X_test, y_test, _ = get_X_y_groups(df_test)

    pipeline = build_svm_pipeline()
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    valid = {"Class_A", "Class_B", "Class_C"}
    assert all(p in valid for p in y_pred)


def test_scaler_fitted_only_on_train(split):
    """Verify that only training data was used to fit the scaler."""
    df_train, _ = split
    X_train, y_train, _ = get_X_y_groups(df_train)
    pipeline = build_svm_pipeline()
    pipeline.fit(X_train, y_train)

    # The scaler's mean should match training data statistics
    scaler = pipeline.named_steps["scaler"]
    np.testing.assert_allclose(
        scaler.mean_,
        X_train.mean().values,
        rtol=1e-3,
        err_msg="Scaler mean does not match training data mean",
    )


def test_reproducibility(split):
    """Same data + same seed should give identical predictions."""
    df_train, df_test = split
    X_train, y_train, _ = get_X_y_groups(df_train)
    X_test, _, _ = get_X_y_groups(df_test)

    p1 = build_svm_pipeline(random_state=42)
    p2 = build_svm_pipeline(random_state=42)
    p1.fit(X_train, y_train)
    p2.fit(X_train, y_train)

    assert list(p1.predict(X_test)) == list(p2.predict(X_test))
