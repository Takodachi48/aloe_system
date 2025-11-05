# AloeShield ML Service

This is the CNN-based machine learning service for AloeShield disease detection system.

## Features

- **CNN-based Disease Classification**: Uses a convolutional neural network to classify aloe vera diseases
- **RESTful API**: Provides HTTP endpoints for image analysis
- **Multiple Input Formats**: Supports both file uploads and image URLs
- **Fallback Mechanism**: Graceful degradation when ML service is unavailable
- **Disease Information**: Comprehensive database of aloe vera diseases and treatments

## Supported Diseases

1. **Healthy** - No visible signs of disease
2. **Leaf Spot** - Fungal infection causing circular spots
3. **Root Rot** - Root system damage from excessive moisture
4. **Sunburn** - Tissue damage from excessive sun exposure

## API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the ML service.

### Predict from File Upload
```
POST /predict
Content-Type: multipart/form-data

Body: image file
```
Analyzes an uploaded image file and returns disease prediction.

### Predict from URL
```
POST /predict_url
Content-Type: application/json

Body: {"image_url": "https://example.com/image.jpg"}
```
Analyzes an image from a URL and returns disease prediction.

### Get Disease Information
```
GET /diseases
```
Returns comprehensive information about all supported diseases.

## Setup Instructions

### Prerequisites
- Python 3.6 or higher
- pip package manager

### Installation

#### Windows
```bash
# Run the setup script
setup.bat
```

#### Linux/macOS
```bash
# Make script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

#### Manual Installation
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running the Service

#### Development Mode
```bash
# Activate virtual environment first
python app.py
```

#### Production Mode
```bash
python run.py
```

The service will start on `http://localhost:5000` by default.

## Configuration

Set environment variables to configure the service:

- `PORT`: Port number (default: 5000)
- `DEBUG`: Enable debug mode (default: false)

## Model Architecture

The current implementation uses MobileNetV2 transfer learning for improved accuracy:

- **Base Model**: MobileNetV2 pre-trained on ImageNet
- **Input**: 224x224x3 RGB images
- **Architecture**:
  - MobileNetV2 base (frozen during initial training)
  - Global Average Pooling
  - Dense layer (512 units) with ReLU activation
  - Dropout (0.5) for regularization
  - Dense output layer (5 units) with softmax activation
- **Output**: 4 classes (healthy + 3 disease types)
- **Benefits**: Better feature extraction, faster training, improved accuracy

## Integration with Node.js Backend

The ML service is integrated with the Node.js backend through the `mlService.js` module:

```javascript
const mlService = require('../services/mlService');

// Predict disease from Cloudinary URL
const result = await mlService.predictFromUrl(imageUrl);
```

## Error Handling

The service includes comprehensive error handling:

- **Connection Errors**: Fallback to mock predictions
- **Image Processing Errors**: Graceful error responses
- **Model Loading Errors**: Service continues with fallback mode

## Development

### Adding New Diseases

1. Update `DISEASE_CLASSES` mapping
2. Add disease information to `DISEASE_INFO`
3. Retrain model with new classes
4. Update model architecture if needed

### Training a New Model

1. Prepare your dataset with labeled images
2. Update the model architecture in `create_model()`
3. Implement training script
4. Save trained model weights

## Production Deployment

For production deployment:

1. Use Gunicorn for WSGI server
2. Set up proper logging
3. Configure reverse proxy (nginx)
4. Set up monitoring and health checks
5. Use containerization (Docker)

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **Model Loading Errors**: Check TensorFlow installation
3. **Memory Issues**: Reduce batch size or image resolution
4. **Connection Errors**: Check network connectivity

### Logs

The service logs important events:
- Model loading status
- Prediction requests
- Error messages
- Performance metrics

## License

This project is part of the AloeShield system and follows the same license terms.
