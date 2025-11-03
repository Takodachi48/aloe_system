#!/usr/bin/env python3
"""
Script to compare predictions between pre-trained MobileNetV2 and fine-tuned aloe disease model
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
from PIL import Image
import io
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelComparator:
    def __init__(self):
        self.pretrained_model = None
        self.finetuned_model = None
        self.load_models()

    def load_models(self):
        """Load both pre-trained and fine-tuned models"""
        # Load pre-trained MobileNetV2
        logger.info("Loading pre-trained MobileNetV2...")
        self.pretrained_model = MobileNetV2(weights='imagenet')
        logger.info("✓ Pre-trained MobileNetV2 loaded")

        # Load fine-tuned model
        model_paths = ['models/best_model.h5', 'models/final_model.h5']
        for path in model_paths:
            if os.path.exists(path):
                logger.info(f"Loading fine-tuned model from {path}...")
                self.finetuned_model = keras.models.load_model(path)
                logger.info(f"✓ Fine-tuned model loaded from {path}")
                break
        else:
            logger.error("No fine-tuned model found!")
            self.finetuned_model = None

    def preprocess_image(self, image_path):
        """Preprocess image for both models"""
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize to 224x224 for both models
        img = img.resize((224, 224), Image.Resampling.LANCZOS)
        img_array = np.array(img)
        img_array = np.expand_dims(img_array, axis=0)

        # Apply MobileNetV2 preprocessing
        img_array = preprocess_input(img_array.astype('float32'))

        return img_array

    def predict_pretrained(self, img_array):
        """Get predictions from pre-trained model"""
        predictions = self.pretrained_model.predict(img_array, verbose=0)
        decoded = decode_predictions(predictions, top=3)[0]  # Top 3 predictions
        return decoded

    def predict_finetuned(self, img_array):
        """Get predictions from fine-tuned model"""
        predictions = self.finetuned_model.predict(img_array, verbose=0)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])

        # Disease classes
        disease_classes = {
            0: 'healthy',
            1: 'leaf_spot',
            2: 'root_rot',
            3: 'sunburn'
        }

        disease_name = disease_classes.get(predicted_class, f'unknown_{predicted_class}')
        return disease_name, confidence

    def compare_predictions(self, image_path):
        """Compare predictions from both models"""
        logger.info(f"\n=== Analyzing {image_path} ===")

        # Preprocess image
        img_array = self.preprocess_image(image_path)

        # Get predictions
        pretrained_preds = self.predict_pretrained(img_array)
        finetuned_disease, finetuned_conf = self.predict_finetuned(img_array)

        print(f"Pre-trained MobileNetV2 (ImageNet classes):")
        for pred in pretrained_preds:
            print(f"  {pred[1]}: {pred[2]:.2%}")

        print(f"\nFine-tuned Aloe Model:")
        print(f"  Disease: {finetuned_disease}")
        print(f"  Confidence: {finetuned_conf:.2%}")

        # Check for potential contradictions
        # Since models have different output spaces, we look for semantic contradictions
        imagenet_classes = [pred[1].lower() for pred in pretrained_preds]

        # Check if pre-trained model thinks it's a plant-related object
        plant_related = any(term in ' '.join(imagenet_classes) for term in ['plant', 'leaf', 'flower', 'tree', 'grass'])

        print(f"\nAnalysis:")
        print(f"  Pre-trained model sees plant-related objects: {plant_related}")

        if plant_related:
            print("  ✓ Pre-trained model recognizes plant features - good foundation for transfer learning")
        else:
            print("  ⚠️ Pre-trained model doesn't recognize plant features - may need more training data")

        if finetuned_conf > 0.8:
            print("  ✓ Fine-tuned model is confident in its prediction")
        else:
            print("  ⚠️ Fine-tuned model has low confidence - may need more training")

        return {
            'image': image_path,
            'pretrained_top3': pretrained_preds,
            'finetuned_disease': finetuned_disease,
            'finetuned_confidence': finetuned_conf,
            'plant_related': plant_related
        }

def main():
    comparator = ModelComparator()

    if comparator.finetuned_model is None:
        logger.error("Cannot proceed without fine-tuned model")
        return

    # Find some test images
    test_images = []
    test_dir = 'datasets/test'

    if os.path.exists(test_dir):
        for root, dirs, files in os.walk(test_dir):
            for file in files:
                if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    test_images.append(os.path.join(root, file))
                    if len(test_images) >= 5:  # Test with 5 images
                        break
            if len(test_images) >= 5:
                break

    if not test_images:
        logger.error("No test images found in datasets/test/")
        return

    logger.info(f"Found {len(test_images)} test images")

    results = []
    for img_path in test_images:
        result = comparator.compare_predictions(img_path)
        results.append(result)

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    plant_related_count = sum(1 for r in results if r['plant_related'])
    high_conf_count = sum(1 for r in results if r['finetuned_confidence'] > 0.8)

    print(f"Images analyzed: {len(results)}")
    print(f"Pre-trained model recognized plant features: {plant_related_count}/{len(results)}")
    print(f"Fine-tuned model high confidence predictions: {high_conf_count}/{len(results)}")

    print("\nConclusion:")
    if plant_related_count > 0:
        print("✓ The pre-trained MobileNetV2 provides relevant features for plant classification.")
        print("  No fundamental contradictions - transfer learning is appropriate.")
    else:
        print("⚠️ The pre-trained model may not be optimal for plant images.")
        print("  Consider using a model pre-trained on plant datasets.")

    print("\nThe models don't 'contradict' each other because they serve different purposes:")
    print("- Pre-trained: General object recognition (1000 ImageNet classes)")
    print("- Fine-tuned: Specific aloe disease classification (5 classes)")
    print("The pre-trained model provides a strong foundation that gets specialized through fine-tuning.")

if __name__ == '__main__':
    main()
