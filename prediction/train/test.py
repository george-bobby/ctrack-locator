import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
import matplotlib.pyplot as plt

# Load the trained model
model = tf.keras.models.load_model("place_detection_model.h5")

# Define class labels (update these according to your dataset)
class_labels = ['Front Gate(class 1)','PU Block(class 10)', 'Architecture Block(class 11)','Cross Road(class 2)', 'Block 1(class 3)', 'Students Square(class 4)', 'Open Auditorium(class 5)', 
                'Block 4(class 6)', 'Xpress Cafe(class 7)', 'Block 6(class 8)', 'Amphi theater(class 9)' ]

# Load and preprocess the test image
img_path = "test3.jpg"  # Change to your test image
img = image.load_img(img_path, target_size=(224, 224))  # Resize to match model input
img_array = image.img_to_array(img) / 255.0  # Normalize pixel values
img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension

# Make predictions
predictions = model.predict(img_array)

# Get the predicted class
predicted_class = np.argmax(predictions, axis=1)[0]
predicted_label = class_labels[predicted_class]

# Display the result
plt.imshow(img)
plt.title(f"Predicted Class: {predicted_label}")
plt.axis("off")
plt.show()

# Print confidence scores
print("Prediction Probabilities:")
for i, prob in enumerate(predictions[0]):
    print(f"{class_labels[i]}: {prob:.4f}")
