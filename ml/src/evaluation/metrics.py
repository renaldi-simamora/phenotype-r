"""
metrics.py
==========
Evaluation metrics utilities for the SVM phenotype pipeline.

All metric functions take y_true and y_pred as inputs
and return structured dictionaries that can be serialised to CSV/JSON.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

from src.config import METRICS_DIR


def compute_metrics(
    y_true,
    y_pred: np.ndarray,
    label: str = "model",
) -> Dict[str, Any]:
    """
    Compute a comprehensive set of classification metrics.

    Parameters
    ----------
    y_true : array-like
        Ground-truth class labels.
    y_pred : array-like
        Predicted class labels.
    label : str
        Identifier for this evaluation.

    Returns
    -------
    dict
        Dictionary with accuracy, precision, recall, F1 scores.
    """
    acc = float(accuracy_score(y_true, y_pred))
    prec_macro = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

    metrics = {
        "label": label,
        "accuracy": acc,
        "precision_macro": prec_macro,
        "recall_macro": rec_macro,
        "f1_macro": f1_macro,
        "f1_weighted": f1_weighted,
    }
    return metrics


def compute_full_report(
    y_true,
    y_pred: np.ndarray,
) -> pd.DataFrame:
    """
    Compute per-class precision, recall, F1, and support.

    Parameters
    ----------
    y_true : array-like
    y_pred : array-like

    Returns
    -------
    pd.DataFrame
        Per-class metrics table.
    """
    report_dict = classification_report(
        y_true, y_pred, output_dict=True, zero_division=0
    )
    df_report = pd.DataFrame(report_dict).transpose()
    return df_report


def compute_confusion_matrices(
    y_true,
    y_pred: np.ndarray,
    labels: Optional[List[str]] = None,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute raw and normalised confusion matrices.

    Parameters
    ----------
    y_true : array-like
    y_pred : array-like
    labels : list, optional
        Label ordering.

    Returns
    -------
    cm : np.ndarray
        Raw confusion matrix.
    cm_norm : np.ndarray
        Row-normalised confusion matrix (row sums to 1).
    """
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)
    return cm, cm_norm


def save_metrics_csv(
    metrics: Dict[str, Any],
    filename: str,
) -> None:
    """
    Save a metrics dictionary to CSV.

    Parameters
    ----------
    metrics : dict
        Metrics to save.
    filename : str
        Filename (without path); saved under results/metrics/.
    """
    path = METRICS_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame([metrics])
    df.to_csv(path, index=False)
    print(f"Metrics saved → {path}")
