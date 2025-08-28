from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import traceback

app = Flask(__name__)
# Configure CORS to allow from anywhere
CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     supports_credentials=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock campus locations data
CAMPUS_LOCATIONS = [
    {"name": "Main Gate", "lat": 12.863788, "lng": 77.434897},
    {"name": "Cross road", "lat": 12.862790, "lng": 77.437411},
    {"name": "Block 1", "lat": 12.863154, "lng": 77.437718},
    {"name": "Students Square", "lat": 12.862314, "lng": 77.438240},
    {"name": "Open auditorium", "lat": 12.862787, "lng": 77.438580},
    {"name": "Block 4", "lat": 12.862211, "lng": 77.438860},
    {"name": "Xpress Cafe", "lat": 12.062045, "lng": 77.439374},
    {"name": "Block 6", "lat": 12.862103, "lng": 77.439809},
    {"name": "Amphi theater", "lat": 12.861424, "lng": 77.438057},
    {"name": "PU Block", "lat": 12.860511, "lng": 77.437249},
    {"name": "Architecture Block", "lat": 12.860132, "lng": 77.438592}
]


@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'message': 'CTrack Locator Server - Basic Test Version',
        'status': 'running',
        'version': 'test-1.0',
        'endpoints': {
            '/': 'GET - This endpoint',
            '/health': 'GET - Health check',
            '/predict': 'POST - Prediction endpoint (mock data)',
            '/locations': 'GET - Get all campus locations'
        }
    })


@app.route('/health', methods=['GET'])
def check_health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': False,
        'model_type': 'none',
        'message': 'Basic Flask server running successfully',
        'locations_count': len(CAMPUS_LOCATIONS)
    })


@app.route('/locations', methods=['GET'])
def get_locations():
    """Get all campus locations"""
    return jsonify({
        'status': 'success',
        'locations': CAMPUS_LOCATIONS,
        'count': len(CAMPUS_LOCATIONS)
    })


@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict_location():
    """Mock prediction endpoint"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return '', 200

    try:
        logger.info(f"Received prediction request")
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Request headers: {dict(request.headers)}")

        # Handle different content types
        data = None
        image_received = False

        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle file upload (this is what the frontend sends)
            if 'image' in request.files:
                image_file = request.files['image']
                image_received = True
                logger.info(f"Received image file: {image_file.filename}, size: {len(image_file.read())} bytes")
                image_file.seek(0)  # Reset file pointer after reading

                # Get GPS data if provided
                gps_lat = request.form.get('gps_lat', type=float)
                gps_lng = request.form.get('gps_lng', type=float)
                gps_weight = request.form.get('gps_weight', default=40, type=int)
                ai_weight = request.form.get('ai_weight', default=60, type=int)

                data = {
                    'image_filename': image_file.filename,
                    'gps_lat': gps_lat,
                    'gps_lng': gps_lng,
                    'gps_weight': gps_weight,
                    'ai_weight': ai_weight,
                    'form_data': dict(request.form)
                }
            else:
                data = {
                    'files': list(request.files.keys()),
                    'form_data': dict(request.form)
                }
        elif request.content_type and 'application/json' in request.content_type:
            data = request.get_json()
        else:
            # Try to get JSON anyway
            try:
                data = request.get_json(force=True)
            except:
                data = {'raw_data': 'No JSON data received'}

        logger.info(f"Parsed data: {data}")

        # Mock location classes and their probabilities
        location_classes = [
            'Main Gate', 'Cross road', 'Block 1', 'Students Square',
            'Open auditorium', 'Block 4', 'Xpress Cafe', 'Block 6',
            'Amphi theater', 'PU Block', 'Architecture Block'
        ]

        # Generate mock probabilities (frontend expects this format)
        import random
        probabilities = {}
        remaining_prob = 1.0

        for i, location in enumerate(location_classes):
            if i == len(location_classes) - 1:
                # Last item gets remaining probability
                probabilities[location] = remaining_prob
            else:
                # Random probability between 0 and remaining
                prob = random.uniform(0, remaining_prob * 0.8)  # Keep some for others
                probabilities[location] = prob
                remaining_prob -= prob

        # Sort by probability and pick the highest as predicted class
        sorted_locations = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
        predicted_class = sorted_locations[0][0]

        # Normalize probabilities to sum to 1
        total_prob = sum(probabilities.values())
        probabilities = {k: v/total_prob for k, v in probabilities.items()}

        # Frontend expects this exact format
        response = {
            'predicted_class': predicted_class,
            'probabilities': probabilities,
            'confidence': probabilities[predicted_class],
            'status': 'success',
            'message': 'Mock prediction generated successfully',
            'input_data': data,
            'note': 'This is a test version with mock data',
            'image_received': image_received
        }

        logger.info("Sending successful response")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error in predict_location: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'message': 'Prediction failed',
            'traceback': traceback.format_exc()
        }), 500


@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Access-Control-Allow-Credentials')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
