#!/usr/bin/env python3
"""
CNN-based Aloe Vera Disease Detection Service
This service provides HTTP API endpoints for plant disease classification using a CNN model.
"""

import os
import io
import json
import logging
import requests
from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
import tensorflow as tf
from tensorflow import keras

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    print("OpenCV not available, using PIL for image processing")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

DISEASE_CLASSES = {
    0: 'healthy',
    1: 'leaf_spot', 
    2: 'root_rot',
    3: 'aloe_rust',
    4: 'bacterial_soft_rot'
}

DISEASE_INFO = {
    'healthy': {
        'name': 'Healthy',
        'severity': 'low',
        'description': 'Plant appears healthy with no visible signs of disease or stress.',
        'causes': [],
        'treatments': ['Maintain current watering schedule', 'Ensure adequate sunlight', 'Monitor regularly'],
        'prevention': ['Regular inspection', 'Proper watering', 'Good drainage']
    },
    'leaf_spot': {
        'name': 'Leaf Spot',
        'severity': 'medium',
        'description': 'Fungal infection causing circular spots on leaves.',
        'causes': ['High humidity', 'Poor air circulation', 'Overwatering'],
        'treatments': ['Remove affected leaves', 'Apply fungicide treatment', 'Improve ventilation'],
        'prevention': ['Avoid overhead watering', 'Ensure good air circulation', 'Remove fallen debris']
    },
    'root_rot': {
        'name': 'Root Rot',
        'severity': 'high',
        'description': 'Root system damage from excessive moisture.',
        'causes': ['Overwatering', 'Poor drainage', 'Contaminated soil'],
        'treatments': ['Reduce watering frequency', 'Improve soil drainage', 'Consider repotting'],
        'prevention': ['Well-draining soil', 'Proper watering schedule', 'Monitor soil moisture']
    },
    'aloe_rust': {
        'name': 'Aloe Rust',
        'severity': 'high',
        'description': 'Fungal disease causing rust-colored pustules.',
        'causes': ['High humidity', 'Poor ventilation', 'Infected plant material'],
        'treatments': ['Isolate affected plant', 'Apply fungicide', 'Remove infected tissue'],
        'prevention': ['Quarantine new plants', 'Regular inspection', 'Good air circulation']
    },
    'bacterial_soft_rot': {
        'name': 'Bacterial Soft Rot',
        'severity': 'high',
        'description': 'Bacterial infection causing tissue breakdown.',
        'causes': ['Wounds or damage', 'High moisture', 'Poor hygiene'],
        'treatments': ['Remove damaged tissue', 'Reduce humidity', 'Improve air circulation'],
        'prevention': ['Avoid physical damage', 'Clean tools', 'Proper sanitation']
    },
    'uncertain': {
        'name': 'Uncertain Diagnosis',
        'severity': 'unknown',
        'description': 'Unable to make confident diagnosis from provided image.',
        'causes': ['Poor image quality', 'Unclear symptoms', 'Unusual presentation'],
        'treatments': ['Retake photo with better lighting', 'Focus on affected area', 'Consult plant expert'],
        'prevention': []
    }
}

class AloeDiseaseClassifier:
    def __init__(self):
        self.model = None
        self.confidence_threshold = 0.60
        self.load_model()
    
    def load_model(self):
        """Load the pre-trained CNN model"""
        try:
            model_path = 'models/best_model.h5'
            
            if not os.path.exists(model_path):
                model_path = 'models/final_model.h5'
                logger.info(f"best_model.h5 not found, trying {model_path}")
            
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"Model file not found. Please ensure either "
                    f"'models/best_model.h5' or 'models/final_model.h5' exists."
                )
            
            self.model = keras.models.load_model(model_path)
            logger.info(f"✓ Model loaded successfully from {model_path}")
            logger.info(f"✓ Model input shape: {self.model.input_shape}")
            logger.info(f"✓ Model output shape: {self.model.output_shape}")
            
        except Exception as e:
            logger.error(f"✗ Error loading model: {e}")
            self.model = None
    
    def preprocess_image(self, image_data):
        """Preprocess image for model inference"""
        try:
            if isinstance(image_data, bytes):
                img = Image.open(io.BytesIO(image_data))
            else:
                img = image_data
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
                logger.info(f"Converted image from {img.mode} to RGB")
            
            img = img.resize((224, 224), Image.Resampling.LANCZOS)
            
            img_array = np.array(img)
            img_array = np.expand_dims(img_array, axis=0)
            
            img_array = img_array.astype('float32') / 255.0
            
            logger.info(f"Image preprocessed: shape={img_array.shape}, dtype={img_array.dtype}")
            
            return img_array
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return None
    
    def predict(self, image_data):
        """Make prediction on the input image"""
        try:
            if self.model is None:
                raise Exception("Model not loaded. Please check if model file exists.")
            
            processed_img = self.preprocess_image(image_data)
            if processed_img is None:
                raise Exception("Failed to preprocess image")
            
            predictions = self.model.predict(processed_img, verbose=0)
            predicted_class = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class])
            
            logger.info("=" * 50)
            logger.info("Prediction Results:")
            for idx, prob in enumerate(predictions[0]):
                class_name = DISEASE_CLASSES.get(idx, f"class_{idx}")
                logger.info(f"  {class_name}: {prob:.2%}")
            logger.info(f"Top Prediction: {DISEASE_CLASSES.get(predicted_class)} ({confidence:.2%})")
            logger.info("=" * 50)
            
            if confidence < self.confidence_threshold:
                logger.warning(f"Low confidence ({confidence:.2%}) - below threshold ({self.confidence_threshold:.2%})")
                return {
                    'diseaseKey': 'uncertain',
                    'disease': 'Uncertain Diagnosis',
                    'confidence': round(confidence * 100, 2),
                    'status': 'warning',
                    'severity': 'unknown',
                    'description': f'Prediction confidence ({confidence:.1%}) is too low for reliable diagnosis. Please provide a clearer, well-lit image of the affected area.',
                    'causes': ['Poor image quality', 'Unclear symptoms', 'Unusual presentation', 'Image not focused on plant'],
                    'treatments': [
                        'Retake photo with better lighting',
                        'Focus closely on affected leaf area',
                        'Ensure image is clear and in focus',
                        'Take photo in natural daylight if possible',
                        'Consult a plant expert for manual inspection'
                    ],
                    'prevention': ['Upload high-quality images for better diagnosis'],
                    'all_predictions': {
                        DISEASE_CLASSES[i]: round(float(predictions[0][i]) * 100, 2) 
                        for i in range(len(predictions[0]))
                    }
                }
            
            disease_key = DISEASE_CLASSES.get(predicted_class, 'healthy')
            
            disease_info = DISEASE_INFO.get(disease_key, DISEASE_INFO['healthy'])
            
            if disease_key == 'healthy':
                status = 'healthy'
            elif confidence > 0.8:
                status = 'danger' if disease_info['severity'] == 'high' else 'warning'
            else:
                status = 'warning'
            
            result = {
                'diseaseKey': disease_key,
                'disease': disease_info['name'],
                'confidence': round(confidence * 100, 2),
                'status': status,
                'severity': disease_info['severity'],
                'description': disease_info['description'],
                'causes': disease_info['causes'],
                'treatments': disease_info['treatments'],
                'prevention': disease_info['prevention'],
                'all_predictions': {
                    DISEASE_CLASSES[i]: round(float(predictions[0][i]) * 100, 2) 
                    for i in range(len(predictions[0]))
                }
            }
            
            logger.info(f"✓ Final diagnosis: {disease_info['name']} with {confidence:.2%} confidence")
            
            return result
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            return None

