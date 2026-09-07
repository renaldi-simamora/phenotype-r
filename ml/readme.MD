# SVM Phenotype Classification — ML Pipeline

> **Undergraduate Thesis Project**  
> "Rancang Bangun Perangkat IoT Multi-Sensor Berbasis Support Vector Machine  
> untuk Mendukung Identifikasi Karakteristik Fenotip Individu"

---

## ⚠️ IMPORTANT DISCLAIMER — SYNTHETIC DATA

The current dataset (`data/processed/synthetic_final_cleaned.csv`) is **100% synthetic**.

It was generated programmatically for the purpose of:
- Developing and validating the ML pipeline architecture
- Testing subject-level splitting, preprocessing, and SVM training
- Prototyping inference integration with the backend/ESP32

**This pipeline does NOT currently perform real phenotype identification.**
Real performance can only be evaluated after collecting actual sensor measurements
from real participants with valid ground-truth labels.

---

## Overview

This repository contains the complete Machine Learning pipeline for a multi-sensor IoT
phenotype classification system. The system uses readings from three sensors
(AS7341 spectral, TCS34725 RGB, VL53L1X distance) captured by an ESP32-S3 device to
perform classification using a Support Vector Machine (SVM).

## Planned System Architecture

```
AS7341 + TCS34725 + VL53L1X
         ↓
      ESP32-S3
         ↓
       Wi-Fi
         ↓
    Backend / API
         ↓
      Database
         ↓
  Machine Learning (SVM)
         ↓
  Classification Result
         ↓
   Web Dashboard
```

## ML Pipeline Components

| Phase | Description |
|-------|-------------|
| 1 | Environment verification |
| 2 | Data validation |
| 3 | Exploratory Data Analysis (EDA) |
| 4 | Subject-level train/test split |
| 5 | Data leakage audit |
| 6 | SVM baseline |
| 7 | Baseline model comparison |
| 8 | SVM hyperparameter tuning |
| 9 | Final model training |
| 10 | Final evaluation |
| 11 | Ablation study (sensor contribution) |
| 12 | Feature contribution (permutation importance) |
| 13 | Model serialization |
| 14 | Inference test |
| 15 | Quality control |

---

## Dataset

| Property | Value |
|----------|-------|
| File | `data/processed/synthetic_final_cleaned.csv` |
| Type | **SYNTHETIC** |
| Subjects | 500 |
| Measurements per subject | 5 |
| Total rows | 2,500 |
| Features | 15 |
| Target | `characteristic_class` |

### Sensor Features

| Sensor | Channels | Features |
|--------|----------|---------|
| AS7341 (11-channel spectral) | 10 | F1–F8, Clear, NIR |
| TCS34725 (RGB + Clear) | 4 | R, G, B, Clear |
| VL53L1X (Time-of-Flight) | 1 | Distance_mm |

### Target Classes

- `Class_A`, `Class_B`, `Class_C` — **synthetic labels only**
- Do NOT interpret as race, ethnicity, medical diagnosis, or any sensitive category.

---

## Data Preprocessing

- **StandardScaler** embedded in sklearn `Pipeline`
- Scaler fitted **only** on training data — never on full dataset or test set
- No preprocessing leakage

## Subject-Level Splitting

> **CRITICAL**: There are 5 repeated measurements per subject.
> Random row-level splitting would cause data leakage.

**Correct approach used:**
- `GroupShuffleSplit` for train/test split (subject-level)
- `StratifiedGroupKFold` for cross-validation (subjects cannot span folds)
- Subject overlap verified programmatically: `train_subjects ∩ test_subjects = ∅`

---

## SVM

- **Kernel**: RBF (tuned via GridSearchCV)
- **Hyperparameter grid**: C ∈ {0.1, 1, 10, 100}, gamma ∈ {scale, 0.001, 0.01, 0.1, 1}
- **CV**: StratifiedGroupKFold (5 folds, scoring=f1_macro)
- **Probability output**: Platt scaling (not biological probabilities)

---

## Evaluation

Metrics reported:
- Accuracy
- Precision (Macro)
- Recall (Macro)
- F1 (Macro)
- F1 (Weighted)
- Per-class precision, recall, F1, support
- Confusion matrix (raw + normalised)

---

## Ablation Study

7 sensor configurations tested:

| Config | Features |
|--------|---------|
| AS7341 only | 10 |
| TCS34725 only | 4 |
| VL53L1X only | 1 |
| AS7341 + TCS34725 | 14 |
| AS7341 + VL53L1X | 11 |
| TCS34725 + VL53L1X | 5 |
| All sensors | 15 |

Same train/test split used for all configurations (fair comparison).

---

## Model Saving

| Artifact | Path |
|----------|------|
| Trained pipeline | `models/svm_final_pipeline.joblib` |
| Metadata | `models/metadata.json` |

