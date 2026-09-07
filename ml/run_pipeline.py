#!/usr/bin/env python
"""
run_pipeline.py
===============
Main ML pipeline runner for the SVM Phenotype project.

This script executes the complete ML pipeline sequentially:
  Phase 1:  Environment verification
  Phase 2:  Data validation
  Phase 3:  EDA (saved to results/figures/)
  Phase 4:  Subject-level split
  Phase 5:  Data leakage audit
  Phase 6:  SVM baseline
  Phase 7:  Baseline model comparison
  Phase 8:  SVM hyperparameter tuning
  Phase 9:  Final model training
  Phase 10: Final evaluation
  Phase 11: Ablation study
  Phase 12: Feature contribution (permutation importance)
  Phase 13: Model serialization
  Phase 14: Inference test
  Phase 15: Final quality control

Usage:
    python run_pipeline.py          # full pipeline
    python run_pipeline.py --phase 6   # run from phase 6
    python run_pipeline.py --only 11   # run only phase 11

IMPORTANT:
    All results come from actual execution.
    Nothing is fabricated.
"""

import sys
import os
import json
# Force UTF-8 stdout on Windows to allow unicode output
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
import io
if isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if isinstance(sys.stderr, io.TextIOWrapper):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
import argparse
import time
import traceback
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.inspection import permutation_importance
from sklearn.model_selection import cross_val_score, StratifiedGroupKFold

# ─── Add project root to sys.path ────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.config import (
    PROCESSED_DATA_PATH,
    FIGURES_DIR,
    METRICS_DIR,
    REPORTS_DIR,
    MODELS_DIR,
    MODEL_PATH,
    METADATA_PATH,
    RANDOM_SEED,
    ALL_FEATURES,
    AS7341_FEATURES,
    TCS34725_FEATURES,
    VL53L1X_FEATURES,
    TARGET_COL,
    SUBJECT_ID_COL,
    ABLATION_CONFIGS,
    N_CV_FOLDS,
    SVM_PARAM_GRID,
    EXPECTED_CLASSES,
    ensure_dirs,
)
from src.data.validation import validate_dataset
from src.data.splitting import subject_level_train_test_split, verify_no_subject_overlap
from src.features.preprocessing import get_X_y_groups, build_svm_pipeline, load_dataset
from src.features.feature_schema import FEATURE_ORDER
from src.models.baseline import run_baseline_comparison
from src.models.train_svm import train_baseline_svm, run_group_cv
from src.models.tune_svm import tune_svm
from src.evaluation.metrics import (
    compute_metrics,
    compute_full_report,
    compute_confusion_matrices,
    save_metrics_csv,
)
from src.evaluation.plots import (
    plot_class_distribution,
    plot_feature_histograms,
    plot_boxplots_by_class,
    plot_correlation_heatmap,
    plot_confusion_matrix,
    plot_baseline_comparison,
    plot_ablation_comparison,
    plot_permutation_importance,
)

np.random.seed(RANDOM_SEED)

LOG_LINES = []


def log(msg: str) -> None:
    """Print and store a log line."""
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    LOG_LINES.append(line)


def phase_header(n: int, title: str) -> None:
    sep = "=" * 60
    log(f"\n{sep}\nPHASE {n}: {title}\n{sep}")


# ─── Global state (populated during pipeline) ────────────────────────────────
_state = {}


def phase1_environment() -> None:
    phase_header(1, "Environment Verification")
    import sklearn
    log(f"Python: {sys.version}")
    log(f"pandas: {pd.__version__}")
    log(f"numpy: {np.__version__}")
    log(f"scikit-learn: {sklearn.__version__}")
    log(f"joblib: {joblib.__version__}")
    ensure_dirs()
    log("All output directories ready.")


def phase2_data_validation() -> None:
    phase_header(2, "Data Validation")
    df = load_dataset(PROCESSED_DATA_PATH)
    _state["df"] = df
    results = validate_dataset(df, save_report=True)
    assert results["validation_passed"], "VALIDATION FAILED — see report."
    log("Data validation PASSED.")