classifier = AloeDiseaseClassifier()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'aloe-disease-classifier',
        'model_loaded': classifier.model is not None,
        'confidence_threshold': classifier.confidence_threshold
    })

@app.route('/model_info', methods=['GET'])
def model_info():
    """Get detailed model information"""
    if classifier.model is None:
        return jsonify({
            'success': False,
            'error': 'Model not loaded',
            'message': 'Please check if model file exists in models/ directory'
        }), 500
    
    return jsonify({
        'success': True,
        'model_loaded': True,
        'input_shape': str(classifier.model.input_shape),
        'output_shape': str(classifier.model.output_shape),
        'total_params': int(classifier.model.count_params()),
        'classes': DISEASE_CLASSES,
        'confidence_threshold': classifier.confidence_threshold,
        'model_summary': classifier.model.to_json()
    })

@app.route('/predict', methods=['POST'])
def predict_disease():
    """Predict aloe disease from image"""
    try:
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image provided',
                'message': 'Please provide an image file in the request'
            }), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No image selected',
                'message': 'Please select an image file'
            }), 400
        
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
        file_ext = image_file.filename.rsplit('.', 1)[-1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': 'Invalid file type',
                'message': f'Allowed types: {", ".join(allowed_extensions)}'
            }), 400
        
        logger.info(f"Processing image: {image_file.filename}")
        
        image_data = image_file.read()
        
        result = classifier.predict(image_data)
        
        if result is None:
            return jsonify({
                'success': False,
                'error': 'Prediction failed',
                'message': 'Failed to process the image. Please try again with a different image.'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"Error in predict endpoint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/predict_url', methods=['POST'])
def predict_from_url():
    """Predict aloe disease from image URL"""
    try:
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                'success': False,
                'error': 'No image URL provided',
                'message': 'Please provide an image_url in the request body'
            }), 400
        
        image_url = data['image_url']
        logger.info(f"Downloading image from: {image_url}")
        
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        result = classifier.predict(response.content)
        
        if result is None:
            return jsonify({
                'success': False,
                'error': 'Prediction failed',
                'message': 'Failed to process the image from URL'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error downloading image: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to download image',
            'message': 'Could not fetch image from URL. Please check the URL and try again.'
        }), 400
        
    except Exception as e:
        logger.error(f"Error in predict_url endpoint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/diseases', methods=['GET'])
def get_disease_info():
    """Get information about all supported diseases"""
    return jsonify({
        'success': True,
        'data': DISEASE_INFO
    })

@app.route('/set_threshold', methods=['POST'])
def set_confidence_threshold():
    """Update confidence threshold (for testing/tuning)"""
    try:
        data = request.get_json()
        
        if not data or 'threshold' not in data:
            return jsonify({
                'success': False,
                'error': 'No threshold provided',
                'message': 'Please provide a threshold value (0.0 to 1.0)'
            }), 400
        
        threshold = float(data['threshold'])
        
        if not 0.0 <= threshold <= 1.0:
            return jsonify({
                'success': False,
                'error': 'Invalid threshold',
                'message': 'Threshold must be between 0.0 and 1.0'
            }), 400
        
        old_threshold = classifier.confidence_threshold
        classifier.confidence_threshold = threshold
        
        logger.info(f"Confidence threshold updated: {old_threshold:.2f} -> {threshold:.2f}")
        
        return jsonify({
            'success': True,
            'message': 'Confidence threshold updated',
            'old_threshold': old_threshold,
            'new_threshold': threshold
        })
        
    except Exception as e:
        logger.error(f"Error setting threshold: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info("=" * 60)
    logger.info("Starting Aloe Disease Classification Service")
    logger.info(f"Port: {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Model loaded: {classifier.model is not None}")
    logger.info(f"Confidence threshold: {classifier.confidence_threshold:.2%}")
    logger.info("=" * 60)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
