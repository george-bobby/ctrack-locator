from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import get_model
import cv2
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

# Load the Roboflow model
model = get_model(model_id=CONFIG['model_id'], api_key=CONFIG['roboflow_api_key'])


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

        return R * c  # Distance in meters

    @staticmethod
    def get_gps_prediction(user_lat, user_lng):
        """Find the nearest campus location based on GPS coordinates"""
        distances = []
        for location in CAMPUS_LOCATIONS:
            distance = LocationPredictor.calculate_gps_distance(
                user_lat, user_lng, location["lat"], location["lng"]
            )
            distances.append((location, distance))

        nearest_location, min_distance = min(distances, key=lambda x: x[1])

        # Calculate confidence based on distance (closer = higher confidence)
        confidence = max(0, min(1, 1 - (min_distance / CONFIG['max_gps_distance'])))

        return {
            "name": nearest_location["name"],
            "distance": min_distance,
            "confidence": confidence,
            "coordinates": {"lat": nearest_location["lat"], "lng": nearest_location["lng"]}
        }

    @staticmethod
    def get_ai_prediction(image_data):
        """Make AI prediction using Roboflow model"""
        try:
            # Convert PIL image to OpenCV format
            img_array = np.array(image_data)
            if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            else:
                img_cv = img_array

            # Run inference
            results = model.infer(img_cv)[0]

            if results.predictions and len(results.predictions) > 0:
                prediction = results.predictions[0]
                return {
                    'predicted_class': prediction.class_name,
                    'confidence': prediction.confidence,
                    'probabilities': {prediction.class_name: prediction.confidence}
                }
            else:
                return {
                    'predicted_class': 'Unknown',
                    'confidence': 0.0,
                    'probabilities': {'Unknown': 0.0}
                }

        except Exception as e:
            print(f"AI prediction error: {e}")
            return {
                'predicted_class': 'Error',
                'confidence': 0.0,
                'probabilities': {'Error': 0.0}
            }

    @staticmethod
    def get_hybrid_prediction(ai_prediction, gps_prediction, gps_weight, ai_weight):
        """Combine AI and GPS predictions with configurable weights"""
        if not ai_prediction and not gps_prediction:
            return None

        # Normalize weights
        total_weight = gps_weight + ai_weight
        if total_weight == 0:
            gps_weight, ai_weight = 50, 50
            total_weight = 100

        normalized_gps_weight = gps_weight / total_weight
        normalized_ai_weight = ai_weight / total_weight

        location_scores = {}

        # Add GPS contribution
        if gps_prediction and gps_prediction["name"]:
            location_scores[gps_prediction["name"]] = normalized_gps_weight * gps_prediction["confidence"]

        # Add AI contributions
        if ai_prediction and "probabilities" in ai_prediction:
            for location, prob in ai_prediction["probabilities"].items():
                location_scores[location] = location_scores.get(location, 0) + normalized_ai_weight * prob

        if not location_scores:
            return None

        best_location = max(location_scores, key=location_scores.get)
        best_score = location_scores[best_location]

        return {
            "final_location": best_location,
            "final_confidence": best_score,
            "gps_contribution": (normalized_gps_weight * gps_prediction["confidence"]) / best_score * 100 if gps_prediction and gps_prediction["name"] == best_location else 0,
            "ai_contribution": (normalized_ai_weight * ai_prediction["probabilities"].get(best_location, 0)) / best_score * 100 if ai_prediction else 0,
            "method": "hybrid",
            "location_scores": location_scores
        }


class ImageProcessor:
    @staticmethod
    def process_uploaded_image(file):
        """Process uploaded image file"""
        img = Image.open(io.BytesIO(file.read()))
        return img.resize(CONFIG['image_size'])


