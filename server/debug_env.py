#!/usr/bin/env python3
"""
Debug script to check Python environment and package compatibility
"""
import sys
print(f"Python version: {sys.version}")
print(f"Python version info: {sys.version_info}")

# Try importing packages one by one
packages_to_test = [
    "flask",
    "flask_cors", 
    "gunicorn",
    "numpy",
    "PIL",
    "cv2",
    "inference"
]

for package in packages_to_test:
    try:
        __import__(package)
        print(f"✅ {package} - OK")
    except ImportError as e:
        print(f"❌ {package} - Failed: {e}")

print("\nEnvironment check complete!")
