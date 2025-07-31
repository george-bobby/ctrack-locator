from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from keras.preprocessing import image
import io
from PIL import Image

app = Flask(__name__)
CORS(app)

# Load the model
model = tf.keras.models.load_model("server/models/vgg16.h5", compile=False)
model.compile(optimizer="adam", loss="categorical_crossentropy",
              metrics=["accuracy"])

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

    # Read and preprocess the image
    img = Image.open(io.BytesIO(file.read()))
    img = img.resize((224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    # Make prediction
    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions, axis=1)[0]

    # Create response
    response = {
        'predicted_class': class_labels[predicted_class],
        'probabilities': {
            label: float(prob)
            for label, prob in zip(class_labels, predictions[0].tolist())
        }
    }

    return jsonify(response)


if __name__ == '__main__':
    app.run(debug=True)
