from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from keras.preprocessing import image
import io
from PIL import Image
from functools import wraps
import os

app = Flask(__name__)
CORS(app)

# Configuration
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Load the model
model = tf.keras.models.load_model("server/model.h5", compile=False)
model.compile(optimizer="adam", loss="categorical_crossentropy",
              metrics=["accuracy"])

# Define class labels
class_labels = [
    'Main Gate', 'PU Block', 'Architecture Block',
    'Cross road', 'Block 1', 'Students Square',
    'Open auditorium', 'Block 4', 'Xpress Cafe',
    'Block 6', 'Amphi theater'
]


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
        img_array = np.expand_dims(img_array, axis=0)

        # Make prediction
        predictions = model.predict(img_array)
        predicted_class_idx = np.argmax(predictions, axis=1)[0]

        # Get top 3 predictions
        top3_indices = np.argsort(predictions[0])[-3:][::-1]
        top3_predictions = {
            class_labels[i]: float(predictions[0][i])
            for i in top3_indices
        }

        # Create response
        response = {
            'predicted_class': class_labels[predicted_class_idx],
            'confidence': float(predictions[0][predicted_class_idx]),
            'top_predictions': top3_predictions,
            'all_probabilities': {
                label: float(prob)
                for label, prob in zip(class_labels, predictions[0].tolist())
            }
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': 'Error processing image', 'details': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'classes_loaded': len(class_labels)
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
