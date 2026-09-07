# Data Leakage Audit

**Project**: IoT Multi-Sensor Phenotype Classification  
**Status**: PASSED (Zero Data Leakage)

---

## 1. Split Isolation
- **Splitting Strategy**: Subject-level `GroupShuffleSplit` (80% train / 20% test).
- **Train Subjects**: 400 unique subjects (2,000 observations)
- **Test Subjects**: 100 unique subjects (500 observations)
- **Subject Overlap**: `set()` (0 subjects appear in both train and test)
- **Cross-Validation**: 5-Fold `StratifiedGroupKFold` on training data only.

## 2. Preprocessing & Feature Isolation
- **Feature Scaling**: `StandardScaler` is enclosed inside an `sklearn.pipeline.Pipeline`.
- **Fit vs Transform**: The scaler is fitted strictly on the training fold/split; the test set is only transformed.
- **Identifier Exclusion**: `subject_id`, `measurement_id`, and `measurement_index` are strictly stripped from feature matrices.
- **Target Exclusion**: `characteristic_class` is strictly isolated as the target vector $y$.

## 3. Evaluation & Tuning Integrity
- **Hyperparameter Tuning**: `GridSearchCV` evaluated solely via 5-Fold `StratifiedGroupKFold` on the training partition.
- **Test Set Isolation**: The test set remained completely untouched until final model evaluation.

| Audit Check | Status | Verification Detail |
| :--- | :---: | :--- |
| Train/Test Subject Overlap | PASS | Intersection is strictly empty |
| Scaler Fitting | PASS | Fitted exclusively on train data via Pipeline |
| Hyperparameter Tuning Leakage | PASS | Evaluated solely within train split CV |
| Target Leakage | PASS | Excluded from feature space |
| Metadata Leakage | PASS | Excluded from feature space |
| Measurement Grouping | PASS | GroupShuffleSplit and StratifiedGroupKFold enforced |
