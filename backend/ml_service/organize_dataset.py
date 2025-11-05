#!/usr/bin/env python3
"""
Dataset Organization Script for AloeShield
This script helps organize your aloe vera disease images into the correct folder structure.
"""

import os
import shutil
import argparse
from pathlib import Path

def organize_dataset(source_dir, target_dir='datasets', train_ratio=0.7, val_ratio=0.2, test_ratio=0.1):
    """
    Organize dataset into train/validation/test splits
    
    Args:
        source_dir: Directory containing your images organized by class
        target_dir: Target directory for organized dataset
        train_ratio: Ratio of images for training (default: 0.7)
        val_ratio: Ratio of images for validation (default: 0.2)
        test_ratio: Ratio of images for testing (default: 0.1)
    """
    
    # Verify ratios add up to 1.0
    if abs(train_ratio + val_ratio + test_ratio - 1.0) > 0.01:
        raise ValueError("Train, validation, and test ratios must sum to 1.0")
    
    # Create target directory structure
    splits = ['train', 'validation', 'test']
    classes = ['healthy', 'leaf_spot', 'root_rot', 'sunburn']
    
    for split in splits:
        for class_name in classes:
            os.makedirs(os.path.join(target_dir, split, class_name), exist_ok=True)
    
    # Process each class directory in source
    for class_name in classes:
        source_class_dir = os.path.join(source_dir, class_name)
        
        if not os.path.exists(source_class_dir):
            print(f"Warning: Class directory {source_class_dir} not found. Skipping...")
            continue
        
        # Get all image files
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.webp']:
            image_files.extend(Path(source_class_dir).glob(ext))
            image_files.extend(Path(source_class_dir).glob(ext.upper()))
        
        if not image_files:
            print(f"Warning: No images found in {source_class_dir}. Skipping...")
            continue
        
        # Shuffle and split
        import random
        random.shuffle(image_files)
        
        total_images = len(image_files)
        train_count = int(total_images * train_ratio)
        val_count = int(total_images * val_ratio)
        
        # Split files
        train_files = image_files[:train_count]
        val_files = image_files[train_count:train_count + val_count]
        test_files = image_files[train_count + val_count:]
        
        # Copy files to respective directories
        for file_list, split_name in [(train_files, 'train'), (val_files, 'validation'), (test_files, 'test')]:
            for img_file in file_list:
                target_path = os.path.join(target_dir, split_name, class_name, img_file.name)
                shutil.copy2(img_file, target_path)
        
        print(f"Processed {class_name}:")
        print(f"  Total images: {total_images}")
        print(f"  Training: {len(train_files)}")
        print(f"  Validation: {len(val_files)}")
        print(f"  Testing: {len(test_files)}")
        print()

def create_sample_dataset():
    """Create a sample dataset structure with placeholder files"""
    print("Creating sample dataset structure...")
    
    classes = ['healthy', 'leaf_spot', 'root_rot', 'sunburn']
    splits = ['train', 'validation', 'test']
    
    for split in splits:
        for class_name in classes:
            dir_path = os.path.join('datasets', split, class_name)
            os.makedirs(dir_path, exist_ok=True)
            
            # Create a README file in each directory
            readme_path = os.path.join(dir_path, 'README.txt')
            with open(readme_path, 'w') as f:
                f.write(f"Place your {class_name} images in this directory.\n")
                f.write(f"Supported formats: JPG, PNG, WebP\n")
                f.write(f"Minimum size: 224x224 pixels\n")
                f.write(f"Recommended: 50+ images per class for training\n")
    
    print("Sample dataset structure created!")
    print("Please add your images to the appropriate directories.")
    print("\nDirectory structure:")
    print("datasets/")
    print("├── train/")
    for class_name in classes:
        print(f"│   ├── {class_name}/")
    print("├── validation/")
    for class_name in classes:
        print(f"│   ├── {class_name}/")
    print("└── test/")
    for class_name in classes:
        print(f"    ├── {class_name}/")

def main():
    parser = argparse.ArgumentParser(description='Organize AloeShield dataset')
    parser.add_argument('--source', type=str, help='Source directory containing images organized by class')
    parser.add_argument('--target', type=str, default='datasets', help='Target directory for organized dataset')
    parser.add_argument('--train_ratio', type=float, default=0.7, help='Ratio of images for training')
    parser.add_argument('--val_ratio', type=float, default=0.2, help='Ratio of images for validation')
    parser.add_argument('--test_ratio', type=float, default=0.1, help='Ratio of images for testing')
    parser.add_argument('--create_sample', action='store_true', help='Create sample dataset structure')
    
    args = parser.parse_args()
    
    if args.create_sample:
        create_sample_dataset()
    elif args.source:
        if not os.path.exists(args.source):
            print(f"Error: Source directory {args.source} does not exist!")
            return
        
        print(f"Organizing dataset from {args.source} to {args.target}")
        organize_dataset(args.source, args.target, args.train_ratio, args.val_ratio, args.test_ratio)
        print("Dataset organization complete!")
    else:
        print("Please specify either --source directory or --create_sample")
        print("\nExamples:")
        print("  python organize_dataset.py --create_sample")
        print("  python organize_dataset.py --source /path/to/your/images")
        print("\nFor help: python organize_dataset.py --help")

if __name__ == '__main__':
    main()
