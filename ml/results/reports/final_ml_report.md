# Final ML Report — SVM Phenotype Pipeline
_Generated: 2026-09-06 18:56:09_

---

## 1. Dataset Summary
- File: `data/processed/synthetic_final_cleaned.csv`
- Rows: 2500
- Columns: 19
- Subjects: 500
- Classes: [('Class_A', 865), ('Class_C', 840), ('Class_B', 795)]
- **IMPORTANT: Dataset is SYNTHETIC — for pipeline development only.**

## 2. Data Validation
- All required columns present: ✓
- No missing values: ✓
- No infinite values: ✓
- No duplicate rows: ✓
- Validation: **PASSED**

## 3. EDA Summary
- 15 sensor features from AS7341, TCS34725, VL53L1X
- 3 balanced classes (Class_A, Class_B, Class_C)
- 5 measurements per subject (no missing measurements)
- Correlation heatmap and feature distributions saved in `results/figures/`

## 4. Feature List
```
AS7341_F1
AS7341_F2
AS7341_F3
AS7341_F4
AS7341_F5
AS7341_F6
AS7341_F7
AS7341_F8
AS7341_Clear
AS7341_NIR
TCS34725_R
TCS34725_G
TCS34725_B
TCS34725_Clear
VL53L1X_Distance_mm
```

## 5. Train/Test Methodology
- **Subject-level splitting** using `GroupShuffleSplit` (20% test subjects)
- Train: 400 subjects, 2000 rows
- Test:  100 subjects, 500 rows
- Subject overlap: **EMPTY SET** (verified programmatically)

## 6. Leakage Prevention
- StandardScaler fitted ONLY on training data (embedded in Pipeline)
- Test set NEVER used for tuning, feature selection, or threshold selection
- Group-aware CV: `StratifiedGroupKFold` (subjects cannot span folds)

## 7. SVM Baseline
- Kernel: RBF, C=1.0, gamma=scale
- Accuracy: 0.7780
- F1 Macro: 0.7526
- F1 Weighted: 0.7791

## 8. Hyperparameter Tuning
- Method: GridSearchCV with StratifiedGroupKFold (5 folds)
- Scoring: f1_macro
- Best params: {'classifier__C': 1, 'classifier__kernel': 'linear'}
- Best CV F1 macro: 0.6980 ± 0.0404

## 9. Final SVM Evaluation
- Accuracy:         0.8000
- Precision Macro:  0.7821
- Recall Macro:     0.7894
- F1 Macro:         0.7841
- F1 Weighted:      0.8030

## 10. Ablation Study
| Config | Accuracy | F1 Macro | F1 Weighted |
|--------|----------|----------|-------------|
| AS7341_TCS34725 | 0.8120 | 0.7984 | 0.8143 |
| All_sensors | 0.8000 | 0.7841 | 0.8030 |
| TCS34725_VL53L1X | 0.6920 | 0.6848 | 0.6945 |
| AS7341_VL53L1X | 0.7080 | 0.6806 | 0.7102 |
| TCS34725_only | 0.6800 | 0.6731 | 0.6826 |
| AS7341_only | 0.6920 | 0.6598 | 0.6933 |
| VL53L1X_only | 0.4560 | 0.3728 | 0.4253 |

## 11. Feature Contribution
- Method: Permutation Importance (30 repeats, scoring=f1_macro)
- Importance measures mean decrease in F1 when a feature is randomly shuffled

Top 5 features by permutation importance:
| Feature | Importance Mean | Std |
|---------|----------------|-----|
| TCS34725_B | 0.1423 | 0.0174 |
| AS7341_F1 | 0.1204 | 0.0155 |
| TCS34725_R | 0.1163 | 0.0118 |
| AS7341_F5 | 0.0770 | 0.0131 |
| TCS34725_G | 0.0713 | 0.0132 |

## 12. Model Artifacts
- Pipeline: `models/svm_final_pipeline.joblib`
- Metadata: `models/metadata.json`

## 13. Inference Example
```python
from src.inference.predict import load_predictor
predictor = load_predictor()
result = predictor.predict({
    "AS7341_F1": 116.16, "AS7341_F2": 133.07, ...
})
# result['predicted_class'] → 'Class_A' / 'Class_B' / 'Class_C'
```

## 14. Limitations
- Dataset is SYNTHETIC — results do not validate real IoT device performance.
- Class labels (Class_A/B/C) are abstract; not biological categories.
- SVM probabilities use Platt scaling; they are estimates, not biological probabilities.

## 15. Next Steps for Real Data
- Collect real sensor measurements from participants with valid ground-truth labels.
- Follow ethical guidelines and obtain participant consent.
- Anonymise all personal data before storage.
- Rerun this pipeline on real data; update hyperparameters as needed.
- Validate model on a held-out real-world test set.