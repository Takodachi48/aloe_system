import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showError, showSuccess } from '../../utils/ui.js';

let currentWeatherData = null;
let currentLocation = null;
let availableDiseases = [];

export async function initWeatherPage() {
    attachWeatherEventListeners();
    
    try {
        await loadAvailableDiseases();
    } catch (error) {
        console.error('Failed to load available diseases:', error);
    }
    
    currentLocation = localStorage.getItem('weatherLocation');
    const savedCoordinates = JSON.parse(localStorage.getItem('weatherCoordinates') || 'null');
    
    if (currentLocation) {
        loadWeatherData(currentLocation).catch(() => {
            displayLocationPrompt();
        });
    } else if (savedCoordinates && savedCoordinates.latitude && savedCoordinates.longitude) {
        loadWeatherByCoordinatesWithCache(savedCoordinates.latitude, savedCoordinates.longitude).catch(() => {
            displayLocationPrompt();
        });
    } else {
        displayLocationPrompt();
    }
}

async function loadAvailableDiseases() {
    try {
        const response = await ApiService.getDiseaseInfo();
        if (response.success && response.data) {
            availableDiseases = response.data.filter(disease => disease.key !== 'healthy');
        }
    } catch (error) {
        console.error('Error loading diseases:', error);
        availableDiseases = [];
    }
}

function attachWeatherEventListeners() {
    const setLocationBtn = document.getElementById('setLocationBtn');
    if (setLocationBtn) {
        setLocationBtn.addEventListener('click', promptForLocation);
    }

    const useGeolocationBtn = document.getElementById('useGeolocationBtn');
    if (useGeolocationBtn) {
        useGeolocationBtn.addEventListener('click', useGeolocation);
    }
}

