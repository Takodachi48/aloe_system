# AloeShield System Setup Guide

This guide covers setting up and running the complete AloeShield system with integrated ML disease detection.

## Prerequisites

Before starting, ensure you have:
- **Node.js** v16.0.0 or higher ([Download](https://nodejs.org/))
- **Python** 3.8 or higher ([Download](https://www.python.org/))
- **npm** (comes with Node.js)
- **MongoDB** for database ([Download](https://www.mongodb.com/try/download/community))

## Project Structure

```
aloe/
├── aloe_sys-main/              # Main application (Node.js + ML integration)
│   └── backend/
│       ├── ml_service/         # Python ML service (integrated)
│       ├── routes/             # Express routes
│       ├── services/           # mlService.js (ML integration)
│       └── package.json        # Node dependencies
├── ml_training/                # ML training utilities (separate folder)
│   ├── train_model.py          # Model training script
│   ├── organize_dataset.py     # Dataset organization script
│   └── requirements.txt        # Python ML training dependencies
├── install-all.bat             # Windows setup script
├── install-all.sh              # Linux/macOS setup script
├── run-all.bat                 # Windows run script
└── run-all.sh                  # Linux/macOS run script
```

## Quick Start

### Windows

1. **Install all dependencies**:
   ```cmd
   install-all.bat
   ```

2. **Start all services**:
   ```cmd
   run-all.bat
   ```

### Linux/macOS

1. **Make scripts executable**:
   ```bash
   chmod +x install-all.sh run-all.sh
   ```

2. **Install all dependencies**:
   ```bash
   ./install-all.sh
   ```

3. **Start all services**:
   ```bash
   ./run-all.sh
   ```

## What Gets Installed

### Node.js Components
- Express.js backend server
- MongoDB driver
- Image processing libraries (Sharp)
- Authentication (JWT)
- File upload handling (Multer, Cloudinary)
- Testing frameworks (Jest, Supertest)

### Python Components
- Flask web framework
- TensorFlow/Keras for ML
- NumPy and SciPy for numerical processing
- OpenCV for image processing
- Scikit-learn for metrics
- Gunicorn for production deployment

## Configuration

### Backend Environment (.env)

Create a `.env` file in `aloe_sys-main/backend/`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=aloeshield

# ML Service
ML_SERVICE_URL=http://localhost:5000

# Cloudinary (for image uploads)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret_key

# App
NODE_ENV=development
PORT=3000
```

### Python ML Service

The ML service automatically loads models from `aloe_sys-main/backend/ml_service/models/`:
- `best_model.h5` - Best trained model
- `final_model.h5` - Final training model

If no model exists, the service will still run but will report that the model is not loaded.

## Running Services

### Start Everything at Once
```bash
# Windows
run-all.bat

# Linux/macOS
./run-all.sh
```

This will:
1. Start Node.js backend on `http://localhost:3000`
2. Start Python ML service on `http://localhost:5000`

### Start Services Individually

**Backend (Node.js)**:
```bash
cd aloe_sys-main/backend
npm start
```

**ML Service (Python)**:
```bash
cd aloe_sys-main/backend/ml_service
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate.bat  # Windows

python app.py
```

**ML Training** (separate utility):
```bash
cd ml_training
source venv/bin/activate  # Linux/macOS
python train_model.py --dataset_path datasets/
```

## API Endpoints

### Backend API (Port 3000)

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/upload` - Upload image
- `POST /api/analysis/analyze` - Analyze uploaded image
- `GET /api/analysis/:analysisId` - Get analysis results
- `GET /api/analysis/diseases/info` - Get disease information

### ML Service API (Port 5000)

- `GET /health` - Health check
- `POST /predict` - Predict from image file
- `POST /predict_url` - Predict from image URL
- `GET /diseases` - Get disease database
- `POST /set_threshold` - Update confidence threshold

## Integration Flow

1. **User uploads image** → Backend receives upload
2. **Image stored on Cloudinary** → Gets public URL
3. **Backend calls ML Service** → `POST /predict_url` with Cloudinary URL
4. **ML Service predicts disease** → Returns diagnosis, confidence, treatment info
5. **Backend saves analysis** → Stores in MongoDB
6. **Frontend shows results** → User sees diagnosis and recommendations

## Troubleshooting

### "Node.js not found"
- Ensure Node.js is installed and in PATH
- Verify: `node --version` and `npm --version`

### "Python not found"
- Ensure Python 3.8+ is installed and in PATH
- Verify: `python --version` or `python3 --version`

### "Cannot connect to MongoDB"
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify MongoDB is accessible on localhost:27017

### "ML Service not responding"
- Check if Python service started successfully
- Verify port 5000 is not in use
- Check ML service logs for errors

### "Model not loaded"
- Place trained model files in `ml_service/models/`
- Files should be named: `best_model.h5` or `final_model.h5`
- See ML Training section below

## Training a New Model

Place your dataset in the `ml_training/datasets/` folder with structure:
```
datasets/
├── train/
│   ├── healthy/
│   ├── leaf_spot/
│   ├── root_rot/
│   ├── aloe_rust/
│   └── bacterial_soft_rot/
├── validation/
│   ├── healthy/
│   └── ...
└── test/
    ├── healthy/
    └── ...
```

Train the model:
```bash
cd ml_training
python train_model.py --epochs 50 --batch_size 32
```

Copy trained model to ML service:
```bash
cp models/best_model.h5 ../aloe_sys-main/backend/ml_service/models/
```

## Development Workflow

### Adding Features

1. **Backend changes**:
   ```bash
   cd aloe_sys-main/backend
   npm run dev  # Uses nodemon for auto-reload
   ```

2. **ML Service changes**:
   ```bash
   cd aloe_sys-main/backend/ml_service
   source venv/bin/activate
   DEBUG=true python app.py
   ```

### Running Tests

**Backend tests**:
```bash
cd aloe_sys-main/backend
npm test
```

### Code Quality

**Lint check**:
```bash
cd aloe_sys-main/backend
npm run lint  # If configured
```

## Production Deployment

For production:

1. **Use Gunicorn for ML Service**:
   ```bash
   python run.py
   ```

2. **Use production mode for Node.js**:
   ```bash
   NODE_ENV=production npm start
   ```

3. **Use process manager** (e.g., PM2):
   ```bash
   npm install -g pm2
   pm2 start aloe_sys-main/backend/server.js --name "aloeshield-backend"
   pm2 start aloe_sys-main/backend/ml_service/run.py --name "aloeshield-ml"
   ```

## Key Features

✅ **Integrated ML Service** - CNN-based disease classification  
✅ **Unified Installation** - Single command setup  
✅ **Unified Execution** - Start all services at once  
✅ **Separated Training Utils** - ML training isolated in `ml_training/` folder  
✅ **Fallback Mechanism** - Works without ML service (uses mock predictions)  
✅ **Health Checks** - Monitor service status  
✅ **Database Integration** - Save analysis results to MongoDB  
✅ **Cloud Storage** - Image storage with Cloudinary  

## Support

For issues or questions:
1. Check logs in the respective service directories
2. Verify all prerequisites are installed
3. Ensure .env file is properly configured
4. Check that required services (MongoDB) are running

## Next Steps

1. ✅ Install dependencies: `install-all.bat` or `./install-all.sh`
2. ✅ Configure `.env` file with your credentials
3. ✅ Start services: `run-all.bat` or `./run-all.sh`
4. ✅ Train ML model or use existing model
5. ✅ Access frontend at: http://localhost:3000

---

Last Updated: October 2025
