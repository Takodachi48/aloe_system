import { AppState } from '../core/state.js';
import { getAuthHeaders } from './auth.js';

export const ApiService = {
    async uploadImage(file, context = 'analysis') {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${AppState.apiBaseUrl}/api/upload/${context}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        return response.json();
    },

    async analyzeImage(uploadData) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                filename: uploadData.filename,
                originalName: uploadData.originalName,
                fileSize: uploadData.size,
                mimeType: uploadData.mimetype
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Analysis failed');
        }

        return response.json();
    },

    async getAnalysisHistory(page = 1, limit = 20) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/history?page=${page}&limit=${limit}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch history');
        }

        return response.json();
    },

    async getAnalysisById(analysisId) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/${analysisId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch analysis');
        }

        return response.json();
    },

    async getDiseaseInfo() {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/diseases/info`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch disease information');
        }

        return response.json();
    },

    async deleteAnalysis(analysisId) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/${analysisId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete analysis');
        }

        return response.json();
    }
};

export default ApiService;
