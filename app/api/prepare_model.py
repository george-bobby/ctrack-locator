"""
Script to prepare the model for deployment by converting it to TensorFlow Lite format.
This should be run before deployment to ensure the TFLite model is available.
"""

import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    # Check if the TFLite model already exists
    if os.path.exists("model.tflite"):
        logger.info("TensorFlow Lite model already exists")
        tflite_size = os.path.getsize("model.tflite") / (1024 * 1024)
        logger.info(f"TFLite model size: {tflite_size:.2f} MB")
        return
    
    # Check if the H5 model exists
    if not os.path.exists("model.h5"):
        logger.error("H5 model not found. Please ensure model.h5 is in the current directory.")
        return
    
    # Import the conversion function and convert the model
    logger.info("Converting H5 model to TensorFlow Lite format...")
    from convert_to_tflite import convert_h5_to_tflite
    success = convert_h5_to_tflite("model.h5", "model.tflite")
    
    if success:
        logger.info("Model conversion completed successfully")
    else:
        logger.error("Model conversion failed")

if __name__ == "__main__":
    main()
