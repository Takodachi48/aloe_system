const axios = require('axios');
const FormData = require('form-data');

class MLService {
    constructor() {
        this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        this.timeout = 30000;
    }

    async healthCheck() {
        try {
            const response = await axios.get(`${this.mlServiceUrl}/health`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error('ML service health check failed:', error.message);
            return null;
        }
    }

    async predictFromUrl(imageUrl) {
        try {
            console.log('Making prediction request to ML service for URL:', imageUrl);
            
            const response = await axios.post(`${this.mlServiceUrl}/predict_url`, {
                image_url: imageUrl
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                console.log('ML prediction successful:', response.data.data.disease);
                console.log('Full ML response data:', JSON.stringify(response.data.data));
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Prediction failed');
            }
        } catch (error) {
            console.error('ML prediction error:', error.message);
            throw error;
        }
    }

    async predictFromBuffer(imageBuffer, filename = 'image.jpg') {
        try {
            console.log('Making prediction request to ML service for buffer');
            
            const formData = new FormData();
            formData.append('image', imageBuffer, {
                filename: filename,
                contentType: 'image/jpeg'
            });

            const response = await axios.post(`${this.mlServiceUrl}/predict`, formData, {
                timeout: this.timeout,
                headers: {
                    ...formData.getHeaders()
                }
            });

            if (response.data.success) {
                console.log('ML prediction successful:', response.data.data.disease);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Prediction failed');
            }
        } catch (error) {
            console.error('ML prediction error:', error.message);
            throw error;
        }
    }

    async getDiseaseInfo() {
        try {
            const response = await axios.get(`${this.mlServiceUrl}/diseases`, {
                timeout: 5000
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error('Failed to get disease information');
            }
        } catch (error) {
            console.error('Error getting disease info from ML service:', error.message);
            throw error;
        }
    }

    getFallbackPrediction() {
        const diseases = ['healthy', 'leaf_spot', 'root_rot', 'aloe_rust', 'bacterial_soft_rot'];
        const selectedDisease = diseases[Math.floor(Math.random() * diseases.length)];
        const confidence = Math.floor(Math.random() * 20) + 80;

        const diseaseInfo = this.getFallbackDiseaseInfo()[selectedDisease];
        const status = selectedDisease === 'healthy' ? 'healthy' : 
                      confidence > 85 ? 'warning' : 'danger';

        return {
            diseaseKey: selectedDisease,
            disease: diseaseInfo.name,
            confidence: confidence,
            status: status,
            severity: diseaseInfo.severity,
            description: diseaseInfo.description,
            causes: diseaseInfo.causes,
            treatments: diseaseInfo.treatments,
            prevention: diseaseInfo.prevention
        };
    }

    getFallbackDiseaseInfo() {
        return {
            'healthy': {
                name: 'Healthy',
                severity: 'low',
                description: 'Plant appears healthy with no visible signs of disease or stress.',
                causes: [],
                treatments: ['Maintain current watering schedule', 'Ensure adequate sunlight', 'Monitor regularly'],
                prevention: ['Regular inspection', 'Proper watering', 'Good drainage']
            },
            'leaf_spot': {
                name: 'Leaf Spot',
                severity: 'medium',
                description: 'Fungal infection causing circular spots on leaves.',
                causes: ['High humidity', 'Poor air circulation', 'Overwatering'],
                treatments: ['Remove affected leaves', 'Apply fungicide treatment', 'Improve ventilation'],
                prevention: ['Avoid overhead watering', 'Ensure good air circulation', 'Remove fallen debris']
            },
            'root_rot': {
                name: 'Root Rot',
                severity: 'high',
                description: 'Root system damage from excessive moisture.',
                causes: ['Overwatering', 'Poor drainage', 'Contaminated soil'],
                treatments: ['Reduce watering frequency', 'Improve soil drainage', 'Consider repotting'],
                prevention: ['Well-draining soil', 'Proper watering schedule', 'Monitor soil moisture']
            },
            'aloe_rust': {
                name: 'Aloe Rust',
                severity: 'high',
                description: 'Fungal disease causing rust-colored pustules.',
                causes: ['High humidity', 'Poor ventilation', 'Infected plant material'],
                treatments: ['Isolate affected plant', 'Apply fungicide', 'Remove infected tissue'],
                prevention: ['Quarantine new plants', 'Regular inspection', 'Good air circulation']
            },
            'bacterial_soft_rot': {
                name: 'Bacterial Soft Rot',
                severity: 'high',
                description: 'Bacterial infection causing tissue breakdown.',
                causes: ['Wounds or damage', 'High moisture', 'Poor hygiene'],
                treatments: ['Remove damaged tissue', 'Reduce humidity', 'Improve air circulation'],
                prevention: ['Avoid physical damage', 'Clean tools', 'Proper sanitation']
            }
        };
    }
}

module.exports = new MLService();
