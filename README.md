# RefactAI: Intelligent Technical Debt Prediction System

> **"Predict Technical Debt Before It Becomes a Problem."**

RefactAI is an AI-powered technical debt prediction system designed to analyze software projects and forecast which files or modules are likely to develop technical debt. Unlike traditional linters that merely identify existing syntax and stylistic violations, RefactAI fuses **source code complexity metrics** with **Git temporal churn analytics** using machine learning and **Explainable AI (SHAP)**.

---

## 🚀 Key Features

* **Dual-Domain Feature Extraction:**
  * **Static Code Metrics:** Lines of Code (LOC), Cyclomatic Complexity, Functions, Classes, and Dependency Coupling.
  * **Temporal Git Metrics:** Commit frequency, Code churn (insertions/deletions), Developer entropy (author counts), and Prior bug-fix repairs.
* **Predictive ML Classifiers & Regressors:**
  * Evaluates and compares **Logistic Regression**, **Decision Trees**, **Random Forest**, and **XGBoost / Gradient Boosting**.
* **Explainable AI (SHAP):**
  * Breaks down the exact factors driving high risk scores for individual files (e.g. *Why does `payment_orchestrator.py` have an 84% debt risk?*).
* **Automated Commented Code Solutions:**
  * Synthesizes refactored code fixes directly addresses high cyclomatic complexity, coupling, and modular design.
* **Authorized PDF Audit Reports:**
  * Generates professional, compliance-ready PDF reports with embedded risk charts, metrics breakdowns, and authorized security branding.
* **Supabase Cloud Backend Integration:**
  * Real-time persistence for consultation inquiries and repository audit logs with dual-mode zero-loss fallback.
* **Responsive Project Health Dashboard:**
  * Desktop- and mobile-optimized dark-glass UI with radial technical debt gauges, interactive hotspot treemaps, search & filter controls, and side-by-side model benchmarks.
* **Targeted Refactoring Recommendations:**
  * Generates prioritized engineering actions directly from the highest SHAP risk drivers.

---

## 📁 Repository Structure

```
ReFactAi/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py             # FastAPI routes (/api/analyze, /api/health, /api/models, /api/sample)
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py             # App settings, paths, and configurations
│   │   ├── engine/
│   │   │   ├── __init__.py
│   │   │   ├── code_analyzer.py      # AST complexity, LOC, functions, and dependency extractor
│   │   │   ├── git_miner.py          # Git repository clone, commit churn, author entropy & bug fix miner
│   │   │   ├── model_predictor.py    # ML models (LR, DT, RF, XGBoost) & SHAP explainability
│   │   │   └── feature_builder.py    # Pipeline coordinator connecting code + git metrics with ML
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py            # Pydantic data schemas
│   │   └── main.py                   # FastAPI server with CORS and static UI mounting
│   ├── requirements.txt              # Python dependencies
│   └── run.py                        # Server startup script
│
├── frontend/
│   ├── index.html                    # Responsive web dashboard
│   ├── css/
│   │   └── style.css                 # Dark glassmorphic design system
│   └── js/
│       └── app.js                    # Interactive controller, SHAP drawer, table sorting & filtering
│
└── README.md                         # Project documentation
```

---

## 🛠️ Quickstart & Local Installation

### 1. Prerequisites
* Python 3.10+
* Git installed

### 2. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Launch the Application
```bash
python run.py
```

Open your browser at:
* **Web Application Dashboard:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interactive API Documentation (Swagger):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🔬 Model Comparison Suite

RefactAI provides comparative benchmarks across four algorithmic paradigms:

| Model | Paradigm | Strength | Typical Role |
| :--- | :--- | :--- | :--- |
| **Logistic Regression** | Linear / Parametric | High transparency, fast inference | Baseline reference |
| **Decision Tree** | Rule-Based | Hierarchical threshold splitting | Single-path inspectability |
| **Random Forest** | Ensemble Bagging | Resilient to metric collinearity & overfitting | Recommended Default |
| **XGBoost / GBDT** | Gradient Boosting | State-of-the-art tabular accuracy | High-complexity analysis |

---

## 📌 Status
* **Proposed System:** RefactAI is an active research and development system. Accuracy and benchmark metrics reflect simulated empirical training data until full cross-validation runs on benchmark defect repositories are finalized.
