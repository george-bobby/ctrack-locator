from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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


@app.route('/predict', methods=['POST'])
def predict_location():
    """Mock prediction endpoint"""
    try:
        data = request.get_json()
        
        # Return mock predictions
        mock_predictions = [
            {
                'location': 'Main Gate',
                'confidence': 0.85,
                'coordinates': {'lat': 12.863788, 'lng': 77.434897}
            },
            {
                'location': 'Block 1',
                'confidence': 0.72,
                'coordinates': {'lat': 12.863154, 'lng': 77.437718}
            },
            {
                'location': 'Students Square',
                'confidence': 0.68,
                'coordinates': {'lat': 12.862314, 'lng': 77.438240}
            }
        ]
        
        response = {
            'status': 'success',
            'message': 'Mock predictions generated successfully',
            'predictions': {
                'ai_predictions': mock_predictions,
                'gps_predictions': [],
                'combined_predictions': mock_predictions
            },
            'input_data': data,
            'note': 'This is a test version with mock data'
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'message': 'Prediction failed'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
