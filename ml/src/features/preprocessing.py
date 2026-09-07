"""
preprocessing.py
================
Data loading and sklearn-compatible preprocessing utilities.

Key design principles:
  - StandardScaler is ALWAYS fitted only on training data.
  - The scaler is embedded inside an sklearn Pipeline to prevent leakage.
  - No global state; every function is stateless and pure.
  - Probability estimates use CalibratedClassifierCV (scikit-learn >= 1.9).
"""

from pathlib import Path
from typing import Tuple, List, Optional

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV

from src.config import (
    PROCESSED_DATA_PATH,
    ALL_FEATURES,
    TARGET_COL,
    SUBJECT_ID_COL,
    RANDOM_SEED,
)


def load_dataset(path: Path = PROCESSED_DATA_PATH) -> pd.DataFrame:
    """
    Load the processed dataset from disk.

    Parameters
    ----------
    path : Path
        Path to the CSV file.

    Returns
    -------
    pd.DataFrame
        Loaded dataset.
    """
    df = pd.read_csv(path)
    return df


def get_X_y_groups(
    df: pd.DataFrame,
    features: List[str] = ALL_FEATURES,
    target: str = TARGET_COL,
    group_col: str = SUBJECT_ID_COL,
) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Extract feature matrix, target vector, and group labels.

    Parameters
    ----------
    df : pd.DataFrame
        Full dataset.
    features : list of str
        Feature columns to use.
    target : str
        Target column name.
    group_col : str
        Column containing subject IDs (used for group-aware splitting).

    Returns
    -------
    X : pd.DataFrame
        Feature matrix with shape (n_samples, n_features).
    y : pd.Series
        Target labels.
    groups : pd.Series
        Group (subject) labels for each row.
    """
    X = df[features].copy()
    y = df[target].copy()
    groups = df[group_col].copy()
    return X, y, groups


def build_svm_pipeline(
    kernel: str = "rbf",
    C: float = 1.0,
    gamma: str = "scale",
    probability: bool = True,
    random_state: int = RANDOM_SEED,
) -> Pipeline:
    """
    Build a StandardScaler + SVC pipeline.

    In scikit-learn >= 1.9, SVC(probability=True) is deprecated.
    When probability=True is requested, this function wraps the SVC
    in CalibratedClassifierCV(ensemble=False) to provide calibrated
    probability estimates via Platt scaling.

    Note: these are calibrated estimates, not biological probabilities.

    Parameters
    ----------
    kernel : str
        SVM kernel ('rbf' or 'linear').
    C : float
        Regularisation parameter.
    gamma : str or float
        Kernel coefficient for 'rbf'. Ignored for linear kernel.
    probability : bool
        If True, wrap SVC in CalibratedClassifierCV for probability output.
    random_state : int
        Random seed for reproducibility.

    Returns
    -------
    Pipeline
        sklearn Pipeline with ('scaler', StandardScaler) and
        ('classifier', SVC or CalibratedClassifierCV).
    """
    svc_kwargs = dict(
        kernel=kernel,
        C=C,
        random_state=random_state,
    )
    if kernel == "rbf":
        svc_kwargs["gamma"] = gamma

    base_svc = SVC(**svc_kwargs)

    if probability:
        classifier = CalibratedClassifierCV(base_svc, ensemble=False)
    else:
        classifier = base_svc

    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("classifier", classifier),
        ]
    )
    return pipeline
