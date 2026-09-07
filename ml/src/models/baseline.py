"""
baseline.py
===========
Baseline model comparison utilities.

Compares Logistic Regression, KNN, Random Forest, and SVM using
the same subject-level evaluation methodology.
"""

from typing import List, Dict, Any
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, StratifiedGroupKFold

from src.config import N_CV_FOLDS, RANDOM_SEED, ALL_FEATURES, TARGET_COL, SUBJECT_ID_COL
from src.features.preprocessing import get_X_y_groups
from src.evaluation.metrics import compute_metrics


def _build_pipeline(model) -> Pipeline:
    """Wrap a classifier in a StandardScaler pipeline."""
    return Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", model),
    ])


BASELINE_MODELS = {
    "Logistic Regression": _build_pipeline(
        LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)
    ),
    "KNN": _build_pipeline(
        KNeighborsClassifier(n_neighbors=5)
    ),
    "Random Forest": _build_pipeline(
        RandomForestClassifier(n_estimators=100, random_state=RANDOM_SEED)
    ),
    "SVM (baseline)": _build_pipeline(
        SVC(kernel="rbf", C=1.0, gamma="scale", random_state=RANDOM_SEED)
    ),
}
# Note: SVC(probability=True) is deprecated in sklearn 1.9.
# Baseline comparison uses predict() only (no probabilities needed).


def run_baseline_comparison(
    df_train: pd.DataFrame,
    df_test: pd.DataFrame,
    features: List[str] = ALL_FEATURES,
    n_cv_splits: int = N_CV_FOLDS,
) -> pd.DataFrame:
    """
    Train and evaluate multiple baseline models with subject-level CV.

    Parameters
    ----------
    df_train : pd.DataFrame
        Training split.
    df_test : pd.DataFrame
        Test split (used for final evaluation only — not for tuning).
    features : list of str
    n_cv_splits : int

    Returns
    -------
    pd.DataFrame
        Comparison table with accuracy, f1_macro, f1_weighted per model.
    """
    X_train, y_train, groups_train = get_X_y_groups(df_train, features=features)
    X_test, y_test, _ = get_X_y_groups(df_test, features=features)

    cv = StratifiedGroupKFold(n_splits=n_cv_splits)
    rows = []

    for name, pipeline in BASELINE_MODELS.items():
        print(f"\n--- {name} ---")
        # CV (train only, group-aware)
        cv_scores = cross_val_score(
            pipeline, X_train, y_train, groups=groups_train,
            cv=cv, scoring="f1_macro"
        )
        print(f"  CV F1 macro: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

        # Fit on full train, evaluate on test
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        m = compute_metrics(y_test, y_pred, label=name)
        m["cv_f1_macro_mean"] = float(cv_scores.mean())
        m["cv_f1_macro_std"] = float(cv_scores.std())
        print(f"  Test Accuracy: {m['accuracy']:.4f}, F1 macro: {m['f1_macro']:.4f}")
        rows.append(m)

    df_results = pd.DataFrame(rows)
    return df_results
