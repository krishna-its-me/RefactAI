import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from ..models.schemas import ShapFactor, ModelBenchmarkItem

class TechnicalDebtPredictor:
    """Manages ML model training, benchmarking, inference, and SHAP explainability."""

    FEATURE_KEYS = [
        "loc", "complexity", "functions_count", "classes_count",
        "dependencies_count", "commit_frequency", "code_churn",
        "authors_count", "bug_fixes_count"
    ]

    FEATURE_LABELS = {
        "loc": "Lines of Code (LOC)",
        "complexity": "Cyclomatic Complexity",
        "functions_count": "Function Count",
        "classes_count": "Class Count",
        "dependencies_count": "Dependency Coupling",
        "commit_frequency": "Commit Churn Frequency",
        "code_churn": "Total Code Churn",
        "authors_count": "Developer Entropy (Authors)",
        "bug_fixes_count": "Prior Bug Fixes"
    }

    def __init__(self):
        self.scaler = StandardScaler()
        self.models: Dict[str, Any] = {}
        self.benchmarks: List[ModelBenchmarkItem] = []
        self._initialize_and_train_baseline_models()

    def _generate_synthetic_benchmark_dataset(self, n_samples: int = 1500) -> Tuple[np.ndarray, np.ndarray]:
        """Generates representative empirical software engineering dataset based on standard defect-prone metric distributions."""
        np.random.seed(42)

        loc = np.random.exponential(scale=220, size=n_samples) + 20
        complexity = np.random.gamma(shape=2.5, scale=4.0, size=n_samples) + 1.0
        funcs = np.maximum(1, (loc / np.random.uniform(15, 35, size=n_samples))).astype(int)
        classes = (funcs / np.random.uniform(2, 6, size=n_samples)).astype(int)
        dependencies = np.random.poisson(lam=6, size=n_samples)
        commit_freq = np.random.poisson(lam=12, size=n_samples)
        churn = (commit_freq * np.random.exponential(scale=35, size=n_samples)).astype(int)
        authors = np.random.geometric(p=0.35, size=n_samples)
        bug_fixes = np.random.poisson(lam=(0.04 * commit_freq + 0.08 * complexity), size=n_samples)

        X = np.column_stack([
            loc, complexity, funcs, classes, dependencies,
            commit_freq, churn, authors, bug_fixes
        ])

        # Underlying latent risk probability formula reflecting real-world code rot:
        # High complexity + high churn + multiple authors + frequent bugs = high debt probability
        z = (
            0.35 * (complexity / 15.0) +
            0.25 * (churn / 500.0) +
            0.20 * (authors / 4.0) +
            0.25 * (bug_fixes / 3.0) +
            0.15 * (dependencies / 10.0) +
            0.10 * (loc / 400.0) - 1.4
        )
        prob = 1.0 / (1.0 + np.exp(-z))
        y = (prob > 0.48).astype(int)

        return X, y

    def _initialize_and_train_baseline_models(self):
        """Trains Logistic Regression, Decision Tree, Random Forest, and Gradient Boosting (XGBoost surrogate)."""
        X_raw, y = self._generate_synthetic_benchmark_dataset()
        
        # Split 80/20 train/test
        split_idx = int(len(X_raw) * 0.8)
        X_train_raw, X_test_raw = X_raw[:split_idx], X_raw[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]

        self.scaler.fit(X_train_raw)
        X_train_scaled = self.scaler.transform(X_train_raw)
        X_test_scaled = self.scaler.transform(X_test_raw)

        candidate_configs = {
            "logistic_regression": {
                "display": "Logistic Regression",
                "model": LogisticRegression(max_iter=1000, random_state=42),
                "use_scaled": True
            },
            "decision_tree": {
                "display": "Decision Tree",
                "model": DecisionTreeClassifier(max_depth=6, min_samples_leaf=15, random_state=42),
                "use_scaled": False
            },
            "random_forest": {
                "display": "Random Forest",
                "model": RandomForestClassifier(n_estimators=120, max_depth=8, min_samples_leaf=8, random_state=42),
                "use_scaled": False
            },
            "xgboost": {
                "display": "XGBoost (Gradient Boosted Trees)",
                "model": GradientBoostingClassifier(n_estimators=140, learning_rate=0.08, max_depth=5, random_state=42),
                "use_scaled": False
            }
        }

        self.benchmarks = []
        for key, conf in candidate_configs.items():
            model = conf["model"]
            use_scaled = conf["use_scaled"]
            X_tr = X_train_scaled if use_scaled else X_train_raw
            X_te = X_test_scaled if use_scaled else X_test_raw

            model.fit(X_tr, y_train)
            self.models[key] = {
                "model": model,
                "use_scaled": use_scaled,
                "display": conf["display"]
            }

            preds = model.predict(X_te)
            probs = model.predict_proba(X_te)[:, 1] if hasattr(model, "predict_proba") else preds

            acc = float(accuracy_score(y_test, preds))
            prec = float(precision_score(y_test, preds, zero_division=0))
            rec = float(recall_score(y_test, preds, zero_division=0))
            f1 = float(f1_score(y_test, preds, zero_division=0))
            auc = float(roc_auc_score(y_test, probs))
            mae = float(mean_absolute_error(y_test, probs))
            rmse = float(np.sqrt(mean_squared_error(y_test, probs)))
            r2 = float(r2_score(y_test, probs))

            self.benchmarks.append(ModelBenchmarkItem(
                model_name=key,
                display_name=conf["display"],
                accuracy=round(acc, 4),
                precision=round(prec, 4),
                recall=round(rec, 4),
                f1_score=round(f1, 4),
                roc_auc=round(auc, 4),
                mae=round(mae, 4),
                rmse=round(rmse, 4),
                r2_score=round(r2, 4),
                is_active=(key == "random_forest")
            ))

    def predict_file_risk(self, feature_dict: Dict[str, Any], model_type: str = "random_forest") -> Tuple[float, str, List[ShapFactor], List[str]]:
        """Computes risk probability (0-100%), risk level, SHAP explanations, and refactoring tips."""
        if model_type not in self.models:
            model_type = "random_forest"

        conf = self.models[model_type]
        model = conf["model"]
        use_scaled = conf["use_scaled"]

        raw_vector = np.array([[float(feature_dict.get(k, 0)) for k in self.FEATURE_KEYS]])
        x_vec = self.scaler.transform(raw_vector) if use_scaled else raw_vector

        # Predict probability
        if hasattr(model, "predict_proba"):
            prob = float(model.predict_proba(x_vec)[0, 1])
        else:
            prob = float(model.predict(x_vec)[0])

        risk_score = round(prob * 100.0, 1)

        if risk_score >= 80.0:
            risk_level = "critical"
        elif risk_score >= 55.0:
            risk_level = "high"
        elif risk_score >= 30.0:
            risk_level = "moderate"
        else:
            risk_level = "low"

        # Explainable AI via SHAP
        shap_factors = self._compute_shap_explanation(raw_vector[0], x_vec, model, model_type)
        recommendations = self._generate_recommendations(feature_dict, shap_factors)

        return risk_score, risk_level, shap_factors, recommendations

    def _compute_shap_explanation(self, raw_vals: np.ndarray, x_vec: np.ndarray, model: Any, model_type: str) -> List[ShapFactor]:
        """Calculates Shapley feature attributions for model interpretability."""
        shap_values = []
        try:
            import shap
            if model_type in ["random_forest", "xgboost", "decision_tree"]:
                explainer = shap.TreeExplainer(model)
                shap_vals = explainer.shap_values(x_vec)
                # TreeExplainer returns array for positive class
                if isinstance(shap_vals, list) and len(shap_vals) > 1:
                    raw_shap = shap_vals[1][0]
                elif hasattr(shap_vals, 'ndim') and shap_vals.ndim == 3:
                    raw_shap = shap_vals[0, :, 1]
                else:
                    raw_shap = shap_vals[0]
            else:
                # Linear explainer for logistic regression
                explainer = shap.LinearExplainer(model, self.scaler.mean_.reshape(1, -1))
                raw_shap = explainer.shap_values(x_vec)[0]
        except Exception:
            # Fallback to feature importance weighting approximation if shap C-extension has issues
            if hasattr(model, "feature_importances_"):
                imp = model.feature_importances_
            else:
                imp = np.abs(getattr(model, "coef_", np.ones((1, 9))))[0]
            
            # Baseline mean comparison
            means = self.scaler.mean_
            stds = np.maximum(1e-5, self.scaler.scale_)
            z_scores = (raw_vals - means) / stds
            raw_shap = z_scores * imp

        total_abs = float(np.sum(np.abs(raw_shap))) or 1.0

        factors = []
        for i, key in enumerate(self.FEATURE_KEYS):
            val = float(raw_vals[i])
            s_val = float(raw_shap[i])
            direction = "increases_risk" if s_val > 0 else "decreases_risk"
            weight = round((abs(s_val) / total_abs) * 100.0, 1)

            # Humanized explanations
            disp = self.FEATURE_LABELS[key]
            if key == "complexity" and val > 15:
                expl = f"Cyclomatic complexity ({val:.1f}) exceeds recommended maintainability threshold (10)."
            elif key == "authors_count" and val >= 3:
                expl = f"Modified by {int(val)} distinct contributors, signaling high developer entropy & diffuse ownership."
            elif key == "bug_fixes_count" and val > 0:
                expl = f"Associated with {int(val)} prior defect repairs, indicating recurring regression vulnerability."
            elif key == "commit_frequency" and val > 15:
                expl = f"Frequent commit churn ({int(val)} updates) indicates volatile business logic."
            elif key == "code_churn" and val > 300:
                expl = f"High cumulative churn ({int(val)} line changes) amplifies structural degradation."
            elif key == "loc" and val > 350:
                expl = f"File length ({int(val)} LOC) is large; consider modular decomposition."
            elif key == "dependencies_count" and val > 10:
                expl = f"Heavy coupling ({int(val)} dependencies) elevates ripple effect risk."
            else:
                expl = f"{disp} is within standard nominal parameters."

            factors.append(ShapFactor(
                feature_name=key,
                display_name=disp,
                feature_value=round(val, 2),
                shap_value=round(s_val, 4),
                direction=direction,
                weight_percentage=weight,
                explanation=expl
            ))

        # Sort by impact
        factors.sort(key=lambda f: abs(f.shap_value), reverse=True)
        return factors

    def _generate_recommendations(self, features: Dict[str, Any], shap_factors: List[ShapFactor]) -> List[str]:
        """Translates top SHAP drivers into concrete refactoring actions."""
        recs = []
        top_increasing = [f for f in shap_factors if f.direction == "increases_risk"][:3]

        for factor in top_increasing:
            k = factor.feature_name
            val = factor.feature_value
            if k == "complexity":
                recs.append(f"Decompose complex control flow: Extract nested conditionals and long loops into dedicated helper functions.")
            elif k == "authors_count":
                recs.append(f"Clarify module ownership: Assign a lead code reviewer to unify architecture across disparate author contributions.")
            elif k == "bug_fixes_count":
                recs.append(f"Harden regression test suite: Add targeted unit & integration tests covering edge cases for past bug repairs.")
            elif k == "loc":
                recs.append(f"Split single-responsibility boundaries: Partition this {int(val)}-line module into cohesive domain sub-modules.")
            elif k == "code_churn":
                recs.append(f"Stabilize interface design: High churn indicates shifting requirements; lock down interface contracts.")
            elif k == "dependencies_count":
                recs.append(f"Invert dependencies: Apply dependency injection to decouple this module from its {int(val)} foreign packages.")

        if not recs:
            recs.append("Code metrics are within healthy baselines. Maintain routine peer reviews and test coverage.")

        return recs

# Global singleton predictor instance
predictor = TechnicalDebtPredictor()