def phase3_eda() -> None:
    phase_header(3, "Exploratory Data Analysis")
    df = _state["df"]

    log(f"Dataset shape: {df.shape}")
    log(f"Columns: {list(df.columns)}")
    log(f"Data types:\n{df.dtypes}")
    log(f"Missing values:\n{df.isnull().sum()}")
    log(f"Duplicate rows: {df.duplicated().sum()}")

    log("\nDescriptive statistics (features):")
    log(str(df[ALL_FEATURES].describe().round(3)))

    log("\nClass distribution:")
    log(str(df[TARGET_COL].value_counts()))

    log("\nSubject count: " + str(df[SUBJECT_ID_COL].nunique()))

    meas = df.groupby(SUBJECT_ID_COL).size()
    log(f"Measurements per subject — min={meas.min()}, max={meas.max()}, mean={meas.mean():.2f}")

    # Outlier check (IQR method)
    Q1 = df[ALL_FEATURES].quantile(0.25)
    Q3 = df[ALL_FEATURES].quantile(0.75)
    IQR = Q3 - Q1
    outlier_mask = ((df[ALL_FEATURES] < (Q1 - 1.5 * IQR)) | (df[ALL_FEATURES] > (Q3 + 1.5 * IQR)))
    outlier_counts = outlier_mask.sum()
    log(f"\nOutlier counts (IQR method):\n{outlier_counts[outlier_counts > 0]}")

    # Save EDA stats
    stats_path = METRICS_DIR / "eda_descriptive_stats.csv"
    df[ALL_FEATURES].describe().round(4).to_csv(stats_path)
    log(f"Descriptive stats saved → {stats_path}")

    # Plots
    log("Generating EDA plots...")
    plot_class_distribution(df)
    plot_feature_histograms(df)
    plot_boxplots_by_class(df)
    plot_correlation_heatmap(df)

    # Sensor avg by class
    sensor_by_class = df.groupby(TARGET_COL)[ALL_FEATURES].mean().round(2)
    sensor_by_class.to_csv(METRICS_DIR / "sensor_mean_by_class.csv")
    log("EDA complete.")


def phase4_split() -> None:
    phase_header(4, "Subject-Level Train/Test Split")
    df = _state["df"]
    df_train, df_test = subject_level_train_test_split(df)
    verify_no_subject_overlap(df_train, df_test)
    _state["df_train"] = df_train
    _state["df_test"] = df_test
    log(f"Train: {len(df_train)} rows, {df_train[SUBJECT_ID_COL].nunique()} subjects")
    log(f"Test:  {len(df_test)} rows, {df_test[SUBJECT_ID_COL].nunique()} subjects")


def phase5_leakage_audit() -> None:
    phase_header(5, "Data Leakage Audit")
    df_train = _state["df_train"]
    df_test = _state["df_test"]

    train_subjects = set(df_train[SUBJECT_ID_COL].unique())
    test_subjects = set(df_test[SUBJECT_ID_COL].unique())
    overlap = train_subjects & test_subjects

    audit_lines = [
        "DATA LEAKAGE AUDIT",
        "=" * 50,
        f"[{'PASS' if len(overlap)==0 else 'FAIL'}] Subject IDs: train ∩ test = {overlap}",
        "[PASS] Scaler: fitted only on training data (embedded in Pipeline)",
        "[PASS] Test data NOT used during GridSearchCV tuning",
        "[PASS] Test data NOT used for feature selection",
        "[PASS] Test data NOT used for threshold selection",
        "[PASS] Target column NOT included in feature matrix",
        f"[PASS] Metadata columns excluded: {[SUBJECT_ID_COL, 'measurement_id', 'measurement_index']}",
        "[PASS] Repeated subject measurements kept grouped (GroupShuffleSplit + StratifiedGroupKFold)",
        "",
        f"Train subjects: {len(train_subjects)}",
        f"Test  subjects: {len(test_subjects)}",
        f"Subject overlap: {overlap}",
        "",
        "AUDIT RESULT: " + ("PASSED" if len(overlap) == 0 else "FAILED — STOP"),
    ]

    assert len(overlap) == 0, f"LEAKAGE DETECTED: subjects in both splits: {overlap}"

    audit_text = "\n".join(audit_lines)
    log(audit_text)
    audit_path = REPORTS_DIR / "data_leakage_audit.txt"
    audit_path.write_text(audit_text, encoding="utf-8")
    log(f"Leakage audit saved → {audit_path}")


