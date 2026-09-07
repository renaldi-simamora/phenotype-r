"""
plots.py
========
Visualisation utilities for the SVM phenotype pipeline.

Generates and saves all required figures to results/figures/.
"""

from pathlib import Path
from typing import List, Optional
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import seaborn as sns

from src.config import FIGURES_DIR, TARGET_COL, ALL_FEATURES, RANDOM_SEED

# Use a non-interactive backend suitable for server/script use
import matplotlib
matplotlib.use("Agg")


def _save_fig(fig: plt.Figure, filename: str) -> None:
    """Save figure to results/figures/ and close it."""
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIGURES_DIR / filename
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Figure saved → {path}")


def plot_class_distribution(df: pd.DataFrame, filename: str = "class_distribution.png") -> None:
    """Bar chart of target class counts."""
    counts = df[TARGET_COL].value_counts().sort_index()
    fig, ax = plt.subplots(figsize=(7, 4))
    colors = ["#4C72B0", "#DD8452", "#55A868"]
    counts.plot(kind="bar", ax=ax, color=colors, edgecolor="black", width=0.6)
    ax.set_title("Class Distribution", fontsize=14, fontweight="bold")
    ax.set_xlabel("Characteristic Class", fontsize=11)
    ax.set_ylabel("Count", fontsize=11)
    ax.set_xticklabels(counts.index, rotation=0)
    for patch, val in zip(ax.patches, counts.values):
        ax.text(
            patch.get_x() + patch.get_width() / 2,
            patch.get_height() + 5,
            str(val),
            ha="center",
            fontsize=10,
        )
    plt.tight_layout()
    _save_fig(fig, filename)


def plot_feature_histograms(df: pd.DataFrame, filename: str = "feature_histograms.png") -> None:
    """Grid of histograms for all sensor features."""
    n = len(ALL_FEATURES)
    ncols = 5
    nrows = (n + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(4 * ncols, 3 * nrows))
    axes = axes.flatten()
    for i, feat in enumerate(ALL_FEATURES):
        axes[i].hist(df[feat], bins=30, color="#4C72B0", alpha=0.75, edgecolor="white")
        axes[i].set_title(feat, fontsize=8)
        axes[i].set_xlabel("")
        axes[i].tick_params(labelsize=7)
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)
    fig.suptitle("Feature Distributions", fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout()
    _save_fig(fig, filename)


def plot_boxplots_by_class(df: pd.DataFrame, filename: str = "boxplots_by_class.png") -> None:
    """Boxplot of each feature grouped by class."""
    n = len(ALL_FEATURES)
    ncols = 5
    nrows = (n + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(4 * ncols, 3.5 * nrows))
    axes = axes.flatten()
    palette = ["#4C72B0", "#DD8452", "#55A868"]
    for i, feat in enumerate(ALL_FEATURES):
        df.boxplot(column=feat, by=TARGET_COL, ax=axes[i], patch_artist=True)
        axes[i].set_title(feat, fontsize=8)
        axes[i].set_xlabel("")
        axes[i].tick_params(labelsize=7)
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)
    fig.suptitle("Feature Distributions by Class", fontsize=14, fontweight="bold")
    plt.tight_layout()
    _save_fig(fig, filename)


def plot_correlation_heatmap(df: pd.DataFrame, filename: str = "correlation_heatmap.png") -> None:
    """Correlation heatmap of all features."""
    corr = df[ALL_FEATURES].corr()
    fig, ax = plt.subplots(figsize=(12, 10))
    sns.heatmap(
        corr,
        annot=True,
        fmt=".2f",
        cmap="coolwarm",
        center=0,
        square=True,
        linewidths=0.4,
        annot_kws={"size": 7},
        ax=ax,
    )
    ax.set_title("Feature Correlation Heatmap", fontsize=14, fontweight="bold")
    plt.tight_layout()
    _save_fig(fig, filename)


