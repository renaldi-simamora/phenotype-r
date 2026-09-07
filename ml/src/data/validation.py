"""
validation.py
=============
Dataset validation utilities for the SVM phenotype pipeline.

Creates a structured validation report that can be saved to disk.
If any critical check fails, raises a ValidationError with a clear message.
"""

from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd

from src.config import (
    ALL_FEATURES,
    TARGET_COL,
    SUBJECT_ID_COL,
    MEASUREMENT_ID_COL,
    MEASUREMENT_INDEX_COL,
    EXPECTED_CLASSES,
    EXPECTED_N_SUBJECTS,
    EXPECTED_MEASUREMENTS_PER_SUBJECT,
    EXPECTED_TOTAL_ROWS,
    REPORTS_DIR,
)


class ValidationError(Exception):
    """Raised when a critical data validation check fails."""


REQUIRED_COLUMNS = (
    [SUBJECT_ID_COL, MEASUREMENT_ID_COL, MEASUREMENT_INDEX_COL]
    + ALL_FEATURES
    + [TARGET_COL]
)


def validate_dataset(
    df: pd.DataFrame,
    save_report: bool = True,
    report_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Run full validation suite on the dataset.

    Parameters
    ----------
    df : pd.DataFrame
        Dataset to validate.
    save_report : bool
        If True, write a text report to results/reports/.
    report_path : Path, optional
        Override default report path.

    Returns
    -------
    dict
        Validation results keyed by check name.

    Raises
    ------
    ValidationError
        If any critical check fails.
    """
    results: Dict[str, Any] = {}
    lines = ["=" * 60, "DATA VALIDATION REPORT", "=" * 60]

    # ── 1. Shape ──────────────────────────────────────────────────
    n_rows, n_cols = df.shape
    results["n_rows"] = n_rows
    results["n_cols"] = n_cols
    lines.append(f"\n[1] Dataset shape: {n_rows} rows x {n_cols} columns")

    # -- 2. Required columns ---------------------------------------
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    extra_cols = [c for c in df.columns if c not in REQUIRED_COLUMNS]
    results["missing_columns"] = missing_cols
    results["extra_columns"] = extra_cols
    lines.append(f"\n[2] Missing required columns: {missing_cols}")
    lines.append(f"    Extra columns: {extra_cols}")
    if missing_cols:
        raise ValidationError(f"Missing required columns: {missing_cols}")

    # -- 3. Data types ---------------------------------------------
    numeric_cols = ALL_FEATURES
    bad_types = {
        col: str(df[col].dtype)
        for col in numeric_cols
        if not pd.api.types.is_numeric_dtype(df[col])
    }
    results["non_numeric_feature_cols"] = bad_types
    lines.append(f"\n[3] Non-numeric feature columns: {bad_types}")
    if bad_types:
        raise ValidationError(f"Feature columns are not numeric: {bad_types}")

    # -- 4. Missing values -----------------------------------------
    missing_vals = df.isnull().sum()
    missing_dict = missing_vals[missing_vals > 0].to_dict()
    results["missing_values"] = missing_dict
    lines.append(f"\n[4] Missing values by column: {missing_dict}")
    if missing_dict:
        raise ValidationError(f"Missing values detected: {missing_dict}")

    # ── 5. Infinite values ────────────────────────────────────────
    inf_counts = {
        col: int(np.isinf(df[col]).sum())
        for col in numeric_cols
        if np.isinf(df[col]).any()
    }
    results["infinite_values"] = inf_counts
    lines.append(f"\n[5] Infinite values by column: {inf_counts}")
    if inf_counts:
        raise ValidationError(f"Infinite values detected: {inf_counts}")

    # ── 6. Negative distance values ───────────────────────────────
    neg_distance = int((df["VL53L1X_Distance_mm"] < 0).sum())
    results["negative_distance_count"] = neg_distance
    lines.append(f"\n[6] Negative VL53L1X_Distance_mm values: {neg_distance}")
    if neg_distance > 0:
        lines.append("    WARNING: Negative distance values found.")

    # ── 7. Duplicate rows ─────────────────────────────────────────
    dup_rows = int(df.duplicated().sum())
    results["duplicate_rows"] = dup_rows
    lines.append(f"\n[7] Duplicate rows: {dup_rows}")

    # ── 8. Duplicate measurement IDs ─────────────────────────────
    dup_mids = int(df[MEASUREMENT_ID_COL].duplicated().sum())
    results["duplicate_measurement_ids"] = dup_mids
    lines.append(f"\n[8] Duplicate measurement IDs: {dup_mids}")

    # ── 9. Duplicate subject + measurement_index combos ──────────
    dup_combos = int(
        df.duplicated(subset=[SUBJECT_ID_COL, MEASUREMENT_INDEX_COL]).sum()
    )
    results["duplicate_subject_measurement_combos"] = dup_combos
    lines.append(
        f"\n[9] Duplicate (subject_id, measurement_index) combos: {dup_combos}"
    )

    # ── 10. Subject count ─────────────────────────────────────────
    n_subjects = df[SUBJECT_ID_COL].nunique()
    results["n_subjects"] = n_subjects
    lines.append(f"\n[10] Unique subjects: {n_subjects} (expected ~{EXPECTED_N_SUBJECTS})")

    # ── 11. Measurements per subject ─────────────────────────────
    meas_per_subject = df.groupby(SUBJECT_ID_COL).size()
    results["min_meas_per_subject"] = int(meas_per_subject.min().item())
    results["max_meas_per_subject"] = int(meas_per_subject.max().item())
    results["mean_meas_per_subject"] = float(meas_per_subject.mean().item())
    lines.append(
        f"\n[11] Measurements per subject - "
        f"min={results['min_meas_per_subject']}, "
        f"max={results['max_meas_per_subject']}, "
        f"mean={results['mean_meas_per_subject']:.2f}"
    )

    # ── 12. Class distribution ────────────────────────────────────
    class_dist = df[TARGET_COL].value_counts().to_dict()
    results["class_distribution"] = class_dist
    unknown_classes = [c for c in class_dist if c not in EXPECTED_CLASSES]
    results["unknown_classes"] = unknown_classes
    lines.append(f"\n[12] Class distribution: {class_dist}")
    lines.append(f"     Unknown classes: {unknown_classes}")
    if unknown_classes:
        lines.append("     WARNING: Unexpected class labels found.")

    # ── 13. Summary ───────────────────────────────────────────────
    all_passed = not (
        missing_dict or inf_counts or bad_types or missing_cols
    )
    results["validation_passed"] = all_passed
    status = "PASSED [OK]" if all_passed else "FAILED [FAIL]"
    lines.append(f"\n{'=' * 60}")
    lines.append(f"OVERALL VALIDATION STATUS: {status}")
    lines.append("=" * 60)

    report_text = "\n".join(lines)
    print(report_text)

    if save_report:
        rpath = report_path or (REPORTS_DIR / "data_validation_report.txt")
        rpath.parent.mkdir(parents=True, exist_ok=True)
        rpath.write_text(report_text, encoding="utf-8")
        print(f"\nValidation report saved → {rpath}")

    return results