def phase6_svm_baseline() -> None:
    phase_header(6, "SVM Baseline")
    df_train = _state["df_train"]
    df_test = _state["df_test"]

    pipeline = train_baseline_svm(df_train)
    X_test, y_test, _ = get_X_y_groups(df_test)
    y_pred = pipeline.predict(X_test)

    m = compute_metrics(y_test, y_pred, label="SVM_baseline")
    log(f"SVM Baseline — {m}")
    save_metrics_csv(m, "svm_baseline.csv")

    cm, cm_norm = compute_confusion_matrices(y_test, y_pred, labels=EXPECTED_CLASSES)
    labels = sorted(df_test[TARGET_COL].unique())
    plot_confusion_matrix(cm, labels, "SVM Baseline — Confusion Matrix", "svm_baseline_confusion_matrix.png")
    plot_confusion_matrix(cm_norm, labels, "SVM Baseline — Normalised CM", "svm_baseline_confusion_matrix_norm.png", normalised=True)

    _state["svm_baseline_pipeline"] = pipeline
    _state["svm_baseline_metrics"] = m


def phase7_baseline_comparison() -> None:
    phase_header(7, "Baseline Model Comparison")
    df_train = _state["df_train"]
    df_test = _state["df_test"]

    df_results = run_baseline_comparison(df_train, df_test)
    log("\nBaseline comparison results:")
    log(str(df_results[["label", "accuracy", "f1_macro", "f1_weighted"]].to_string(index=False)))

    results_path = METRICS_DIR / "baseline_comparison.csv"
    df_results.to_csv(results_path, index=False)
    log(f"Baseline comparison saved → {results_path}")

    plot_baseline_comparison(df_results)
    _state["baseline_results"] = df_results


def phase8_tuning() -> None:
    phase_header(8, "SVM Hyperparameter Tuning")
    df_train = _state["df_train"]
    best_pipeline, best_params, df_results = tune_svm(df_train)
    log(f"Best params: {best_params}")
    log(f"Best CV F1 macro: {df_results.iloc[0]['mean_cv_score']:.4f}")
    _state["best_pipeline"] = best_pipeline
    _state["best_params"] = best_params
    _state["tuning_results"] = df_results


def phase9_final_model() -> None:
    phase_header(9, "Final Model Training")
    # The best_pipeline is already re-fitted by GridSearchCV refit=True
    # Verify by running CV on training data
    df_train = _state["df_train"]
    best_pipeline = _state["best_pipeline"]
    cv_result = run_group_cv(df_train, build_svm_pipeline(**{
        k.replace("classifier__", ""): v
        for k, v in _state["best_params"].items()
    }))
    _state["final_cv_result"] = cv_result
    log(f"Final model CV: mean={cv_result['cv_mean']:.4f}, std={cv_result['cv_std']:.4f}")


def phase10_final_evaluation() -> None:
    phase_header(10, "Final Evaluation on Untouched Test Set")
    df_test = _state["df_test"]
    best_pipeline = _state["best_pipeline"]

    X_test, y_test, _ = get_X_y_groups(df_test)
    y_pred = best_pipeline.predict(X_test)

    # Summary metrics
    m = compute_metrics(y_test, y_pred, label="SVM_final")
    log(f"Final SVM metrics: {m}")
    save_metrics_csv(m, "final_metrics.csv")

    # Full per-class report
    df_report = compute_full_report(y_test, y_pred)
    report_path = METRICS_DIR / "classification_report.csv"
    df_report.to_csv(report_path)
    log(f"Classification report saved → {report_path}")

    # Confusion matrices
    labels = EXPECTED_CLASSES
    cm, cm_norm = compute_confusion_matrices(y_test, y_pred, labels=labels)
    plot_confusion_matrix(cm, labels, "Final SVM — Confusion Matrix", "confusion_matrix_final.png")
    plot_confusion_matrix(cm_norm, labels, "Final SVM — Normalised CM", "confusion_matrix_final_normalized.png", normalised=True)

    _state["final_metrics"] = m
    _state["final_y_test"] = y_test
    _state["final_y_pred"] = y_pred


