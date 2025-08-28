from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from keras.preprocessing import image
import io
from PIL import Image
import math

app = Flask(__name__)
CORS(app)

# Load the model
model = tf.keras.models.load_model("../models/vgg16.h5", compile=False)
model.compile(optimizer="adam", loss="categorical_crossentropy",
              metrics=["accuracy"])

# Define class labels
class_labels = [
    'Main Gate', 'PU Block', 'Architecture Block',
    'Cross Road', 'Block 1', 'Students Square',
    'Open Auditorium', 'Block 4', 'Xpress Cafe',
    'Block 6', 'Amphi theater'
]

# Campus location coordinates (matching frontend campus-data.ts)
campus_locations = [
    {"name": "Main Gate", "lat": 12.863788, "lng": 77.434897},
    {"name": "Cross Road", "lat": 12.862790, "lng": 77.437411},
    {"name": "Block 1", "lat": 12.863154, "lng": 77.437718},
    {"name": "Students Square", "lat": 12.862314, "lng": 77.438240},
    {"name": "Open Auditorium", "lat": 12.862787, "lng": 77.438580},
    {"name": "Block 4", "lat": 12.862211, "lng": 77.438860},
    {"name": "Xpress Cafe", "lat": 12.862045, "lng": 77.439374},
    {"name": "Block 6", "lat": 12.862103, "lng": 77.439809},
    {"name": "Amphi theater", "lat": 12.861424, "lng": 77.438057},
    {"name": "PU Block", "lat": 12.860511, "lng": 77.437249},
    {"name": "Architecture Block", "lat": 12.860132, "lng": 77.438592}
]

def calculate_distance(lat1, lon1, lat2, lon2):
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

def find_nearest_location(user_lat, user_lng):
    """Find the nearest campus location based on GPS coordinates"""
    nearest_location = None
    min_distance = float('inf')

    for location in campus_locations:
        distance = calculate_distance(user_lat, user_lng, location["lat"], location["lng"])
        if distance < min_distance:
            min_distance = distance
            nearest_location = location

    # Calculate confidence based on distance (closer = higher confidence)
    max_distance = 200  # meters
    confidence = max(0, min(1, 1 - (min_distance / max_distance)))

    return {
        "name": nearest_location["name"] if nearest_location else None,
        "distance": min_distance,
        "confidence": confidence,
        "coordinates": {
            "lat": nearest_location["lat"] if nearest_location else None,
            "lng": nearest_location["lng"] if nearest_location else None
        }
    }

def combine_predictions(ai_prediction, gps_match, gps_weight=40, ai_weight=60):
    """Combine AI and GPS predictions with configurable weights"""
    if not ai_prediction and not gps_match:
        return None

    # Normalize weights
    total_weight = gps_weight + ai_weight
    if total_weight == 0:
        gps_weight, ai_weight = 50, 50
        total_weight = 100

    normalized_gps_weight = gps_weight / total_weight
    normalized_ai_weight = ai_weight / total_weight

    # Calculate scores for all possible locations
    location_scores = {}

    # Add GPS contribution
    if gps_match and gps_match["name"]:
        location_scores[gps_match["name"]] = normalized_gps_weight * gps_match["confidence"]

    # Add AI contributions
    if ai_prediction and "probabilities" in ai_prediction:
        for location, prob in ai_prediction["probabilities"].items():
            if location in location_scores:
                location_scores[location] += normalized_ai_weight * prob
            else:
                location_scores[location] = normalized_ai_weight * prob

    # Find best location
    if not location_scores:
        return None

    best_location = max(location_scores, key=location_scores.get)
    best_score = location_scores[best_location]

    return {
        "final_location": best_location,
        "final_confidence": best_score,
        "gps_contribution": (normalized_gps_weight * gps_match["confidence"]) / best_score * 100 if gps_match and gps_match["name"] == best_location else 0,
        "ai_contribution": (normalized_ai_weight * ai_prediction["probabilities"].get(best_location, 0)) / best_score * 100 if ai_prediction else 0,
        "method": "hybrid" if gps_match and ai_prediction else ("gps-only" if gps_match else "ai-only"),
        "location_scores": location_scores
    }


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']

    # Get GPS coordinates if provided
    gps_lat = request.form.get('gps_lat', type=float)
    gps_lng = request.form.get('gps_lng', type=float)
    gps_weight = request.form.get('gps_weight', default=40, type=int)
    ai_weight = request.form.get('ai_weight', default=60, type=int)

    # Read and preprocess the image
    img = Image.open(io.BytesIO(file.read()))
    img = img.resize((224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    # Make AI prediction
    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions, axis=1)[0]

    ai_prediction = {
        'predicted_class': class_labels[predicted_class],
        'probabilities': {
            label: float(prob)
            for label, prob in zip(class_labels, predictions[0].tolist())
        }
    }

    # Get GPS prediction if coordinates provided
    gps_match = None
    if gps_lat is not None and gps_lng is not None:
        gps_match = find_nearest_location(gps_lat, gps_lng)

    # Combine predictions if both are available
    if gps_match and gps_match["name"]:
        hybrid_result = combine_predictions(ai_prediction, gps_match, gps_weight, ai_weight)

        response = {
            'predicted_class': hybrid_result["final_location"],
            'confidence': hybrid_result["final_confidence"],
            'probabilities': ai_prediction['probabilities'],
            'hybrid_prediction': hybrid_result,
            'gps_data': gps_match,
            'ai_data': ai_prediction,
            'method': hybrid_result["method"]
        }
    else:
        # AI-only prediction
        response = {
            'predicted_class': ai_prediction['predicted_class'],
            'confidence': ai_prediction['probabilities'][ai_prediction['predicted_class']],
            'probabilities': ai_prediction['probabilities'],
            'ai_data': ai_prediction,
            'method': 'ai-only'
        }

        if gps_lat is not None and gps_lng is not None:
            response['gps_data'] = gps_match

    return jsonify(response)


@app.route('/predict-gps', methods=['POST'])
def predict_gps():
    """GPS-only location prediction endpoint"""
    data = request.get_json()

    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({'error': 'GPS coordinates (latitude, longitude) required'}), 400

    gps_lat = data['latitude']
    gps_lng = data['longitude']

    # Find nearest location
    gps_match = find_nearest_location(gps_lat, gps_lng)

    if not gps_match or not gps_match["name"]:
        return jsonify({'error': 'No nearby campus location found'}), 404

    response = {
        'predicted_class': gps_match["name"],
        'confidence': gps_match["confidence"],
        'distance': gps_match["distance"],
        'coordinates': gps_match["coordinates"],
        'method': 'gps-only',
        'gps_data': gps_match
    }

    return jsonify(response)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})


if __name__ == '__main__':
    app.run(debug=True)
