"""
tune_svm.py
===========
SVM hyperparameter tuning using GridSearchCV with group-aware CV.

The test set NEVER participates in tuning.
Probability output is handled via CalibratedClassifierCV after tuning.
"""

from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import GridSearchCV, StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV

from src.config import (
    N_CV_FOLDS,
    RANDOM_SEED,
    SVM_PARAM_GRID,
    ALL_FEATURES,
    METRICS_DIR,
)
from src.features.preprocessing import get_X_y_groups, build_svm_pipeline


def tune_svm(
    df_train,
    features=ALL_FEATURES,
    param_grid=SVM_PARAM_GRID,
    n_splits: int = N_CV_FOLDS,
    scoring: str = "f1_macro",
    random_state: int = RANDOM_SEED,
) -> Tuple[Pipeline, Dict[str, Any], pd.DataFrame]:
    """
    Tune SVM hyperparameters using GridSearchCV with StratifiedGroupKFold.

    Parameters
    ----------
    df_train : pd.DataFrame
        Training split only (test set must not be used here).
    features : list of str
    param_grid : list of dicts
        Hyperparameter grid.
    n_splits : int
        Number of CV folds.
    scoring : str
        Optimisation metric.
    random_state : int

    Returns
    -------
    best_pipeline : fitted sklearn Pipeline
        Best model (with CalibratedClassifierCV for probability output)
        re-fitted on the full training set.
    best_params : dict
        Best hyperparameters found.
    df_results : pd.DataFrame
        All parameter combinations with CV scores.
    """
    X_train, y_train, groups = get_X_y_groups(df_train, features=features)

    # For GridSearch: use plain SVC (no probability) for speed
    base_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", SVC(random_state=random_state)),
    ])

    cv = StratifiedGroupKFold(n_splits=n_splits)

    grid_search = GridSearchCV(
        estimator=base_pipeline,
        param_grid=param_grid,
        cv=cv,
        scoring=scoring,
        refit=True,
        n_jobs=-1,
        verbose=1,
        return_train_score=False,
    )

    print(f"\nRunning GridSearchCV (scoring={scoring}, folds={n_splits})...")
    grid_search.fit(X_train, y_train, groups=groups)

    best_params = grid_search.best_params_
    best_score = grid_search.best_score_

    print(f"\nBest parameters: {best_params}")
    print(f"Best CV {scoring}: {best_score:.4f}")

    # Now retrain with the best params + CalibratedClassifierCV for probabilities
    clean_params = {
        k.replace("classifier__", ""): v
        for k, v in best_params.items()
    }
    best_pipeline_with_prob = build_svm_pipeline(**clean_params, probability=True)
    best_pipeline_with_prob.fit(X_train, y_train)

    # Build results DataFrame
    cv_results = grid_search.cv_results_
    df_results = pd.DataFrame({
        "params": cv_results["params"],
        "mean_cv_score": cv_results["mean_test_score"],
        "std_cv_score": cv_results["std_test_score"],
        "rank": cv_results["rank_test_score"],
    })
    df_results = df_results.sort_values("rank").reset_index(drop=True)

    # Save tuning results
    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    df_results_flat = df_results.copy()
    params_df = pd.json_normalize(df_results_flat["params"].tolist())
    df_results_flat = pd.concat(
        [params_df, df_results_flat.drop(columns=["params"])], axis=1
    )
    tuning_path = METRICS_DIR / "svm_tuning_results.csv"
    df_results_flat.to_csv(tuning_path, index=False)
    print(f"Tuning results saved -> {tuning_path}")

    return best_pipeline_with_prob, best_params, df_results