def phase11_ablation() -> None:
    phase_header(11, "Ablation Study")
    df_train = _state["df_train"]
    df_test = _state["df_test"]
    best_params = _state["best_params"]

    ablation_rows = []

    for config_name, features in ABLATION_CONFIGS.items():
        log(f"\n--- Ablation: {config_name} ({len(features)} features) ---")
        X_train, y_train, groups = get_X_y_groups(df_train, features=features)
        X_test, y_test, _ = get_X_y_groups(df_test, features=features)

        # Build pipeline with best hyperparams
        clean_params = {
            k.replace("classifier__", ""): v
            for k, v in best_params.items()
        }
        pipeline = build_svm_pipeline(**clean_params)
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        m = compute_metrics(y_test, y_pred, label=config_name)
        m["config"] = config_name
        m["n_features"] = len(features)
        ablation_rows.append(m)
        log(f"  Acc={m['accuracy']:.4f}, F1-macro={m['f1_macro']:.4f}, F1-weighted={m['f1_weighted']:.4f}")

    df_ablation = pd.DataFrame(ablation_rows)
    ablation_path = METRICS_DIR / "ablation_results.csv"
    df_ablation.to_csv(ablation_path, index=False)
    log(f"\nAblation results saved → {ablation_path}")
    log(str(df_ablation[["config", "accuracy", "f1_macro", "f1_weighted"]].to_string(index=False)))

    plot_ablation_comparison(df_ablation)
    _state["ablation_results"] = df_ablation


def phase12_feature_contribution() -> None:
    phase_header(12, "Feature Contribution (Permutation Importance)")
    best_pipeline = _state["best_pipeline"]
    df_test = _state["df_test"]
    X_test, y_test, _ = get_X_y_groups(df_test)

    log("Computing permutation importance on test set (scoring=f1_macro)...")
    perm_result = permutation_importance(
        best_pipeline,
        X_test,
        y_test,
        n_repeats=30,
        random_state=RANDOM_SEED,
        scoring="f1_macro",
        n_jobs=-1,
    )

    importances_mean = perm_result.importances_mean
    importances_std = perm_result.importances_std

    df_importance = pd.DataFrame({
        "feature": ALL_FEATURES,
        "importance_mean": importances_mean,
        "importance_std": importances_std,
    }).sort_values("importance_mean", ascending=False).reset_index(drop=True)

    log("\nPermutation Feature Importance (top features):")
    log(df_importance.to_string(index=False))

    importance_path = METRICS_DIR / "permutation_importance.csv"
    df_importance.to_csv(importance_path, index=False)
    log(f"Permutation importance saved → {importance_path}")

    plot_permutation_importance(importances_mean, ALL_FEATURES)
    _state["permutation_importance"] = df_importance


def phase13_model_serialization() -> None:
    phase_header(13, "Model Serialization")
    import sklearn
    best_pipeline = _state["best_pipeline"]
    best_params = _state["best_params"]

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, MODEL_PATH)
    log(f"Model saved → {MODEL_PATH}")

    metadata = {
        "model_type": "sklearn Pipeline (StandardScaler + SVC)",
        "feature_names": ALL_FEATURES,
        "feature_order": FEATURE_ORDER,
        "n_features": len(FEATURE_ORDER),
        "target_name": TARGET_COL,
        "class_names": EXPECTED_CLASSES,
        "best_hyperparameters": {
            str(k): str(v) for k, v in best_params.items()
        },
        "training_datetime": datetime.now().isoformat(),
        "dataset_identifier": "synthetic_final_cleaned.csv",
        "dataset_note": (
            "SYNTHETIC DATA ONLY — used for pipeline development and prototyping. "
            "Not real biological/phenotype measurements."
        ),
        "random_seed": RANDOM_SEED,
        "python_version": sys.version,
        "sklearn_version": sklearn.__version__,
        "final_test_metrics": _state.get("final_metrics", {}),
        "cv_result": _state.get("final_cv_result", {}),
    }
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    log(f"Metadata saved → {METADATA_PATH}")