The saved pipeline includes **both** the StandardScaler and SVC classifier.

---

## Inference

```python
from src.inference.predict import load_predictor

predictor = load_predictor()

sensor_reading = {
    "AS7341_F1": 116.16,
    "AS7341_F2": 133.07,
    "AS7341_F3": 150.69,
    "AS7341_F4": 149.69,
    "AS7341_F5": 157.87,
    "AS7341_F6": 157.40,
    "AS7341_F7": 145.84,
    "AS7341_F8": 138.25,
    "AS7341_Clear": 767.93,
    "AS7341_NIR": 266.37,
    "TCS34725_R": 120.30,
    "TCS34725_G": 128.55,
    "TCS34725_B": 102.93,
    "TCS34725_Clear": 442.32,
    "VL53L1X_Distance_mm": 36.54,
}

result = predictor.predict(sensor_reading)
print(result["predicted_class"])    # 'Class_A' / 'Class_B' / 'Class_C'
print(result["probabilities"])      # {'Class_A': 0.xx, 'Class_B': 0.xx, 'Class_C': 0.xx}
```

---

## Project Structure

```
svm-phenotype/
│
├── .venv/                          # Python virtual environment
│
├── data/
│   ├── raw/                        # Original unmodified data
│   ├── processed/                  # Cleaned data for training
│   └── README.md
│
├── notebooks/                      # Jupyter notebooks
│   ├── 01_eda.ipynb
│   ├── 02_model_experiments.ipynb
│   ├── 03_svm_tuning.ipynb
│   └── 04_ablation_study.ipynb
│
├── src/
│   ├── config.py                   # Central configuration
│   ├── data/
│   │   ├── validation.py           # Data integrity checks
│   │   └── splitting.py            # Subject-level splitting
│   ├── features/
│   │   ├── feature_schema.py       # Canonical feature order
│   │   └── preprocessing.py        # Scaler + pipeline builder
│   ├── models/
│   │   ├── baseline.py             # Multi-model comparison
│   │   ├── train_svm.py            # SVM training + CV
│   │   └── tune_svm.py             # Hyperparameter tuning
│   ├── evaluation/
│   │   ├── metrics.py              # Accuracy, F1, confusion matrix
│   │   └── plots.py                # All visualisations
│   └── inference/
│       └── predict.py              # Inference API
│
├── models/
│   ├── svm_final_pipeline.joblib   # Trained pipeline
│   └── metadata.json               # Model metadata
│
├── results/
│   ├── figures/                    # All plots
│   ├── metrics/                    # CSV metric files
│   └── reports/                    # Final ML and audit reports
│
├── tables/                         # Clean presentation tables for thesis
│   ├── dataset_summary.csv
│   ├── baseline_comparison.csv
│   ├── svm_tuning_results.csv
│   ├── ablation_results.csv
│   └── final_metrics.csv
│
├── tests/
│   ├── test_data.py
│   ├── test_features.py
│   ├── test_model.py
│   └── test_inference.py
│
├── run_pipeline.py                 # Full pipeline runner
├── requirements.txt
├── README.md
└── .gitignore
```

---

## Installation

```bash
# Clone the repository
git clone <repo_url>
cd svm-phenotype

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## How to Run

### Full pipeline
```bash
python run_pipeline.py
```

### From a specific phase
```bash
python run_pipeline.py --phase 6
```

### Run only one phase (e.g., ablation study)
```bash
python run_pipeline.py --only 11
```

---

## Testing

```bash
# Run all tests (requires trained model for test_inference.py)
.venv\Scripts\pytest tests/ -v

# Run only data tests (no model required)
.venv\Scripts\pytest tests/test_data.py tests/test_features.py -v
```

---

## Limitations

1. **Synthetic data**: Current results do not validate real phenotype identification.
2. **SVM scalability**: SVM may be slow on large real datasets (consider SGDClassifier).
3. **Class labels**: Synthetic labels have no biological or medical meaning.
4. **No real sensor calibration**: Real sensors will require calibration and noise handling.
5. **Probabilistic output**: SVC probabilities use Platt scaling — these are estimates.

---

## Future Real Data Integration

When the physical IoT device is ready:
1. Collect real sensor measurements using the ESP32-S3 + sensors.
2. Define clear ground-truth labels with appropriate experimental protocol.
3. Obtain participant consent (if required).
4. Anonymise all personal data.
5. Ensure sufficient sample size for statistical validity.
6. Rerun this pipeline on real data.
7. Retune hyperparameters and validate on a real held-out test set.

---

## Reproducibility

- Random seed: `42` (set in `src/config.py`)
- All splits use `random_state=42`
- Pipeline is fully deterministic given the same data and seed

---

*This project is part of an undergraduate thesis at [University]. The ML pipeline is designed
for research and educational purposes only.*
