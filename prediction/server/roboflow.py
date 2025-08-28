from inference import get_model
import cv2

ROBOFLOW_API_KEY = "MBFBifupwZPFdYcEHX1u"

# Load image
image = cv2.imread("../train/test6.jpg")
if image is None:
    raise FileNotFoundError("Image not found at ../train/test6.jpg")

# Load classification model
model = get_model(model_id="c-tracker-gehfu/1", api_key=ROBOFLOW_API_KEY)

# Run inference
results = model.infer(image)[0]

# Print prediction
print("Predicted class:", results.predictions[0].class_name)
print("Confidence:", results.predictions[0].confidence)