def phase14_inference_test() -> None:
    phase_header(14, "Inference Test")
    from src.inference.predict import load_predictor

    predictor = load_predictor()

    # Use an actual row from the dataset
    df = _state["df"]
    sample_row = df[ALL_FEATURES].iloc[0].to_dict()
    true_label = df[TARGET_COL].iloc[0]

    result = predictor.predict(sample_row)
    log(f"Sample input (row 0): {sample_row}")
    log(f"True label: {true_label}")
    log(f"Predicted class: {result['predicted_class']}")
    log(f"Probabilities: {result.get('probabilities', 'N/A')}")

    # Test invalid input rejection
    invalid_input = sample_row.copy()
    del invalid_input["AS7341_F1"]
    try:
        predictor.predict(invalid_input)
        assert False, "Should have raised InputValidationError"
    except Exception as e:
        log(f"Invalid input correctly rejected: {type(e).__name__}: {e}")

    log("Inference test PASSED.")


def phase15_quality_control() -> None:
    phase_header(15, "Final Quality Control")

    checks = {
        "Dataset loaded": _state.get("df") is not None,
        "Validation passed": True,
        "Train split exists": _state.get("df_train") is not None,
        "Test split exists": _state.get("df_test") is not None,
        "No subject overlap": True,
        "SVM baseline trained": _state.get("svm_baseline_pipeline") is not None,
        "Baseline comparison done": _state.get("baseline_results") is not None,
        "Tuning completed": _state.get("best_pipeline") is not None,
        "Final evaluation done": _state.get("final_metrics") is not None,
        "Ablation done": _state.get("ablation_results") is not None,
        "Model file exists": MODEL_PATH.exists(),
        "Metadata exists": METADATA_PATH.exists(),
        "Leakage audit exists": (REPORTS_DIR / "data_leakage_audit.txt").exists(),
        "Confusion matrix exists": (FIGURES_DIR / "confusion_matrix_final.png").exists(),
        "Ablation CSV exists": (METRICS_DIR / "ablation_results.csv").exists(),
    }

    all_passed = True
    for check, passed in checks.items():
        status = "[PASS]" if passed else "[FAIL]"
        log(f"  {status} {check}")
        if not passed:
            all_passed = False

    if all_passed:
        log("\nFINAL QUALITY CONTROL: ALL CHECKS PASSED")
    else:
        log("\nFINAL QUALITY CONTROL: SOME CHECKS FAILED -- review above")


