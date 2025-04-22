import tensorflow as tf
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_h5_to_tflite(h5_model_path, tflite_model_path):
    """
    Convert a Keras .h5 model to TensorFlow Lite format
    """
    try:
        # Load the model
        logger.info(f"Loading model from {h5_model_path}")
        model = tf.keras.models.load_model(h5_model_path, compile=False)
        
        # Convert the model to TensorFlow Lite format
        logger.info("Converting model to TensorFlow Lite format")
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        
        # Apply optimizations
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        
        # Convert the model
        tflite_model = converter.convert()
        
        # Save the model
        logger.info(f"Saving TensorFlow Lite model to {tflite_model_path}")
        with open(tflite_model_path, 'wb') as f:
            f.write(tflite_model)
        
        # Print size comparison
        h5_size = os.path.getsize(h5_model_path) / (1024 * 1024)
        tflite_size = os.path.getsize(tflite_model_path) / (1024 * 1024)
        logger.info(f"Original model size: {h5_size:.2f} MB")
        logger.info(f"TFLite model size: {tflite_size:.2f} MB")
        logger.info(f"Size reduction: {(1 - tflite_size/h5_size) * 100:.2f}%")
        
        return True
    except Exception as e:
        logger.error(f"Error converting model: {e}")
        return False

if __name__ == "__main__":
    h5_model_path = "model.h5"
    tflite_model_path = "model.tflite"
    
    success = convert_h5_to_tflite(h5_model_path, tflite_model_path)
    
    if success:
        logger.info("Conversion completed successfully")
    else:
        logger.error("Conversion failed")
