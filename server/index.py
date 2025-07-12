from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
import io
from PIL import Image
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MODEL_PATH = "models/quantized.tflite"

# Define class labels
CLASS_LABELS = [
    'Main Gate', 'PU Block', 'Architecture Block',
    'Cross road', 'Block 1', 'Students Square',
    'Open auditorium', 'Block 4', 'Xpress Cafe',
    'Block 6', 'Amphi theater'
]

# Load TFLite model
try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/predict', methods=['POST'])
def predict():
    # Check if file was uploaded
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']

    # Validate file
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file format'}), 400

    # Check file size
    file.seek(0, os.SEEK_END)
    file_length = file.tell()
    file.seek(0)
    if file_length > MAX_FILE_SIZE:
        return jsonify({'error': 'File too large'}), 400

    try:
        # Read and preprocess the image
        img = Image.open(io.BytesIO(file.read()))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img = img.resize((224, 224))
        img_array = image.img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

        # Make prediction with TFLite interpreter
        interpreter.set_tensor(input_details[0]['index'], img_array)
        interpreter.invoke()
        predictions = interpreter.get_tensor(output_details[0]['index'])[0]

        predicted_class_idx = np.argmax(predictions)
        top3_indices = np.argsort(predictions)[-3:][::-1]

        # Create response
        response = {
            'predicted_class': CLASS_LABELS[predicted_class_idx],
            'confidence': float(predictions[predicted_class_idx]),
            'top_predictions': {
                CLASS_LABELS[i]: float(predictions[i])
                for i in top3_indices
            },
            'all_probabilities': {
                label: float(prob)
                for label, prob in zip(CLASS_LABELS, predictions.tolist())
            }
        }

        return jsonify(response)

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return jsonify({'error': 'Error processing image', 'details': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'classes_loaded': len(CLASS_LABELS)
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
