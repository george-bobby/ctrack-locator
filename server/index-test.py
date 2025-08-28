from flask import Flask, request, jsonify
from flask_cors import CORS
# Temporarily comment out inference import for testing deployment
# from inference import get_model
import numpy as np
import io
from PIL import Image
import math

app = Flask(__name__)
CORS(app)

# Configuration
CONFIG = {
    'roboflow_api_key': "MBFBifupwZPFdYcEHX1u",
    'model_id': "c-tracker-gehfu/1",
    'image_size': (224, 224),
    'max_gps_distance': 200,  # meters
    'default_gps_weight': 40,
    'default_ai_weight': 60
}

# Campus locations data
CAMPUS_LOCATIONS = [
    {"name": "Main Gate", "lat": 12.863788, "lng": 77.434897},
    {"name": "Cross road", "lat": 12.862790, "lng": 77.437411},
    {"name": "Block 1", "lat": 12.863154, "lng": 77.437718},
    {"name": "Students Square", "lat": 12.862314, "lng": 77.438240},
    {"name": "Open auditorium", "lat": 12.862787, "lng": 77.438580},
    {"name": "Block 4", "lat": 12.862211, "lng": 77.438860},
    {"name": "Xpress Cafe", "lat": 12.862045, "lng": 77.439374},
    {"name": "Block 6", "lat": 12.862103, "lng": 77.439809},
    {"name": "Amphi theater", "lat": 12.861424, "lng": 77.438057},
    {"name": "PU Block", "lat": 12.860511, "lng": 77.437249},
    {"name": "Architecture Block", "lat": 12.860132, "lng": 77.438592}
]

# Temporarily comment out model loading for testing
# model = get_model(model_id=CONFIG['model_id'], api_key=CONFIG['roboflow_api_key'])


class LocationPredictor:
    @staticmethod
    def calculate_gps_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two GPS coordinates using Haversine formula"""
        R = 6371e3  # Earth's radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (math.sin(delta_phi / 2) * math.sin(delta_phi / 2) +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(delta_lambda / 2) * math.sin(delta_lambda / 2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def normalize_scores(scores):
        """Normalize prediction scores to probabilities"""
        max_score = max(scores)
        if max_score == 0:
            return [1/len(scores)] * len(scores)
        return [score / max_score for score in scores]

    @staticmethod
    def get_ai_predictions():
        """Mock AI predictions for testing deployment"""
        # Return mock predictions for each location
        mock_scores = [0.8, 0.6, 0.9, 0.4, 0.3, 0.7, 0.5, 0.2, 0.1, 0.3, 0.4]
        normalized_scores = LocationPredictor.normalize_scores(mock_scores)
        
        predictions = []
        for i, location in enumerate(CAMPUS_LOCATIONS):
            predictions.append({
                'location': location['name'],
                'confidence': normalized_scores[i],
                'coordinates': {'lat': location['lat'], 'lng': location['lng']}
            })
        
        return sorted(predictions, key=lambda x: x['confidence'], reverse=True)

    @staticmethod
    def get_gps_predictions(user_lat, user_lng):
        """Calculate GPS-based predictions using distance"""
        gps_predictions = []
        
        for location in CAMPUS_LOCATIONS:
            distance = LocationPredictor.calculate_gps_distance(
                user_lat, user_lng, location['lat'], location['lng']
            )
            
            # Convert distance to confidence score (closer = higher confidence)
            if distance <= CONFIG['max_gps_distance']:
                confidence = max(0, 1 - (distance / CONFIG['max_gps_distance']))
            else:
                confidence = 0
            
            gps_predictions.append({
                'location': location['name'],
                'confidence': confidence,
                'distance': distance,
                'coordinates': {'lat': location['lat'], 'lng': location['lng']}
            })
        
        return sorted(gps_predictions, key=lambda x: x['confidence'], reverse=True)

    @staticmethod
    def combine_predictions(ai_predictions, gps_predictions, ai_weight=60, gps_weight=40):
        """Combine AI and GPS predictions with weighted average"""
        combined = {}
        
        # Process AI predictions
        for pred in ai_predictions:
            location = pred['location']
            if location not in combined:
                combined[location] = {'ai_confidence': 0, 'gps_confidence': 0}
            combined[location]['ai_confidence'] = pred['confidence']
            combined[location]['coordinates'] = pred['coordinates']
        
        # Process GPS predictions
        for pred in gps_predictions:
            location = pred['location']
            if location not in combined:
                combined[location] = {'ai_confidence': 0, 'gps_confidence': 0}
            combined[location]['gps_confidence'] = pred['confidence']
            if 'coordinates' not in combined[location]:
                combined[location]['coordinates'] = pred['coordinates']
            combined[location]['distance'] = pred.get('distance', float('inf'))
        
        # Calculate combined scores
        final_predictions = []
        for location, scores in combined.items():
            ai_conf = scores['ai_confidence']
            gps_conf = scores['gps_confidence']
            
            combined_confidence = (
                (ai_conf * ai_weight / 100) + 
                (gps_conf * gps_weight / 100)
            )
            
            final_predictions.append({
                'location': location,
                'combined_confidence': combined_confidence,
                'ai_confidence': ai_conf,
                'gps_confidence': gps_conf,
                'distance': scores.get('distance', float('inf')),
                'coordinates': scores['coordinates']
            })
        
        return sorted(final_predictions, key=lambda x: x['combined_confidence'], reverse=True)


@app.route('/predict', methods=['POST'])
def predict_location():
    """Main prediction endpoint - temporarily using mock data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract parameters
        user_lat = data.get('latitude')
        user_lng = data.get('longitude')
        ai_weight = data.get('ai_weight', CONFIG['default_ai_weight'])
        gps_weight = data.get('gps_weight', CONFIG['default_gps_weight'])
        
        # For now, return mock predictions
        response = {
            'status': 'success',
            'message': 'Location prediction completed (using mock data for testing)',
            'predictions': {
                'ai_predictions': LocationPredictor.get_ai_predictions()[:3],
                'gps_predictions': [] if not (user_lat and user_lng) else LocationPredictor.get_gps_predictions(user_lat, user_lng)[:3],
                'combined_predictions': []
            },
            'weights': {
                'ai_weight': ai_weight,
                'gps_weight': gps_weight
            },
            'location_count': len(CAMPUS_LOCATIONS)
        }
        
        # If GPS coordinates provided, calculate combined predictions
        if user_lat and user_lng:
            ai_preds = LocationPredictor.get_ai_predictions()
            gps_preds = LocationPredictor.get_gps_predictions(user_lat, user_lng)
            combined_preds = LocationPredictor.combine_predictions(
                ai_preds, gps_preds, ai_weight, gps_weight
            )
            response['predictions']['combined_predictions'] = combined_preds[:3]

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def check_health():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'healthy',
            'model_loaded': False,  # Set to False since we're using mock data
            'model_type': 'mock_for_testing',
            'model_id': CONFIG['model_id'],
            'message': 'Server is running in test mode with mock predictions'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'model_loaded': False,
            'error': str(e)
        }), 500


@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'message': 'CTrack Locator Server',
        'status': 'running',
        'endpoints': {
            '/predict': 'POST - Main prediction endpoint',
            '/health': 'GET - Health check',
            '/': 'GET - This endpoint'
        }
    })


if __name__ == '__main__':
    app.run(debug=True)