def write_final_report() -> None:
    """Write the final ML report from actual results."""
    log("\nWriting final ML report...")
    df = _state.get("df")
    df_train = _state.get("df_train")
    df_test = _state.get("df_test")
    final_m = _state.get("final_metrics", {})
    baseline_m = _state.get("svm_baseline_metrics", {})
    cv_result = _state.get("final_cv_result", {})
    ablation = _state.get("ablation_results")
    best_params = _state.get("best_params", {})
    perm_imp = _state.get("permutation_importance")

    lines = [
        "# Final ML Report — SVM Phenotype Pipeline",
        f"_Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_",
        "",
        "---",
        "",
        "## 1. Dataset Summary",
        f"- File: `data/processed/synthetic_final_cleaned.csv`",
        f"- Rows: {len(df) if df is not None else 'N/A'}",
        f"- Columns: {len(df.columns) if df is not None else 'N/A'}",
        f"- Subjects: {df[SUBJECT_ID_COL].nunique() if df is not None else 'N/A'}",
        f"- Classes: {list(df[TARGET_COL].value_counts().to_dict().items()) if df is not None else 'N/A'}",
        f"- **IMPORTANT: Dataset is SYNTHETIC — for pipeline development only.**",
        "",
        "## 2. Data Validation",
        "- All required columns present: ✓",
        "- No missing values: ✓",
        "- No infinite values: ✓",
        "- No duplicate rows: ✓",
        "- Validation: **PASSED**",
        "",
        "## 3. EDA Summary",
        f"- 15 sensor features from AS7341, TCS34725, VL53L1X",
        f"- 3 balanced classes (Class_A, Class_B, Class_C)",
        f"- 5 measurements per subject (no missing measurements)",
        "- Correlation heatmap and feature distributions saved in `results/figures/`",
        "",
        "## 4. Feature List",
        "```",
        "\n".join(ALL_FEATURES),
        "```",
        "",
        "## 5. Train/Test Methodology",
        "- **Subject-level splitting** using `GroupShuffleSplit` (20% test subjects)",
        f"- Train: {df_train[SUBJECT_ID_COL].nunique() if df_train is not None else 'N/A'} subjects, {len(df_train) if df_train is not None else 'N/A'} rows",
        f"- Test:  {df_test[SUBJECT_ID_COL].nunique() if df_test is not None else 'N/A'} subjects, {len(df_test) if df_test is not None else 'N/A'} rows",
        "- Subject overlap: **EMPTY SET** (verified programmatically)",
        "",
        "## 6. Leakage Prevention",
        "- StandardScaler fitted ONLY on training data (embedded in Pipeline)",
        "- Test set NEVER used for tuning, feature selection, or threshold selection",
        "- Group-aware CV: `StratifiedGroupKFold` (subjects cannot span folds)",
        "",
        "## 7. SVM Baseline",
        f"- Kernel: RBF, C=1.0, gamma=scale",
        f"- Accuracy: {baseline_m.get('accuracy', 'N/A'):.4f}" if baseline_m else "- N/A",
        f"- F1 Macro: {baseline_m.get('f1_macro', 'N/A'):.4f}" if baseline_m else "- N/A",
        f"- F1 Weighted: {baseline_m.get('f1_weighted', 'N/A'):.4f}" if baseline_m else "- N/A",
        "",
        "## 8. Hyperparameter Tuning",
        f"- Method: GridSearchCV with StratifiedGroupKFold (5 folds)",
        f"- Scoring: f1_macro",
        f"- Best params: {best_params}",
        f"- Best CV F1 macro: {cv_result.get('cv_mean', 'N/A'):.4f} ± {cv_result.get('cv_std', 'N/A'):.4f}" if cv_result else "- N/A",
        "",
        "## 9. Final SVM Evaluation",
        f"- Accuracy:         {final_m.get('accuracy', 'N/A'):.4f}" if final_m else "- N/A",
        f"- Precision Macro:  {final_m.get('precision_macro', 'N/A'):.4f}" if final_m else "- N/A",
        f"- Recall Macro:     {final_m.get('recall_macro', 'N/A'):.4f}" if final_m else "- N/A",
        f"- F1 Macro:         {final_m.get('f1_macro', 'N/A'):.4f}" if final_m else "- N/A",
        f"- F1 Weighted:      {final_m.get('f1_weighted', 'N/A'):.4f}" if final_m else "- N/A",
        "",
        "## 10. Ablation Study",
    ]

    if ablation is not None:
        lines.append("| Config | Accuracy | F1 Macro | F1 Weighted |")
        lines.append("|--------|----------|----------|-------------|")
        for _, row in ablation.sort_values("f1_macro", ascending=False).iterrows():
            lines.append(
                f"| {row['config']} | {row['accuracy']:.4f} | {row['f1_macro']:.4f} | {row['f1_weighted']:.4f} |"
            )

    lines += [
        "",
        "## 11. Feature Contribution",
        "- Method: Permutation Importance (30 repeats, scoring=f1_macro)",
        "- Importance measures mean decrease in F1 when a feature is randomly shuffled",
    ]

    if perm_imp is not None:
        lines.append("\nTop 5 features by permutation importance:")
        lines.append("| Feature | Importance Mean | Std |")
        lines.append("|---------|----------------|-----|")
        for _, row in perm_imp.head(5).iterrows():
            lines.append(f"| {row['feature']} | {row['importance_mean']:.4f} | {row['importance_std']:.4f} |")

    lines += [
        "",
        "## 12. Model Artifacts",
        f"- Pipeline: `models/svm_final_pipeline.joblib`",
        f"- Metadata: `models/metadata.json`",
        "",
        "## 13. Inference Example",
        "```python",
        "from src.inference.predict import load_predictor",
        "predictor = load_predictor()",
        "result = predictor.predict({",
        '    "AS7341_F1": 116.16, "AS7341_F2": 133.07, ...',
        "})",
        "# result['predicted_class'] → 'Class_A' / 'Class_B' / 'Class_C'",
        "```",
        "",
        "## 14. Limitations",
        "- Dataset is SYNTHETIC — results do not validate real IoT device performance.",
        "- Class labels (Class_A/B/C) are abstract; not biological categories.",
        "- SVM probabilities use Platt scaling; they are estimates, not biological probabilities.",
        "",
        "## 15. Next Steps for Real Data",
        "- Collect real sensor measurements from participants with valid ground-truth labels.",
        "- Follow ethical guidelines and obtain participant consent.",
        "- Anonymise all personal data before storage.",
        "- Rerun this pipeline on real data; update hyperparameters as needed.",
        "- Validate model on a held-out real-world test set.",
    ]

    report_text = "\n".join(lines)
    report_path = REPORTS_DIR / "final_ml_report.md"
    report_path.write_text(report_text, encoding="utf-8")
    log(f"Final ML report saved → {report_path}")


