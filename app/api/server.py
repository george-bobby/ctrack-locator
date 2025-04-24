from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import io
from PIL import Image
import os
import logging
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Completely disable CORS by allowing all origins
CORS(app, resources={r"/*": {"origins": "*"}})

# CORS decorator for all routes
def cors_headers(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        resp = make_response(f(*args, **kwargs))
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        return resp
    return decorated_function

# TFLite model and interpreter
interpreter = None

def load_tflite_model_if_needed():
    """Load the TensorFlow Lite model if it's not already loaded"""
    global interpreter
    if interpreter is None:
        try:
            logger.info("Loading TensorFlow Lite model...")
            # Check if TFLite model exists, if not, convert it
            if not os.path.exists("model.tflite"):
                logger.info("TFLite model not found, converting from H5...")
                from convert_to_tflite import convert_h5_to_tflite
                convert_h5_to_tflite("model.h5", "model.tflite")

            # Load the TFLite model
            interpreter = tf.lite.Interpreter(model_path="model.tflite")
            interpreter.allocate_tensors()

            # Get input and output details
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading TFLite model: {e}")
            raise


# Define class labels
class_labels = [
    'Main Gate', 'PU Block', 'Architecture Block',
    'Cross road', 'Block 1', 'Students Square',
    'Open auditorium', 'Block 4', 'Xpress Cafe',
    'Block 6', 'Amphi theater'
]

@app.route('/', methods=['GET', 'OPTIONS'])
@cors_headers
def root():
    """Root endpoint with API information"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

    return jsonify({
        'name': 'C-Track Locator API',
        'version': '1.0.0',
        'description': 'API for campus location detection',
        'status': 'online',
        'cors': 'configured to allow all origins (*)',
        'endpoints': {
            '/predict': 'POST - Predict location from image',
            '/health': 'GET - Health check',
            '/cors-test': 'GET - Test CORS configuration'
        }
    })

@app.route('/health', methods=['GET', 'OPTIONS'])
@cors_headers
def health_check():
    """Health check endpoint for Render to detect the service"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    return jsonify({'status': 'healthy'})

@app.route('/cors-test', methods=['GET', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH'])
@cors_headers
def cors_test():
    """Test endpoint for CORS"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

    return jsonify({
        'cors': 'enabled',
        'message': 'CORS is configured to allow all origins (*)',
        'allowed_origin': '*',
        'request_headers': dict(request.headers),
        'test': 'If you can see this, CORS is working!'
    })

@app.route('/predict', methods=['POST', 'OPTIONS', 'GET', 'PUT', 'DELETE', 'PATCH'])
@cors_headers
def predict():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

    # For non-POST methods (except OPTIONS), return a helpful message
    if request.method != 'POST':
        return jsonify({
            'message': 'This endpoint accepts POST requests with an image file',
            'usage': 'Send a POST request with an image file in the "image" field'
        })

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    try:
        # Log request information for debugging
        logger.info(f"Received prediction request with headers: {dict(request.headers)}")
        logger.info(f"Files in request: {list(request.files.keys())}")

        # Load TFLite model if not already loaded
        load_tflite_model_if_needed()

        file = request.files['image']
        logger.info(f"Processing image: {file.filename}, Content-Type: {file.content_type}")

        # Read and preprocess the image
        img = Image.open(io.BytesIO(file.read()))
        img = img.resize((224, 224))
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Get input and output tensors
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # Check if the input shape matches
        if list(img_array.shape) != input_details[0]['shape']:
            logger.info(f"Reshaping input from {img_array.shape} to {input_details[0]['shape']}")
            img_array = np.reshape(img_array, input_details[0]['shape'])

        # Set the input tensor
        interpreter.set_tensor(input_details[0]['index'], img_array)

        # Run inference
        logger.info("Running TFLite inference")
        interpreter.invoke()

        # Get the output tensor
        predictions = interpreter.get_tensor(output_details[0]['index'])
        predicted_class = np.argmax(predictions[0])

        # Create response with minimal memory usage
        response = {
            'predicted_class': class_labels[predicted_class],
            'probabilities': {}
        }

        # Add top 3 probabilities only to save memory
        top_indices = np.argsort(predictions[0])[-3:][::-1]
        for idx in top_indices:
            response['probabilities'][class_labels[idx]] = float(predictions[0][idx])

        logger.info(f"Prediction successful: {response['predicted_class']}")
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/favicon.ico')
@cors_headers
def favicon():
    """Handle favicon.ico requests to prevent 404 errors"""
    return '', 204  # Return no content

# Special route to handle all OPTIONS requests
@app.route('/<path:path>', methods=['OPTIONS'])
@cors_headers
def options_handler(path):
    """Handle OPTIONS requests for any path"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)