from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from keras.preprocessing import image
import io
from PIL import Image
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Disable eager execution to reduce memory usage
tf.compat.v1.disable_eager_execution()

# Set memory growth to avoid OOM issues
physical_devices = tf.config.list_physical_devices('GPU')
if physical_devices:
    try:
        for device in physical_devices:
            tf.config.experimental.set_memory_growth(device, True)
        logger.info(f"Memory growth enabled on {len(physical_devices)} GPU devices")
    except Exception as e:
        logger.warning(f"Error setting memory growth: {e}")

# Load the model lazily - only when needed
model = None

def load_model_if_needed():
    global model
    if model is None:
        logger.info("Loading model...")
        try:
            model = tf.keras.models.load_model("model.h5", compile=False)
            model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise


# Define class labels
class_labels = [
    'Main Gate', 'PU Block', 'Architecture Block',
    'Cross road', 'Block 1', 'Students Square',
    'Open auditorium', 'Block 4', 'Xpress Cafe',
    'Block 6', 'Amphi theater'
]

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Render to detect the service"""
    return jsonify({'status': 'healthy'}), 200

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    try:
        # Load model if not already loaded
        load_model_if_needed()

        file = request.files['image']

        # Read and preprocess the image
        img = Image.open(io.BytesIO(file.read()))
        img = img.resize((224, 224))
        img_array = image.img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Make prediction
        logger.info("Running prediction")
        predictions = model.predict(img_array)
        predicted_class = np.argmax(predictions, axis=1)[0]

        # Create response
        response = {
            'predicted_class': class_labels[predicted_class],
            'probabilities': {
                label: float(prob)
                for label, prob in zip(class_labels, predictions[0].tolist())
            }
        }

        return jsonify(response)
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)