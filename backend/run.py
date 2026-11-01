import uvicorn
import os
import sys

# Ensure backend root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

if __name__ == "__main__":
    print("=" * 60)
    print("  RefactAI: Code Health & Technical Debt Analysis System")
    print("  Tagline: Automated Code Health & Technical Debt Intelligence")
    print("=" * 60)
    print("  [+] Starting Web Application Server on http://127.0.0.1:8000")
    print("  [+] API Swagger Documentation on http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
