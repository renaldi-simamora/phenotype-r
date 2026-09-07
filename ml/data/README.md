# Data Directory

This directory contains all datasets for the SVM Phenotype ML pipeline.

## Structure

```
data/
├── raw/
│   └── synthetic_raw.csv        # Original unmodified dataset
│
├── processed/
│   └── synthetic_final_cleaned.csv   # Cleaned dataset used for training
│
└── README.md                    # This file
```

## Dataset Description

| Property | Value |
|----------|-------|
| Subjects | 500 (synthetic) |
| Measurements per subject | 5 |
| Total rows | 2,500 |
| Features | 15 sensor channels |
| Target | `characteristic_class` |

## Sensors & Features

| Sensor | Features |
|--------|----------|
| AS7341 (spectral) | F1, F2, F3, F4, F5, F6, F7, F8, Clear, NIR |
| TCS34725 (RGB) | R, G, B, Clear |
| VL53L1X (ToF) | Distance_mm |

## Target Variable

`characteristic_class` — **SYNTHETIC LABELS ONLY**
- `Class_A`
- `Class_B`
- `Class_C`

> ⚠️ **IMPORTANT**: These are abstract labels for pipeline development.
> They do NOT represent race, ethnicity, nationality, medical diagnosis,
> or any sensitive demographic category.

## Data Integrity Rules

- `data/processed/synthetic_final_cleaned.csv` is NEVER modified during training.
- All transformations produce new files.
- Raw and processed data are kept separate.
- The scaler is NEVER fitted on the full dataset — only on training subjects.

## Disclaimer

This dataset is **100% synthetic**, generated programmatically for the purpose
of developing and testing the ML pipeline. It does NOT contain real sensor
measurements from real participants.

Real data collection will require:
- Physical IoT device (ESP32-S3 + AS7341 + TCS34725 + VL53L1X)
- Real participants with valid ground-truth labels
- Ethical approval where required
- Participant consent
- Proper anonymisation
