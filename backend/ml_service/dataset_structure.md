# ML Dataset Structure for AloeShield

## Dataset Organization

Create your dataset in the following structure:

```
backend/ml_service/
├── datasets/
│   ├── train/
│   │   ├── healthy/
│   │   │   ├── healthy_001.jpg
│   │   │   ├── healthy_002.jpg
│   │   │   └── ...
│   │   ├── leaf_spot/
│   │   │   ├── leaf_spot_001.jpg
│   │   │   ├── leaf_spot_002.jpg
│   │   │   └── ...
│   │   ├── root_rot/
│   │   │   ├── root_rot_001.jpg
│   │   │   ├── root_rot_002.jpg
│   │   │   └── ...
│   │   ├── aloe_rust/
│   │   │   ├── aloe_rust_001.jpg
│   │   │   ├── aloe_rust_002.jpg
│   │   │   └── ...
│   │   └── bacterial_soft_rot/
│   │       ├── bacterial_001.jpg
│   │       ├── bacterial_002.jpg
│   │       └── ...
│   ├── validation/
│   │   ├── healthy/
│   │   ├── leaf_spot/
│   │   ├── root_rot/
│   │   ├── aloe_rust/
│   │   └── bacterial_soft_rot/
│   └── test/
│       ├── healthy/
│       ├── leaf_spot/
│       ├── root_rot/
│       ├── aloe_rust/
│       └── bacterial_soft_rot/
```

## Dataset Requirements

### Image Specifications:
- **Format**: JPEG, PNG, or WebP
- **Size**: Minimum 224x224 pixels (will be resized automatically)
- **Quality**: Clear, well-lit images
- **Quantity**: Minimum 50 images per class for basic training

### Recommended Dataset Sizes:
- **Training**: 70-80% of total images
- **Validation**: 15-20% of total images  
- **Test**: 10-15% of total images

### Image Quality Guidelines:
1. **Clear Focus**: Images should be sharp and in focus
2. **Good Lighting**: Well-lit images without shadows
3. **Proper Angle**: Images showing the affected areas clearly
4. **Consistent Background**: Similar backgrounds across classes
5. **Multiple Perspectives**: Different angles and distances

## How to Upload/Add Your Dataset

### Option 1: Direct File System (Recommended for Development)
1. Create the folder structure above in `backend/ml_service/datasets/`
2. Copy your images into the appropriate class folders
3. Ensure proper naming conventions

### Option 2: Use the Training Script
Run the training script which will help organize your dataset:
```bash
cd backend/ml_service
python train_model.py --dataset_path /path/to/your/images --output_dir datasets/
```

### Option 3: Dataset Upload via API (Future Feature)
We can implement an API endpoint for dataset uploads if needed.

## Current Model Training

The current implementation uses a placeholder model. To train with your dataset:

1. **Prepare your dataset** in the structure above
2. **Run the training script**:
   ```bash
   cd backend/ml_service
   python train_model.py
   ```
3. **The trained model** will be saved and automatically loaded by the ML service

## Dataset Sources

### Recommended Sources for Aloe Vera Disease Images:
1. **Plant Disease Databases**:
   - PlantVillage Dataset
   - PlantNet Database
   - Kaggle Plant Disease Datasets

2. **Research Papers**:
   - Academic papers with disease images
   - University extension services
   - Agricultural research institutions

3. **Your Own Collection**:
   - Photos of actual diseased plants
   - Controlled environment photography
   - Multiple lighting conditions

## Next Steps

1. **Collect Dataset**: Gather images for each disease class
2. **Organize Structure**: Place images in the correct folder structure
3. **Train Model**: Run the training script with your dataset
4. **Test Performance**: Validate the model with test images
5. **Deploy**: The trained model will automatically be used by the system

## Example Commands

```bash
# Navigate to ML service directory
cd backend/ml_service

# Create dataset structure
mkdir -p datasets/{train,validation,test}/{healthy,leaf_spot,root_rot,aloe_rust,bacterial_soft_rot}

# Copy your images to appropriate folders
cp /path/to/healthy/images/* datasets/train/healthy/
cp /path/to/diseased/images/* datasets/train/leaf_spot/

# Train the model
python train_model.py --epochs 50 --batch_size 32
```
