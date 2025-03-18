import os
import cv2
import numpy as np
from tensorflow.keras.preprocessing.image import img_to_array, ImageDataGenerator

# Define paths
DATASET_PATH = 'NN_images'
PROCESSED_PATH = 'NN_images_processed'
IMG_SIZE = (224, 224)

# Create processed dataset directory if not exists
if not os.path.exists(PROCESSED_PATH):
    os.makedirs(PROCESSED_PATH)

# Data Augmentation
datagen = ImageDataGenerator(
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest'
)

# Process each class folder
for class_folder in os.listdir(DATASET_PATH):
    class_path = os.path.join(DATASET_PATH, class_folder)
    processed_class_path = os.path.join(PROCESSED_PATH, class_folder)
    
    if not os.path.exists(processed_class_path):
        os.makedirs(processed_class_path)
    
    # Process each image
    for img_name in os.listdir(class_path):
        img_path = os.path.join(class_path, img_name)
        processed_img_path = os.path.join(processed_class_path, img_name)
        
        # Load image
        img = cv2.imread(img_path)
        if img is None:
            continue
        
        # Resize and normalize
        img = cv2.resize(img, IMG_SIZE)
        img = img_to_array(img) / 255.0  # Normalize to [0,1]
        
        # Expand dimensions for augmentation
        img = np.expand_dims(img, axis=0)
        
        # Apply augmentation and save augmented images
        i = 0
        for batch in datagen.flow(img, batch_size=1, save_to_dir=processed_class_path, save_prefix=f'aug_{i}', save_format='jpg'):
            i += 1
            if i >= 5:  # Generate 5 augmented images per original
                break
        
        # Save original preprocessed image
        cv2.imwrite(processed_img_path, (img[0] * 255).astype(np.uint8))
        
print("Preprocessing complete. Augmented images saved in 'NN_images_processed'.")
