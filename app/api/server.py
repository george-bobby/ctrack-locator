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

# Configure TensorFlow to use less memory
tf.config.set_visible_devices([], 'GPU')  # Hide GPU devices
tf.config.threading.set_intra_op_parallelism_threads(1)
tf.config.threading.set_inter_op_parallelism_threads(1)

# Limit TensorFlow memory usage
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        logger.info(f"Memory growth enabled on {len(gpus)} GPU devices")
    except Exception as e:
        logger.warning(f"Error setting memory growth: {e}")

# Load the model lazily - only when needed
model = None

def load_model_if_needed():
    global model
    if model is None:
        logger.info("Loading model...")
        try:
            # Set memory constraints before loading model
            gpus = tf.config.list_physical_devices('GPU')
            if not gpus:
                logger.info("No GPUs available, using CPU only")

            # Load with memory-efficient settings
            model = tf.keras.models.load_model("model.h5", compile=False)
            model.compile(
                optimizer=tf.keras.optimizers.legacy.Adam(learning_rate=0.001),
                loss="categorical_crossentropy",
                metrics=["accuracy"]
            )
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

        # Make prediction with memory cleanup
        logger.info("Running prediction")
        with tf.device('/CPU:0'):  # Force CPU usage
            predictions = model.predict(img_array, batch_size=1)

        predicted_class = np.argmax(predictions, axis=1)[0]

        # Create response with minimal memory usage
        response = {
            'predicted_class': class_labels[predicted_class],
            'probabilities': {}
        }

        # Add top 3 probabilities only to save memory
        top_indices = np.argsort(predictions[0])[-3:][::-1]
        for idx in top_indices:
            response['probabilities'][class_labels[idx]] = float(predictions[0][idx])

        return jsonify(response)
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)