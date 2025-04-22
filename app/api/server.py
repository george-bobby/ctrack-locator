from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import io
from PIL import Image
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS to allow all origins and methods
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Add permissive CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '86400')
    return response

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

@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API information"""
    return jsonify({
        'name': 'C-Track Locator API',
        'version': '1.0.0',
        'description': 'API for campus location detection',
        'endpoints': {
            '/predict': 'POST - Predict location from image',
            '/health': 'GET - Health check',
            '/cors-test': 'GET - Test CORS configuration'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Render to detect the service"""
    return jsonify({'status': 'healthy'}), 200

@app.route('/cors-test', methods=['GET', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH'])
def cors_test():
    """Test endpoint for CORS"""
    if request.method == 'OPTIONS':
        # Handle preflight request with maximum permissiveness
        return '', 204
    return jsonify({'cors': 'enabled', 'message': 'CORS is fully permissive'})

@app.route('/predict', methods=['POST', 'OPTIONS', 'GET', 'PUT', 'DELETE', 'PATCH'])
def predict():
    # Handle preflight OPTIONS request with maximum permissiveness
    if request.method == 'OPTIONS':
        return '', 204

    # For non-POST methods (except OPTIONS), return a helpful message
    if request.method != 'POST':
        return jsonify({
            'message': 'This endpoint accepts POST requests with an image file',
            'usage': 'Send a POST request with an image file in the "image" field'
        })

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    try:
        # Load TFLite model if not already loaded
        load_tflite_model_if_needed()

        file = request.files['image']

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

        # Let the global after_request handler add CORS headers
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)