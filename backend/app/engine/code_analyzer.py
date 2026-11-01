import os
import re
from pathlib import Path
from typing import Dict, Any

class CodeAnalyzer:
    """Extracts static code quality and structural complexity metrics from source files."""

    LANGUAGE_EXTENSIONS = {
        ".py": "Python",
        ".js": "JavaScript",
        ".jsx": "JavaScript (React)",
        ".ts": "TypeScript",
        ".tsx": "TypeScript (React)",
        ".java": "Java",
        ".cpp": "C++",
        ".c": "C",
        ".cs": "C#",
        ".go": "Go",
        ".rb": "Ruby",
        ".php": "PHP",
        ".rs": "Rust",
        ".kt": "Kotlin",
        ".swift": "Swift"
    }

    @classmethod
    def is_supported_code_file(cls, path: str) -> bool:
        ext = os.path.splitext(path)[1].lower()
        # Avoid minified or vendor files
        if any(ignored in path.lower() for ignored in ["node_modules", "vendor", ".min.", "dist", "build", ".git", "venv", ".venv", "__pycache__"]):
            return False
        return ext in cls.LANGUAGE_EXTENSIONS

    @classmethod
    def get_language(cls, path: str) -> str:
        ext = os.path.splitext(path)[1].lower()
        return cls.LANGUAGE_EXTENSIONS.get(ext, "Unknown")

    @classmethod
    def analyze_file_content(cls, file_path: str, content: str) -> Dict[str, Any]:
        """Calculates LOC, functions, classes, dependencies, and cyclomatic complexity."""
        lines = content.splitlines()
        loc = len(lines)
        blank_lines = sum(1 for line in lines if not line.strip())
        comment_lines = sum(1 for line in lines if line.strip().startswith(("#", "//", "/*", "*")))
        sloc = max(1, loc - blank_lines - comment_lines)

        language = cls.get_language(file_path)

        # Regex patterns for functions & classes across common languages
        func_patterns = [
            r'^\s*def\s+[a-zA-Z0-9_]+',              # Python
            r'^\s*(?:async\s+)?function\s+[a-zA-Z0-9_]+', # JS/TS
            r'^\s*(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+[a-zA-Z0-9_]+\s*\(', # Java/C#/C++
            r'^\s*(?:const|let|var)\s+[a-zA-Z0-9_]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>', # Arrow functions
            r'^\s*func\s+(?:\([^)]+\)\s+)?[a-zA-Z0-9_]+', # Go
            r'^\s*fn\s+[a-zA-Z0-9_]+'                # Rust
        ]

        class_patterns = [
            r'^\s*class\s+[a-zA-Z0-9_]+',            # Python, JS, Java, C#, etc.
            r'^\s*interface\s+[a-zA-Z0-9_]+',        # TS, Java, C#
            r'^\s*struct\s+[a-zA-Z0-9_]+',           # Go, C, C++, Rust
            r'^\s*enum\s+[a-zA-Z0-9_]+'              # TS, Java, C#
        ]

        import_patterns = [
            r'^\s*(?:import|from)\s+[\w.]+',         # Python, JS/TS
            r'^\s*#include\s+["<][^">]+[">]',        # C/C++
            r'^\s*package\s+[\w.]+',                 # Java, Go
            r'^\s*use\s+[\w:]+'                      # Rust, PHP
        ]

        funcs = sum(1 for line in lines if any(re.search(pat, line) for pat in func_patterns))
        classes = sum(1 for line in lines if any(re.search(pat, line) for pat in class_patterns))
        dependencies = sum(1 for line in lines if any(re.search(pat, line) for pat in import_patterns))

        # Heuristic Cyclomatic Complexity estimate based on branching tokens
        branch_tokens = [
            r'\bif\b', r'\belse\s+if\b', r'\belif\b', r'\bfor\b',
            r'\bwhile\b', r'\bcase\b', r'\bcatch\b', r'\bexcept\b',
            r'&&', r'\|\|', r'\band\b', r'\bor\b', r'\?\s*[^:]+\s*:'
        ]
        decision_points = sum(len(re.findall(token, content)) for token in branch_tokens)
        # Base complexity is 1 + decision points per function or baseline
        complexity = round(1.0 + (decision_points / max(1, funcs if funcs > 0 else 1)), 2)

        return {
            "file_path": file_path,
            "language": language,
            "loc": loc,
            "sloc": sloc,
            "complexity": min(round(complexity, 2), 65.0), # cap extreme outliers
            "functions_count": funcs,
            "classes_count": classes,
            "dependencies_count": dependencies,
        }