class ResponseBuilder:
    @staticmethod
    def build_prediction_response(ai_prediction=None, gps_prediction=None, hybrid_prediction=None, method='unknown'):
        """Build standardized prediction response"""
        base_response = {
            'method': method,
            'ai_data': ai_prediction,
            'gps_data': gps_prediction
        }

        if hybrid_prediction:
            base_response.update({
                'predicted_class': hybrid_prediction["final_location"],
                'confidence': hybrid_prediction["final_confidence"],
                'probabilities': ai_prediction.get('probabilities', {}) if ai_prediction else {},
                'hybrid_prediction': hybrid_prediction,
                'method': 'hybrid'
            })
        elif ai_prediction and gps_prediction:
            # Both available but no hybrid calculation (shouldn't happen with current logic)
            base_response.update({
                'predicted_class': ai_prediction['predicted_class'],
                'confidence': ai_prediction['confidence'],
                'probabilities': ai_prediction['probabilities'],
                'method': 'ai-primary'
            })
        elif ai_prediction:
            base_response.update({
                'predicted_class': ai_prediction['predicted_class'],
                'confidence': ai_prediction['confidence'],
                'probabilities': ai_prediction['probabilities'],
                'method': 'ai-only'
            })
        elif gps_prediction:
            base_response.update({
                'predicted_class': gps_prediction["name"],
                'confidence': gps_prediction["confidence"],
                'distance': gps_prediction["distance"],
                'coordinates': gps_prediction["coordinates"],
                'method': 'gps-only'
            })
        else:
            return {'error': 'No valid prediction available'}

        return base_response


# Single unified prediction route
@app.route('/predict', methods=['POST'])
def predict_location():
    """Unified location prediction endpoint - handles AI, GPS, or hybrid predictions based on input"""
    
    # Initialize variables
    ai_prediction = None
    gps_prediction = None
    hybrid_prediction = None

    # Get parameters
    gps_weight = request.form.get('gps_weight', default=CONFIG['default_gps_weight'], type=int)
    ai_weight = request.form.get('ai_weight', default=CONFIG['default_ai_weight'], type=int)
    
    # Handle different input types
    has_image = 'image' in request.files
    has_gps = False
    
    # Check for GPS data (can come from form or JSON)
    gps_lat = gps_lng = None
    if request.is_json:
        data = request.get_json()
        gps_lat = data.get('latitude') if data else None
        gps_lng = data.get('longitude') if data else None
    else:
        gps_lat = request.form.get('gps_lat', type=float)
        gps_lng = request.form.get('gps_lng', type=float)
    
    has_gps = gps_lat is not None and gps_lng is not None

    # Validate input
    if not has_image and not has_gps:
        return jsonify({'error': 'Either image or GPS coordinates required'}), 400

    try:
        # Process AI prediction if image provided
        if has_image:
            img = ImageProcessor.process_uploaded_image(request.files['image'])
            ai_prediction = LocationPredictor.get_ai_prediction(img)

        # Process GPS prediction if coordinates provided
        if has_gps:
            gps_prediction = LocationPredictor.get_gps_prediction(gps_lat, gps_lng)
            if not gps_prediction["name"]:
                gps_prediction = None  # No nearby location found

        # Determine prediction method based on available inputs and weights
        if has_image and has_gps and gps_prediction and ai_weight > 0 and gps_weight > 0:
            # Hybrid prediction
            hybrid_prediction = LocationPredictor.get_hybrid_prediction(
                ai_prediction, gps_prediction, gps_weight, ai_weight
            )
        elif has_image and has_gps and ai_weight == 0:
            # GPS only (AI weight is 0)
            pass  # gps_prediction already set
        elif has_image and has_gps and gps_weight == 0:
            # AI only (GPS weight is 0)
            gps_prediction = None  # Ignore GPS
        # For single input cases, predictions are already set correctly

        # Build and return response
        response = ResponseBuilder.build_prediction_response(
            ai_prediction=ai_prediction,
            gps_prediction=gps_prediction,
            hybrid_prediction=hybrid_prediction
        )

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def check_health():
    """Health check endpoint"""
    try:
        model_status = model is not None
        return jsonify({
            'status': 'healthy',
            'model_loaded': model_status,
            'model_type': 'roboflow',
            'model_id': CONFIG['model_id']
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'model_loaded': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True)