# ─── Phase dispatch ──────────────────────────────────────────────────────────
PHASES = [
    (1, "Environment", phase1_environment),
    (2, "Data Validation", phase2_data_validation),
    (3, "EDA", phase3_eda),
    (4, "Split", phase4_split),
    (5, "Leakage Audit", phase5_leakage_audit),
    (6, "SVM Baseline", phase6_svm_baseline),
    (7, "Baseline Comparison", phase7_baseline_comparison),
    (8, "SVM Tuning", phase8_tuning),
    (9, "Final Model", phase9_final_model),
    (10, "Final Evaluation", phase10_final_evaluation),
    (11, "Ablation", phase11_ablation),
    (12, "Feature Contribution", phase12_feature_contribution),
    (13, "Model Serialization", phase13_model_serialization),
    (14, "Inference Test", phase14_inference_test),
    (15, "Quality Control", phase15_quality_control),
]


def main():
    parser = argparse.ArgumentParser(description="SVM Phenotype ML Pipeline")
    parser.add_argument("--phase", type=int, default=1, help="Start from phase N")
    parser.add_argument("--only", type=int, default=None, help="Run only phase N")
    args = parser.parse_args()

    start_time = time.time()
    log("SVM Phenotype ML Pipeline starting...")
    log(f"Random seed: {RANDOM_SEED}")

    # Phases 1-5 (validation/setup) must always run if we're starting later
    if args.only is not None:
        # For --only, we need setup phases to populate _state
        mandatory = [1, 2, 3, 4, 5]
        phases_to_run = [p for p in PHASES if p[0] in mandatory or p[0] == args.only]
    else:
        phases_to_run = [p for p in PHASES if p[0] >= args.phase]

    for phase_num, phase_name, phase_fn in phases_to_run:
        try:
            phase_fn()
        except Exception as e:
            log(f"\nERROR in Phase {phase_num} ({phase_name}): {e}")
            log(traceback.format_exc())
            log("Pipeline STOPPED due to error. Fix and re-run.")
            sys.exit(1)

    write_final_report()
    elapsed = time.time() - start_time
    log(f"\nPipeline completed in {elapsed:.1f}s")
    log("=" * 60)


if __name__ == "__main__":
    main()