def plot_confusion_matrix(
    cm: np.ndarray,
    labels: List[str],
    title: str = "Confusion Matrix",
    filename: str = "confusion_matrix.png",
    normalised: bool = False,
) -> None:
    """Heatmap of a confusion matrix (raw or normalised)."""
    fmt = ".2f" if normalised else "d"
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt=fmt,
        cmap="Blues",
        xticklabels=labels,
        yticklabels=labels,
        ax=ax,
        linewidths=0.5,
        cbar=True,
    )
    ax.set_xlabel("Predicted Label", fontsize=11)
    ax.set_ylabel("True Label", fontsize=11)
    ax.set_title(title, fontsize=13, fontweight="bold")
    plt.tight_layout()
    _save_fig(fig, filename)


def plot_baseline_comparison(
    df_results: pd.DataFrame,
    filename: str = "baseline_comparison.png",
) -> None:
    """
    Grouped bar chart comparing baseline models.

    Parameters
    ----------
    df_results : pd.DataFrame
        Must have columns: label, accuracy, f1_macro, f1_weighted
    """
    metrics = ["accuracy", "f1_macro", "f1_weighted"]
    x = np.arange(len(df_results))
    width = 0.25
    fig, ax = plt.subplots(figsize=(9, 5))
    colors = ["#4C72B0", "#DD8452", "#55A868"]
    for i, (metric, color) in enumerate(zip(metrics, colors)):
        ax.bar(x + i * width, df_results[metric], width, label=metric, color=color, edgecolor="black")
    ax.set_xticks(x + width)
    ax.set_xticklabels(df_results["label"], rotation=15, ha="right")
    ax.set_ylim(0, 1.1)
    ax.set_ylabel("Score", fontsize=11)
    ax.set_title("Baseline Model Comparison", fontsize=13, fontweight="bold")
    ax.legend(loc="lower right")
    ax.yaxis.set_major_formatter(mtick.PercentFormatter(xmax=1.0))
    plt.tight_layout()
    _save_fig(fig, filename)


def plot_ablation_comparison(
    df_ablation: pd.DataFrame,
    filename: str = "ablation_comparison.png",
) -> None:
    """
    Bar chart comparing ablation study configurations.

    Parameters
    ----------
    df_ablation : pd.DataFrame
        Must have columns: config, accuracy, f1_macro, f1_weighted
    """
    df_sorted = df_ablation.sort_values("f1_macro", ascending=False)
    x = np.arange(len(df_sorted))
    width = 0.28
    fig, ax = plt.subplots(figsize=(11, 5))
    metrics = ["accuracy", "f1_macro", "f1_weighted"]
    colors = ["#4C72B0", "#DD8452", "#55A868"]
    for i, (metric, color) in enumerate(zip(metrics, colors)):
        ax.bar(
            x + i * width,
            df_sorted[metric],
            width,
            label=metric,
            color=color,
            edgecolor="black",
            alpha=0.88,
        )
    ax.set_xticks(x + width)
    ax.set_xticklabels(df_sorted["config"], rotation=20, ha="right", fontsize=9)
    ax.set_ylim(0, 1.1)
    ax.set_ylabel("Score", fontsize=11)
    ax.set_title("Ablation Study — Sensor Contribution", fontsize=13, fontweight="bold")
    ax.legend(loc="lower right")
    ax.yaxis.set_major_formatter(mtick.PercentFormatter(xmax=1.0))
    plt.tight_layout()
    _save_fig(fig, filename)


def plot_permutation_importance(
    importances: np.ndarray,
    feature_names: List[str],
    filename: str = "permutation_importance.png",
) -> None:
    """
    Horizontal bar chart of permutation feature importances.

    Parameters
    ----------
    importances : np.ndarray, shape (n_features,)
        Mean importance scores.
    feature_names : list of str
    """
    sorted_idx = np.argsort(importances)
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(
        [feature_names[i] for i in sorted_idx],
        importances[sorted_idx],
        color="#4C72B0",
        edgecolor="black",
        alpha=0.85,
    )
    ax.set_xlabel("Mean Decrease in Accuracy", fontsize=11)
    ax.set_title("Permutation Feature Importance", fontsize=13, fontweight="bold")
    plt.tight_layout()
    _save_fig(fig, filename)
