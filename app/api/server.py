from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from keras.preprocessing import image
import io
from PIL import Image
import requests

app = Flask(__name__)
CORS(app)

# Cloud-hosted model URL
MODEL_URL = "https://storage.googleapis.com/ctrack-model/place_detection_model.h5"

# Load model from URL into memory without saving


def load_model_from_url(url):
    print("Loading model from URL...")
    response = requests.get(url)
    if response.status_code != 200:
        raise ValueError("Failed to fetch model from URL.")
    model_bytes = io.BytesIO(response.content)
    model = tf.keras.models.load_model(model_bytes, compile=False)
    model.compile(optimizer="adam",
                  loss="categorical_crossentropy", metrics=["accuracy"])
    print("Model loaded successfully.")
    return model


# Load model once at startup
model = load_model_from_url(MODEL_URL)

# Define class labels
class_labels = [
    'Main Gate', 'PU Block', 'Architecture Block',
    'Cross road', 'Block 1', 'Students Square',
    'Open auditorium', 'Block 4', 'Xpress Cafe',
    'Block 6', 'Amphi theater'
]


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']

    img = Image.open(io.BytesIO(file.read()))
    img = img.resize((224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions, axis=1)[0]

    response = {
        'predicted_class': class_labels[predicted_class],
        'probabilities': {
            label: float(prob)
            for label, prob in zip(class_labels, predictions[0].tolist())
        }
    }

    return jsonify(response)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
