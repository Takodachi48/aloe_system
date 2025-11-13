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
                mimeType: uploadData.mimetype,
                potName: uploadData.potName
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
    },

    async updatePotName(analysisId, potName) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/${analysisId}/pot-name`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ potName })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update pot name');
        }

        return response.json();
    },

    async getWeatherByCoordinates(latitude, longitude) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/weather/by-coordinates?latitude=${latitude}&longitude=${longitude}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch weather');
        }

        return response.json();
    },

    async getWeatherByCity(city) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/weather/by-city?city=${encodeURIComponent(city)}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch weather');
        }

        return response.json();
    }
    ,
    async createTreatmentPlan({ analysisId, diseaseKey, diseaseName, imageUrl, potName }) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ analysisId, diseaseKey, diseaseName, imageUrl, potName })
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to create plan');
        return response.json();
    },
    async getTreatmentPlans(status) {
        const url = new URL(`${AppState.apiBaseUrl}/api/treatment-plans`);
        if (status) url.searchParams.set('status', status);
        const response = await fetch(url.toString(), { headers: getAuthHeaders() });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch plans');
        return response.json();
    },
    async getTreatmentPlansByAnalysis(analysisId) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans/by-analysis/${analysisId}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch plans');
        return response.json();
    },
    async getTreatmentPlan(planId) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans/${planId}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch plan');
        return response.json();
    },
    async toggleTreatmentTask(planId, dayNumber, taskId) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans/${planId}/day/${dayNumber}/task/${taskId}`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to update task');
        return response.json();
    },
    async setAfterPhoto(planId, imageUrl) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans/${planId}/after-photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ imageUrl })
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to set after photo');
        return response.json();
    },
    async saveTreatmentNotes(planId, dayNumber, notes) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans/${planId}/day/${dayNumber}/notes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ notes })
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to save notes');
        return response.json();
    },
    async setReminders(planId, enabled) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans/${planId}/reminders`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ enabled })
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to update reminders');
        return response.json();
    },
    async evaluateTreatmentPlan(planId, imageUrl) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/treatment-plans/${planId}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: imageUrl ? JSON.stringify({ imageUrl }) : null
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to evaluate plan');
        return response.json();
    }
};

export default ApiService;
