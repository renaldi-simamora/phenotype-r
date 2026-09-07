"""
config.py
=========
Central configuration for the SVM Phenotype ML pipeline.

All paths, random seeds, and hyperparameter grids are defined here
to ensure reproducibility and easy maintenance.
"""

import os
from pathlib import Path

# ─── Project Root ─────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# ─── Data Paths ────────────────────────────────────────────────────────────────
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_PATH = DATA_DIR / "raw" / "synthetic_raw.csv"
PROCESSED_DATA_PATH = DATA_DIR / "processed" / "synthetic_final_cleaned.csv"

# ─── Results Paths ─────────────────────────────────────────────────────────────
RESULTS_DIR = PROJECT_ROOT / "results"
FIGURES_DIR = RESULTS_DIR / "figures"
METRICS_DIR = RESULTS_DIR / "metrics"
TABLES_DIR = RESULTS_DIR / "tables"
REPORTS_DIR = RESULTS_DIR / "reports"

# ─── Model Paths ──────────────────────────────────────────────────────────────
MODELS_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODELS_DIR / "svm_final_pipeline.joblib"
METADATA_PATH = MODELS_DIR / "metadata.json"

# ─── Reproducibility ──────────────────────────────────────────────────────────
RANDOM_SEED = 42

# ─── Column Definitions ────────────────────────────────────────────────────────
SUBJECT_ID_COL = "subject_id"
MEASUREMENT_ID_COL = "measurement_id"
MEASUREMENT_INDEX_COL = "measurement_index"
TARGET_COL = "characteristic_class"

# Feature groups by sensor
AS7341_FEATURES = [
    "AS7341_F1",
    "AS7341_F2",
    "AS7341_F3",
    "AS7341_F4",
    "AS7341_F5",
    "AS7341_F6",
    "AS7341_F7",
    "AS7341_F8",
    "AS7341_Clear",
    "AS7341_NIR",
]

TCS34725_FEATURES = [
    "TCS34725_R",
    "TCS34725_G",
    "TCS34725_B",
    "TCS34725_Clear",
]

VL53L1X_FEATURES = [
    "VL53L1X_Distance_mm",
]

# Ordered feature list (must match inference input order)
ALL_FEATURES = AS7341_FEATURES + TCS34725_FEATURES + VL53L1X_FEATURES

# Metadata-only columns – NEVER use as ML features
METADATA_COLS = [SUBJECT_ID_COL, MEASUREMENT_ID_COL, MEASUREMENT_INDEX_COL]

# ─── Expected Dataset Properties ──────────────────────────────────────────────
EXPECTED_CLASSES = ["Class_A", "Class_B", "Class_C"]
EXPECTED_N_SUBJECTS = 500
EXPECTED_MEASUREMENTS_PER_SUBJECT = 5
EXPECTED_TOTAL_ROWS = EXPECTED_N_SUBJECTS * EXPECTED_MEASUREMENTS_PER_SUBJECT

# ─── Split Configuration ───────────────────────────────────────────────────────
TEST_SIZE = 0.2          # 20% of subjects for test
N_CV_FOLDS = 5          # Cross-validation folds

# ─── SVM Hyperparameter Grid ──────────────────────────────────────────────────
SVM_PARAM_GRID = [
    {
        "classifier__kernel": ["linear"],
        "classifier__C": [0.1, 1, 10, 100],
    },
    {
        "classifier__kernel": ["rbf"],
        "classifier__C": [0.1, 1, 10, 100],
        "classifier__gamma": ["scale", 0.001, 0.01, 0.1, 1],
    },
]

# ─── Ablation Study Sensor Configurations ─────────────────────────────────────
ABLATION_CONFIGS = {
    "AS7341_only": AS7341_FEATURES,
    "TCS34725_only": TCS34725_FEATURES,
    "VL53L1X_only": VL53L1X_FEATURES,
    "AS7341_TCS34725": AS7341_FEATURES + TCS34725_FEATURES,
    "AS7341_VL53L1X": AS7341_FEATURES + VL53L1X_FEATURES,
    "TCS34725_VL53L1X": TCS34725_FEATURES + VL53L1X_FEATURES,
    "All_sensors": ALL_FEATURES,
}

# ─── Ensure output directories exist ──────────────────────────────────────────
def ensure_dirs() -> None:
    """Create all required output directories if they don't exist."""
    for d in [FIGURES_DIR, METRICS_DIR, TABLES_DIR, REPORTS_DIR, MODELS_DIR]:
        d.mkdir(parents=True, exist_ok=True)
