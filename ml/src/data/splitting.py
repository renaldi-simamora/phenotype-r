"""
splitting.py
============
Subject-level train/test splitting utilities.

CRITICAL: All measurements from the same subject MUST stay in the
same split to prevent data leakage. Random row-level splitting is
explicitly forbidden.
"""

from typing import Tuple, Set
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold

from src.config import (
    SUBJECT_ID_COL,
    TARGET_COL,
    TEST_SIZE,
    N_CV_FOLDS,
    RANDOM_SEED,
)


def subject_level_train_test_split(
    df: pd.DataFrame,
    test_size: float = TEST_SIZE,
    random_state: int = RANDOM_SEED,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split dataset into train and test sets at the SUBJECT level.

    All measurements from the same subject are kept in the same split.
    This prevents data leakage from repeated measurements.

    Parameters
    ----------
    df : pd.DataFrame
        Full dataset.
    test_size : float
        Proportion of subjects to use for testing.
    random_state : int
        Random seed for reproducibility.

    Returns
    -------
    df_train : pd.DataFrame
        Training rows.
    df_test : pd.DataFrame
        Test rows.

    Raises
    ------
    AssertionError
        If subjects overlap between train and test.
    """
    X = df.drop(columns=[TARGET_COL])
    y = df[TARGET_COL]
    groups = df[SUBJECT_ID_COL]

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=test_size,
        random_state=random_state,
    )

    train_idx, test_idx = next(splitter.split(X, y, groups=groups))

    df_train = df.iloc[train_idx].reset_index(drop=True)
    df_test = df.iloc[test_idx].reset_index(drop=True)

    # ── Critical leakage check ───────────────────────────────────
    train_subjects: Set[str] = set(df_train[SUBJECT_ID_COL].unique())
    test_subjects: Set[str] = set(df_test[SUBJECT_ID_COL].unique())
    overlap = train_subjects & test_subjects

    assert len(overlap) == 0, (
        f"DATA LEAKAGE DETECTED: {len(overlap)} subjects appear in both "
        f"train and test: {overlap}"
    )

    print("Subject-level train/test split:")
    print(f"  Train subjects: {len(train_subjects)}, rows: {len(df_train)}")
    print(f"  Test  subjects: {len(test_subjects)},  rows: {len(df_test)}")
    print(f"  Subject overlap: {overlap}  <- must be empty")
    print(f"  Train class dist:\n{df_train[TARGET_COL].value_counts().to_dict()}")
    print(f"  Test  class dist:\n{df_test[TARGET_COL].value_counts().to_dict()}")

    return df_train, df_test


def verify_no_subject_overlap(
    df_train: pd.DataFrame, df_test: pd.DataFrame
) -> None:
    """
    Explicitly verify that no subject appears in both splits.

    Parameters
    ----------
    df_train : pd.DataFrame
    df_test : pd.DataFrame

    Raises
    ------
    AssertionError
        If overlap is detected.
    """
    train_subjects = set(df_train[SUBJECT_ID_COL].unique())
    test_subjects = set(df_test[SUBJECT_ID_COL].unique())
    overlap = train_subjects & test_subjects
    assert len(overlap) == 0, (
        f"Subject overlap detected: {overlap}"
    )
    print(f"Subject overlap check: PASSED (intersection = {overlap})")


def get_cv_splitter(n_splits: int = N_CV_FOLDS) -> StratifiedGroupKFold:
    """
    Return a group-aware cross-validation splitter.

    Uses StratifiedGroupKFold to maintain class proportions across folds
    while ensuring subjects do not leak across fold boundaries.

    Parameters
    ----------
    n_splits : int
        Number of CV folds.

    Returns
    -------
    StratifiedGroupKFold
        Cross-validation splitter instance.
    """
    return StratifiedGroupKFold(n_splits=n_splits)
