#!/usr/bin/env python3
"""
Training script for AloeShield CNN model
This script trains a CNN model using your dataset for aloe vera disease classification.
"""

import os
import sys
import argparse
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.applications import EfficientNetB4
from tensorflow.keras.applications.efficientnet import preprocess_input
from tensorflow.keras import regularizers
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight
import seaborn as sns
import numpy as np

# Set up logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AloeDiseaseTrainer:
    def __init__(self, dataset_path, output_dir='models'):
        self.dataset_path = dataset_path
        self.output_dir = output_dir
        self.model = None
        self.history = None
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Model parameters
        self.img_size = (224, 224)
        self.batch_size = 16
        self.epochs = 50
        
        # Disease classes
        self.classes = ['healthy', 'leaf_spot', 'root_rot', 'sunburn']
        
    def create_model(self):
        """Create EfficientNetB4-based transfer learning model architecture with fine-tuning"""
        logger.info("Loading EfficientNetB4 base model...")

        # Load EfficientNetB4 without top layers, training from scratch for RGB images
        base_model = EfficientNetB4(
            weights=None,
            include_top=False,
            input_shape=(224, 224, 3)
        )

        # Unfreeze more layers for better fine-tuning (last 100 layers)
        base_model.trainable = True
        for layer in base_model.layers[:-100]:
            layer.trainable = False
        logger.info("Last 100 layers of EfficientNetB4 unfrozen for fine-tuning")

        # Add custom classification head with L2 regularization
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(512, activation='relu', kernel_regularizer=regularizers.l2(0.001))(x)
        x = Dropout(0.5)(x)
        predictions = Dense(4, activation='softmax', kernel_regularizer=regularizers.l2(0.001))(x)

        # Create the full model
        model = Model(inputs=base_model.input, outputs=predictions)

        # Compile the model with lower learning rate for fine-tuning
        model.compile(
            optimizer=Adam(learning_rate=0.0001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )

        logger.info("EfficientNetB4 fine-tuning model created")
        return model
    
    def prepare_data(self):
        """Prepare training and validation data with enhanced EfficientNetB4 preprocessing"""
        # Enhanced data augmentation for training with EfficientNetB4 preprocessing
        train_datagen = ImageDataGenerator(
            preprocessing_function=preprocess_input,
            rotation_range=30,
            width_shift_range=0.2,
            height_shift_range=0.2,
            brightness_range=[0.8, 1.2],
            channel_shift_range=0.1,
            horizontal_flip=True,
            vertical_flip=True,
            zoom_range=0.3,
            shear_range=0.2,
            fill_mode='nearest'
        )

        # No augmentation for validation, but with EfficientNetB4 preprocessing
        validation_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)

        # Training data
        train_generator = train_datagen.flow_from_directory(
            os.path.join(self.dataset_path, 'train'),
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            color_mode='rgb',
            shuffle=True
        )

        # Validation data
        validation_generator = validation_datagen.flow_from_directory(
            os.path.join(self.dataset_path, 'validation'),
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            color_mode='rgb',
            shuffle=False
        )

        return train_generator, validation_generator
    
    def train(self):
        """Train the model"""
        logger.info("Creating model architecture...")
        self.model = self.create_model()
        
        logger.info("Preparing data...")
        train_gen, val_gen = self.prepare_data()
        
        # Print model summary
        self.model.summary()
        
        # Callbacks
        callbacks = [
            ModelCheckpoint(
                filepath=os.path.join(self.output_dir, 'best_model.h5'),
                monitor='val_accuracy',
                save_best_only=True,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=7,
                min_lr=0.00001,
                verbose=1
            )
        ]
        
        # Compute class weights to handle imbalances
        class_weights = compute_class_weight(
            class_weight='balanced',
            classes=np.unique(train_gen.classes),
            y=train_gen.classes
        )
        class_weights_dict = dict(enumerate(class_weights))
        logger.info(f"Class weights: {class_weights_dict}")

        logger.info("Starting training...")
        self.history = self.model.fit(
            train_gen,
            epochs=self.epochs,
            validation_data=val_gen,
            class_weight=class_weights_dict,
            callbacks=callbacks,
            verbose=1
        )
        
        # Save final model
        self.model.save(os.path.join(self.output_dir, 'final_model.h5'))
        logger.info(f"Model saved to {self.output_dir}")
        
        return self.history
    
    def evaluate(self):
        """Evaluate the model with EfficientNetB4 preprocessing"""
        logger.info("Evaluating model...")

        # Prepare test data with EfficientNetB4 preprocessing
        test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
        test_generator = test_datagen.flow_from_directory(
            os.path.join(self.dataset_path, 'test'),
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            color_mode='rgb',
            shuffle=False
        )

        # Get predictions
        predictions = self.model.predict(test_generator)
        predicted_classes = np.argmax(predictions, axis=1)
        true_classes = test_generator.classes

        # Print classification report
        print("\nClassification Report:")
        print(classification_report(true_classes, predicted_classes,
                                  target_names=self.classes))

        # Plot confusion matrix
        cm = confusion_matrix(true_classes, predicted_classes)
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=self.classes, yticklabels=self.classes)
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'confusion_matrix.png'))
        plt.show()

        return predictions, true_classes
    
    def plot_training_history(self):
        """Plot training history"""
        if self.history is None:
            logger.error("No training history available. Train the model first.")
            return
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
        
        # Plot accuracy
        ax1.plot(self.history.history['accuracy'], label='Training Accuracy')
        ax1.plot(self.history.history['val_accuracy'], label='Validation Accuracy')
        ax1.set_title('Model Accuracy')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Accuracy')
        ax1.legend()
        
        # Plot loss
        ax2.plot(self.history.history['loss'], label='Training Loss')
        ax2.plot(self.history.history['val_loss'], label='Validation Loss')
        ax2.set_title('Model Loss')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Loss')
        ax2.legend()
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'training_history.png'))
        plt.show()

def main():
    parser = argparse.ArgumentParser(description='Train AloeShield CNN model')
    parser.add_argument('--dataset_path', type=str, default='datasets',
                       help='Path to dataset directory')
    parser.add_argument('--output_dir', type=str, default='models',
                       help='Output directory for trained models')
    parser.add_argument('--epochs', type=int, default=50,
                       help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=32,
                       help='Batch size for training')
    
    args = parser.parse_args()
    
    # Check if dataset exists
    if not os.path.exists(args.dataset_path):
        logger.error(f"Dataset path {args.dataset_path} does not exist!")
        logger.info("Please create the dataset structure as described in dataset_structure.md")
        sys.exit(1)
    
    # Check if required directories exist
    required_dirs = ['train', 'validation', 'test']
    for dir_name in required_dirs:
        dir_path = os.path.join(args.dataset_path, dir_name)
        if not os.path.exists(dir_path):
            logger.error(f"Required directory {dir_path} does not exist!")
            sys.exit(1)
    
    # Initialize trainer
    trainer = AloeDiseaseTrainer(args.dataset_path, args.output_dir)
    trainer.epochs = args.epochs
    trainer.batch_size = args.batch_size
    
    # Train the model
    try:
        trainer.train()
        trainer.evaluate()
        trainer.plot_training_history()
        logger.info("Training completed successfully!")
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
