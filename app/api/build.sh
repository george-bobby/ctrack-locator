#!/bin/bash
# Install dependencies
pip install -r requirements.txt

# Print TensorFlow version for debugging
python -c "import tensorflow as tf; print(f'TensorFlow version: {tf.__version__}')"

# Convert model to TFLite format
python prepare_model.py
