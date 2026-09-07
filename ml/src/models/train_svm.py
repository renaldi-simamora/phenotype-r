"""
train_svm.py
============
SVM training utilities for baseline and final model training.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score, StratifiedGroupKFold
from sklearn.svm import SVC

from src.config import N_CV_FOLDS, RANDOM_SEED, ALL_FEATURES, TARGET_COL, SUBJECT_ID_COL
from src.features.preprocessing import build_svm_pipeline, get_X_y_groups


def train_baseline_svm(
    df_train: pd.DataFrame,
    features=ALL_FEATURES,
    kernel: str = "rbf",
    C: float = 1.0,
    gamma: str = "scale",
) -> Any:
    """
    Train a baseline SVM pipeline on training data.

    Parameters
    ----------
    df_train : pd.DataFrame
        Training split (subject-level).
    features : list of str
        Feature columns to use.
    kernel, C, gamma : SVM hyperparameters.

    Returns
    -------
    pipeline : fitted sklearn Pipeline
    """
    X_train, y_train, _ = get_X_y_groups(df_train, features=features)
    pipeline = build_svm_pipeline(kernel=kernel, C=C, gamma=gamma)
    pipeline.fit(X_train, y_train)
    print(f"Baseline SVM trained: kernel={kernel}, C={C}, gamma={gamma}")
    return pipeline


def run_group_cv(
    df_train: pd.DataFrame,
    pipeline,
    features=ALL_FEATURES,
    n_splits: int = N_CV_FOLDS,
    scoring: str = "f1_macro",
) -> Dict[str, float]:
    """
    Run group-aware (subject-level) cross-validation.

    Parameters
    ----------
    df_train : pd.DataFrame
        Training data.
    pipeline : sklearn Pipeline (unfitted)
    features : list of str
    n_splits : int
    scoring : str

    Returns
    -------
    dict with 'cv_mean' and 'cv_std'
    """
    X, y, groups = get_X_y_groups(df_train, features=features)
    cv = StratifiedGroupKFold(n_splits=n_splits)
    scores = cross_val_score(pipeline, X, y, groups=groups, cv=cv, scoring=scoring)
    result = {"cv_mean": float(scores.mean()), "cv_std": float(scores.std())}
    print(
        f"Group CV ({scoring}): mean={result['cv_mean']:.4f}, "
        f"std={result['cv_std']:.4f}"
    )
    return result
