from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import get_model
import numpy as np
import cv2
import io
from PIL import Image
import math

app = Flask(__name__)
CORS(app)

# Roboflow API Key & Model
ROBOFLOW_API_KEY = "MBFBifupwZPFdYcEHX1u"
MODEL_ID = "c-tracker-gehfu/1"
model = get_model(model_id=MODEL_ID, api_key=ROBOFLOW_API_KEY)

# Define class labels (must match Roboflow training classes)
class_labels = [
    'Main Gate', 'PU Block', 'Architecture Block',
    'Cross Road', 'Block 1', 'Students Square',
    'Open Auditorium', 'Block 4', 'Xpress Cafe',
    'Block 6', 'Amphi theater'
]

# Campus location coordinates
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
    """Haversine distance in meters"""
    R = 6371e3
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (math.sin(dphi/2)**2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def find_nearest_location(user_lat, user_lng):
    nearest_location, min_distance = None, float("inf")
    for loc in campus_locations:
        dist = calculate_distance(user_lat, user_lng, loc["lat"], loc["lng"])
        if dist < min_distance:
            min_distance, nearest_location = dist, loc

    max_distance = 200  # meters
    confidence = max(0, min(1, 1 - (min_distance / max_distance)))

    return {
        "name": nearest_location["name"] if nearest_location else None,
        "distance": min_distance,
        "confidence": confidence,
        "coordinates": nearest_location if nearest_location else None
    }

def combine_predictions(ai_prediction, gps_match, gps_weight=40, ai_weight=60):
    if not ai_prediction and not gps_match:
        return None

    total_weight = gps_weight + ai_weight or 1
    gps_w, ai_w = gps_weight/total_weight, ai_weight/total_weight

    scores = {}

    # GPS contribution
    if gps_match and gps_match["name"]:
        scores[gps_match["name"]] = gps_w * gps_match["confidence"]

    # AI contribution
    if ai_prediction and "probabilities" in ai_prediction:
        for loc, prob in ai_prediction["probabilities"].items():
            scores[loc] = scores.get(loc, 0) + ai_w * prob

    if not scores:
        return None

    best_loc = max(scores, key=scores.get)
    best_score = scores[best_loc]

    return {
        "final_location": best_loc,
        "final_confidence": best_score,
        "gps_contribution": (gps_w * gps_match["confidence"]) / best_score * 100 if gps_match and gps_match["name"] == best_loc else 0,
        "ai_contribution": (ai_w * ai_prediction["probabilities"].get(best_loc, 0)) / best_score * 100 if ai_prediction else 0,
        "method": "hybrid" if gps_match and ai_prediction else ("gps-only" if gps_match else "ai-only"),
        "location_scores": scores
    }

def preprocess_for_cv2(file):
    """Convert uploaded file -> cv2 numpy array"""
    pil_img = Image.open(io.BytesIO(file.read())).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]
    img = preprocess_for_cv2(file)

    # Roboflow inference
    results = model.infer(img)[0]

    if not results.predictions:
        return jsonify({"error": "No prediction returned"}), 500

    # Format AI predictions
    probs = {pred.class_name: float(pred.confidence) for pred in results.predictions}
    top_pred = max(probs, key=probs.get)

    ai_prediction = {
        "predicted_class": top_pred,
        "probabilities": probs
    }

    # GPS inputs
    gps_lat = request.form.get("gps_lat", type=float)
    gps_lng = request.form.get("gps_lng", type=float)
    gps_weight = request.form.get("gps_weight", default=40, type=int)
    ai_weight = request.form.get("ai_weight", default=60, type=int)

    gps_match = find_nearest_location(gps_lat, gps_lng) if gps_lat and gps_lng else None

    if gps_match and gps_match["name"]:
        hybrid = combine_predictions(ai_prediction, gps_match, gps_weight, ai_weight)
        response = {
            "predicted_class": hybrid["final_location"],
            "confidence": hybrid["final_confidence"],
            "probabilities": ai_prediction["probabilities"],
            "hybrid_prediction": hybrid,
            "gps_data": gps_match,
            "ai_data": ai_prediction,
            "method": hybrid["method"]
        }
    else:
        response = {
            "predicted_class": ai_prediction["predicted_class"],
            "confidence": ai_prediction["probabilities"][ai_prediction["predicted_class"]],
            "probabilities": ai_prediction["probabilities"],
            "ai_data": ai_prediction,
            "method": "ai-only"
        }

    return jsonify(response)

@app.route("/predict-gps", methods=["POST"])
def predict_gps():
    data = request.get_json()
    if not data or "latitude" not in data or "longitude" not in data:
        return jsonify({"error": "GPS coordinates required"}), 400

    gps_match = find_nearest_location(data["latitude"], data["longitude"])
    if not gps_match or not gps_match["name"]:
        return jsonify({"error": "No nearby campus location found"}), 404

    return jsonify({
        "predicted_class": gps_match["name"],
        "confidence": gps_match["confidence"],
        "distance": gps_match["distance"],
        "coordinates": gps_match["coordinates"],
        "method": "gps-only",
        "gps_data": gps_match
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "roboflow_model_loaded": model is not None})

if __name__ == "__main__":
    app.run(debug=True)