function displayLocationPrompt() {
    const container = document.getElementById('currentWeatherContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="weather-placeholder">
            <p style="margin-bottom: 16px;">No location set. Get started by choosing your location:</p>
            <div style="display: flex; gap: 12px; flex-direction: column;">
                <button class="btn" id="useGeolocationBtn">
                    <svg style="display: inline; margin-right: 8px; vertical-align: -2px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Use Current Location
                </button>
                <button class="btn btn-outline" id="setLocationBtn">
                    <svg style="display: inline; margin-right: 8px; vertical-align: -2px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Enter City
                </button>
            </div>
        </div>
    `;

    attachWeatherEventListeners();
}

function promptForLocation() {
    const city = prompt('Enter city name (e.g., "London", "New York"):');
    if (city && city.trim()) {
        loadWeatherByCity(city.trim());
    }
}

function useGeolocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading('Getting your location...');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            hideLoading();
            const { latitude, longitude } = position.coords;
            await loadWeatherByCoordinatesSimple(latitude, longitude);
        },
        (error) => {
            hideLoading();
            showError(`Geolocation error: ${error.message}`);
        }
    );
}

async function loadWeatherByCoordinatesSimple(latitude, longitude) {
    try {
        showLoading('Loading weather data...');
        const response = await ApiService.getWeatherByCoordinates(latitude, longitude);

        if (response.success && response.data) {
            currentWeatherData = response.data;
            currentLocation = response.data.current.location;
            
            localStorage.removeItem('weatherLocation');
            localStorage.setItem('weatherCoordinates', JSON.stringify({
                latitude: latitude,
                longitude: longitude
            }));
            
            try {
                localStorage.setItem('weatherCache', JSON.stringify(response.data));
                localStorage.setItem('weatherCacheExpiry', String(Date.now() + 30 * 60 * 1000));
            } catch (storageError) {
                console.error('Failed to cache weather data:', storageError);
            }
            
            hideLoading();
            renderWeatherData();
            showSuccess(`Weather loaded for ${response.data.current.location}`);
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to fetch weather');
        }
    } catch (error) {
        hideLoading();
        showError('Failed to load weather: ' + error.message);
        throw error;
    }
}

async function loadWeatherByCity(city) {
    try {
        showLoading(`Loading weather for ${city}...`);
        const response = await ApiService.getWeatherByCity(city);

        if (response.success && response.data) {
            currentWeatherData = response.data;
            currentLocation = response.data.current.location;
            localStorage.setItem('weatherLocation', currentLocation);
            localStorage.removeItem('weatherCoordinates');
            
            try {
                localStorage.setItem('weatherCache', JSON.stringify(response.data));
                localStorage.setItem('weatherCacheExpiry', String(Date.now() + 30 * 60 * 1000));
            } catch (storageError) {
                console.error('Failed to cache weather data:', storageError);
            }
            
            hideLoading();
            renderWeatherData();
            showSuccess(`Weather loaded for ${response.data.current.location}`);
        } else {
            throw new Error(response.message || `City "${city}" not found`);
        }
    } catch (error) {
        hideLoading();
        showError(`Could not find weather data for "${city}". Try a different city name.`);
        displayLocationPrompt();
    }
}

async function loadWeatherByCoordinatesWithCache(latitude, longitude) {
    const cacheKey = 'weatherCache';
    const cacheExpiry = 'weatherCacheExpiry';
    const cacheDurationMinutes = 30;
    
    const cachedData = localStorage.getItem(cacheKey);
    const cachedExpiry = localStorage.getItem(cacheExpiry);
    const now = Date.now();
    
    if (cachedData && cachedExpiry && now < parseInt(cachedExpiry)) {
        try {
            console.log('✓ Using cached weather data (no API call)');
            currentWeatherData = JSON.parse(cachedData);
            currentLocation = currentWeatherData.current.location;
            renderWeatherData();
            return currentWeatherData;
        } catch (error) {
            console.error('Error loading cached weather:', error);
        }
    }
    
    console.log('✗ Cache expired or missing, making new API call');
    return loadWeatherByCoordinates(latitude, longitude);
}

async function loadWeatherByCoordinates(latitude, longitude) {
    try {
        showLoading('Loading weather data...');
        const response = await ApiService.getWeatherByCoordinates(latitude, longitude);

        if (response.success && response.data) {
            currentWeatherData = response.data;
            currentLocation = response.data.current.location;
            
            localStorage.removeItem('weatherLocation');
            localStorage.setItem('weatherCoordinates', JSON.stringify({
                latitude: latitude,
                longitude: longitude
            }));
            
            try {
                localStorage.setItem('weatherCache', JSON.stringify(response.data));
                localStorage.setItem('weatherCacheExpiry', String(Date.now() + 30 * 60 * 1000));
            } catch (storageError) {
                console.error('Failed to cache weather data:', storageError);
            }
            
            hideLoading();
            renderWeatherData();
            showSuccess(`Weather loaded for ${response.data.current.location}`);
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to fetch weather');
        }
    } catch (error) {
        hideLoading();
        showError('Failed to load weather: ' + error.message);
        throw error;
    }
}

async function loadWeatherData(location) {
    const cacheKey = 'weatherCache';
    const cacheExpiry = 'weatherCacheExpiry';
    const cachedData = localStorage.getItem(cacheKey);
    const cachedExpiry = localStorage.getItem(cacheExpiry);
    const now = Date.now();
    
    if (cachedData && cachedExpiry && now < parseInt(cachedExpiry)) {
        try {
            currentWeatherData = JSON.parse(cachedData);
            renderWeatherData();
            return currentWeatherData;
        } catch (error) {
            console.error('Error loading cached weather:', error);
        }
    }
    
    try {
        showLoading(`Loading weather for ${location}...`);
        const response = await ApiService.getWeatherByCity(location);

        if (response.success && response.data) {
            currentWeatherData = response.data;
            
            try {
                localStorage.setItem('weatherCache', JSON.stringify(response.data));
                localStorage.setItem('weatherCacheExpiry', String(Date.now() + 30 * 60 * 1000));
            } catch (storageError) {
                console.error('Failed to cache weather data:', storageError);
            }
            
            hideLoading();
            renderWeatherData();
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to fetch weather');
        }
    } catch (error) {
        hideLoading();
        localStorage.removeItem('weatherLocation');
        currentLocation = null;
        showError('Failed to load weather for "' + location + '". Please try a different location.');
        displayLocationPrompt();
        throw error;
    }
}

function renderWeatherData() {
    renderCurrentWeather();
    renderForecast();
    renderDiseaseRisk();
    renderMoreInfo();
    renderCareRecommendations();
}

function renderCurrentWeather() {
    const container = document.getElementById('currentWeatherContainer');
    if (!container || !currentWeatherData) return;

    const current = currentWeatherData.current;
    const iconUrl = `https://openweathermap.org/img/wn/${current.icon}@2x.png`;

    container.innerHTML = `
        <div class="weather-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: var(--text-secondary); margin-bottom: 8px;">
                        ${current.location}
                    </h3>
                    <div style="font-size: 14px; color: var(--text-secondary);">
                        Coordinates: ${current.lat.toFixed(2)}°, ${current.lon.toFixed(2)}°
                    </div>
                </div>
                <button class="btn btn-secondary btn-small" id="setLocationBtn">Change Location</button>
            </div>

            <div style="display: flex; justify-content: center; margin: 20px 0;">
                <div style="background-color: #4CAF50; border-radius: 12px; padding: 16px 32px; display: flex; align-items: center; gap: 16px; color: white;">
                    <img src="${iconUrl}" alt="${current.description}" style="width: 64px; height: 64px; filter: brightness(0) invert(1);">
                    <div style="text-align: center;">
                        <div style="font-size: 32px; font-weight: 700; line-height: 1.2;">
                            ${Math.round(current.temperature)}°C
                        </div>
                        <div style="font-size: 16px; text-transform: capitalize; opacity: 0.9;">
                            ${current.description}
                        </div>
                    </div>
                </div>
            </div>

            <div class="weather-details-grid">
                <div class="weather-detail">
                    <div class="weather-detail-label">Feels Like</div>
                    <div class="weather-detail-value">${Math.round(current.feelsLike)}°C</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Humidity</div>
                    <div class="weather-detail-value">${current.humidity}%</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Wind Speed</div>
                    <div class="weather-detail-value">${current.windSpeed} m/s</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Pressure</div>
                    <div class="weather-detail-value">${current.pressure} hPa</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Cloudiness</div>
                    <div class="weather-detail-value">${current.cloudiness}%</div>
                </div>
            </div>
        </div>
    `;

    attachWeatherEventListeners();
}

function renderForecast() {
    const container = document.getElementById('forecastContainer');
    if (!container || !currentWeatherData || !currentWeatherData.forecast) return;

    const forecast = currentWeatherData.forecast;

    const forecastHTML = forecast.map(day => {
        const iconUrl = `https://openweathermap.org/img/wn/${day.icon}@2x.png`;
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
            <div class="forecast-card">
                <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                    ${dayName} <span style="color: var(--text-secondary);">${dateStr}</span>
                </div>
                <img src="${iconUrl}" alt="${day.description}" style="width: 48px; height: 48px; margin: 8px auto;">
                <div style="text-transform: capitalize; font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; text-align: center;">
                    ${day.description}
                </div>
                <div class="forecast-detail">
                    <span style="color: var(--text-secondary);">Temp:</span> ${Math.round(day.minTemp)}–${Math.round(day.maxTemp)}°C
                </div>
                <div class="forecast-detail">
                    <span style="color: var(--text-secondary);">Humidity:</span> ${day.humidity}%
                </div>
                <div class="forecast-detail">
                    <span style="color: var(--text-secondary);">Wind:</span> ${day.windSpeed} m/s
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="forecast-grid">
            ${forecastHTML}
        </div>
    `;
}

function renderDiseaseRisk() {
    const container = document.getElementById('diseaseRiskContainer');
    if (!container || !currentWeatherData) return;

    const risks = currentWeatherData.diseaseRisks || {};

    const keyMap = {
        'root_rot': 'rootRot',
        'leaf_spot': 'leafSpot',
        'aloe_rust': 'aloeRust',
        'bacterial_soft_rot': 'bacterialSoftRot'
    };

    const diseasesWithScores = availableDiseases.map(disease => {
        const riskKey = keyMap[disease.key] || disease.key;
        const risk = risks[riskKey] || { score: 0, factors: [] };
        const score = Math.min(100, risk.score);
        return { disease, risk, score, riskKey };
    }).sort((a, b) => b.score - a.score);

    const riskHTML = diseasesWithScores
        .filter(({ score }) => score > 10) // Filter out very low risk diseases (≤10%)
        .map(({ disease, risk, score }) => {
            const severity = score > 60 ? 'High' : score > 30 ? 'Medium' : 'Low';
            const alertClass = score > 60 ? 'alert-high' : score > 30 ? 'alert-medium' : 'alert-low';

            return `
            <div class="alert-item ${alertClass}">
                <div class="alert-header">
                    <span class="alert-title">${disease.name}</span>
                    <span class="alert-severity">${severity} Risk (${score}%)</span>
                </div>
                <div style="margin-top: 8px;">
                    <div style="font-size: 13px; margin-bottom: 8px;">
                        <strong>Risk Score:</strong> 
                        <div style="height: 6px; background: var(--bg-secondary); border-radius: 3px; margin-top: 6px; overflow: hidden;">
                            <div style="height: 100%; background: ${score > 60 ? '#ef4444' : score > 30 ? '#eab308' : '#22c55e'}; width: ${score}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    ${risk.factors.length > 0 ? `
                        <div style="font-size: 13px; color: var(--text-secondary);">
                            <strong>Contributing Factors:</strong>
                            <ul style="margin: 6px 0 0 16px; padding: 0;">
                                ${risk.factors.map(factor => `<li>${factor}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="alerts-list">${riskHTML}</div>`;
}

function renderMoreInfo() {
    const container = document.getElementById('moreInfoContainer');
    if (!container || !currentWeatherData) return;

    const risks = currentWeatherData.diseaseRisks || {};

    const diseaseDescriptions = {
        'root_rot': {
            description: 'Fungal pathogens (Pythium, Phytophthora) thrive in wet, poorly-draining soil combined with high humidity (>70%). Overwatering is the primary trigger, as it creates an environment where roots cannot access oxygen.'
        },
        'leaf_spot': {
            description: 'This fungal disease (Colletotrichum species) spreads through water splash on foliage in warm (75-85°F), humid conditions. Direct watering on leaves significantly increases infection risk and provides pathways for fungal entry.'
        },
        'aloe_rust': {
            description: 'This fungal disease produces rust-colored pustules on plant tissue and thrives in high humidity (>70%) with poor air circulation. Close plant spacing and inadequate ventilation accelerate spore dispersal.'
        },
        'bacterial_soft_rot': {
            description: 'Bacterial infections cause rapid tissue breakdown and thrive in high moisture environments combined with poor sanitation. Plant wounds or physical damage provide entry points for bacteria to establish infection.'
        }
    };

    const keyMap = {
        'root_rot': 'rootRot',
        'leaf_spot': 'leafSpot',
        'aloe_rust': 'aloeRust',
        'bacterial_soft_rot': 'bacterialSoftRot'
    };

    const diseasesWithScores = availableDiseases.map(disease => {
        const riskKey = keyMap[disease.key] || disease.key;
        const risk = risks[riskKey] || { score: 0, factors: [] };
        const score = Math.min(100, risk.score);
        const description = diseaseDescriptions[disease.key]?.description || disease.description || '';
        return { disease, risk, score, description };
    }).sort((a, b) => b.score - a.score);

    const moreInfoHTML = diseasesWithScores.map(({ disease, score, description }) => {
        const severity = score > 60 ? 'High' : score > 30 ? 'Medium' : 'Low';
        const alertClass = score > 60 ? 'alert-high' : score > 30 ? 'alert-medium' : 'alert-low';

        return `
            <div class="alert-item ${alertClass}">
                <div class="alert-header">
                    <span class="alert-title">${disease.name}</span>
                    <span class="alert-severity">${severity} Risk</span>
                </div>
                <span class="alert-cause"><strong>Conditions Favoring Development:</strong> ${description}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="alerts-list">${moreInfoHTML}</div>`;
}

function renderCareRecommendations() {
    const container = document.getElementById('recommendationsContainer');
    if (!container || !currentWeatherData) return;

    const { current } = currentWeatherData;
    const { temperature, humidity } = current;

    const recommendations = [];

    if (temperature > 30) {
        recommendations.push({
            title: 'Heat Stress Prevention',
            description: 'Temperature exceeds 30°C. Provide shade cloth or move plants to cooler location. Increase watering frequency to prevent drought stress.'
        });
    } else if (temperature < 10) {
        recommendations.push({
            title: 'Cold Protection',
            description: 'Temperature below 10°C. Move plants indoors or use frost cloth. Reduce watering as growth slows in cold conditions.'
        });
    } else if (temperature < 15) {
        recommendations.push({
            title: 'Cool Temperature Care',
            description: 'Temperature is below optimal range (18-28°C). Reduce watering frequency and ensure good drainage to prevent cold-related root issues.'
        });
    } else {
        recommendations.push({
            title: 'Temperature Optimal',
            description: 'Current temperature is ideal for aloe vera growth. Maintain regular care routine.'
        });
    }

    if (humidity > 75) {
        recommendations.push({
            title: 'High Humidity Management',
            description: 'Humidity exceeds 75%. Increase air circulation with fans, ensure soil drains well, and avoid overhead watering. Monitor for fungal diseases.'
        });
    } else if (humidity > 60) {
        recommendations.push({
            title: 'Moderate Humidity Care',
            description: 'Humidity is between 60-75%. Maintain good air circulation to prevent fungal issues. Water at soil level only, not on leaves.'
        });
    } else if (humidity < 40) {
        recommendations.push({
            title: 'Low Humidity Adjustment',
            description: 'Humidity is below 40%. Mist surroundings occasionally (not the plant). Check soil more frequently as it dries faster. Group plants together to increase humidity.'
        });
    } else {
        recommendations.push({
            title: 'Humidity Suitable',
            description: 'Current humidity level is favorable for aloe vera. Continue regular watering schedule.'
        });
    }

    if (humidity > 70 && temperature > 20 && temperature < 28) {
        recommendations.push({
            title: 'Disease Prevention Priority',
            description: 'Current conditions (warm & humid) favor fungal diseases. Increase inspection frequency, ensure excellent drainage, and improve air circulation.'
        });
    }

    if (current.windSpeed > 5) {
        recommendations.push({
            title: 'Wind Protection',
            description: 'High wind speed detected. Use windbreaks or shelters to protect plants from wind stress and prevent soil drying.'
        });
    }

    const recommendationsHTML = recommendations.map(rec => `
        <div class="recommendation-item">
            <div class="recommendation-content">
                <h3>${rec.title}</h3>
                <p>${rec.description}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="recommendations-list">${recommendationsHTML}</div>`;
}
