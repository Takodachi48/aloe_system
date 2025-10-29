const axios = require('axios');

const CACHE_DURATION = 30 * 60 * 1000;

let weatherCache = {};

function isCacheValid(cachedData) {
    if (!cachedData || !cachedData.timestamp) return false;
    return Date.now() - cachedData.timestamp < CACHE_DURATION;
}

async function fetchFromOpenWeatherMap(endpoint, params) {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
            throw new Error('OpenWeatherMap API key is not configured. Please set OPENWEATHER_API_KEY in your .env file.');
        }
        
        const response = await axios.get(endpoint, {
            params: {
                ...params,
                appid: apiKey
            },
            headers: {
                'User-Agent': 'AloeShield-WeatherService/1.0'
            }
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            console.error(`OpenWeatherMap API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            throw new Error(`OpenWeatherMap API error: ${error.response.status} ${error.response.statusText}`);
        }
        console.error('OpenWeatherMap API fetch error:', error.message);
        throw error;
    }
}

async function getWeatherByCoordinates(latitude, longitude) {
    const cacheKey = `weather_${latitude}_${longitude}`;
    
    if (weatherCache[cacheKey] && isCacheValid(weatherCache[cacheKey])) {
        return weatherCache[cacheKey].data;
    }

    const currentWeatherData = await fetchFromOpenWeatherMap(
        'https://api.openweathermap.org/data/2.5/weather',
        {
            lat: latitude,
            lon: longitude,
            units: 'metric'
        }
    );

    const forecastData = await fetchFromOpenWeatherMap(
        'https://api.openweathermap.org/data/2.5/forecast',
        {
            lat: latitude,
            lon: longitude,
            units: 'metric'
        }
    );

    const processedData = {
        current: {
            temperature: currentWeatherData.main.temp,
            feelsLike: currentWeatherData.main.feels_like,
            humidity: currentWeatherData.main.humidity,
            pressure: currentWeatherData.main.pressure,
            description: currentWeatherData.weather[0].description,
            icon: currentWeatherData.weather[0].icon,
            windSpeed: currentWeatherData.wind.speed,
            cloudiness: currentWeatherData.clouds.all,
            location: `${currentWeatherData.name}, ${currentWeatherData.sys.country}`,
            lat: latitude,
            lon: longitude
        },
        forecast: processForecastData(forecastData.list)
    };

    weatherCache[cacheKey] = {
        data: processedData,
        timestamp: Date.now()
    };

    return processedData;
}

function processForecastData(forecastList) {
    const dailyForecasts = {};

    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];

        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                date: date,
                temps: [],
                humidity: [],
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                windSpeed: [],
                pressure: []
            };
        }

        dailyForecasts[date].temps.push(item.main.temp);
        dailyForecasts[date].humidity.push(item.main.humidity);
        dailyForecasts[date].windSpeed.push(item.wind.speed);
        dailyForecasts[date].pressure.push(item.main.pressure);
    });

    return Object.values(dailyForecasts).slice(0, 7).map(day => ({
        date: day.date,
        minTemp: Math.min(...day.temps),
        maxTemp: Math.max(...day.temps),
        avgTemp: Math.round(day.temps.reduce((a, b) => a + b) / day.temps.length),
        humidity: Math.round(day.humidity.reduce((a, b) => a + b) / day.humidity.length),
        windSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b) / day.windSpeed.length * 10) / 10,
        pressure: Math.round(day.pressure.reduce((a, b) => a + b) / day.pressure.length),
        description: day.description,
        icon: day.icon
    }));
}

async function getWeatherByCity(cityName) {
    const cacheKey = `weather_city_${cityName}`;
    
    if (weatherCache[cacheKey] && isCacheValid(weatherCache[cacheKey])) {
        return weatherCache[cacheKey].data;
    }

    let geoData;
    let searchCity = cityName;
    
    // Try with the full city name first
    try {
        geoData = await fetchFromOpenWeatherMap(
            'https://api.openweathermap.org/geo/1.0/direct',
            {
                q: searchCity,
                limit: 1
            }
        );
    } catch (error) {
        console.error(`Geocoding error for "${searchCity}":`, error.message);
        throw error;
    }

    // If no results, try with just the city part (remove country code if present)
    if (!geoData || geoData.length === 0) {
        const parts = cityName.split(',').map(p => p.trim());
        if (parts.length > 1) {
            searchCity = parts[0];
            try {
                geoData = await fetchFromOpenWeatherMap(
                    'https://api.openweathermap.org/geo/1.0/direct',
                    {
                        q: searchCity,
                        limit: 1
                    }
                );
            } catch (error) {
                console.error(`Geocoding error for "${searchCity}":`, error.message);
                throw error;
            }
        }
    }

    if (!geoData || geoData.length === 0) {
        throw new Error(`City "${cityName}" not found. Please try a different city name.`);
    }

    const { lat, lon } = geoData[0];
    return await getWeatherByCoordinates(lat, lon);
}

function assessDiseaseRisk(currentWeather, forecast) {
    const risks = {
        rootRot: { score: 0, factors: [] },
        leafSpot: { score: 0, factors: [] },
        aloeRust: { score: 0, factors: [] },
        bacterialSoftRot: { score: 0, factors: [] }
    };

    const { humidity, temperature } = currentWeather;
    const avgHumidity = Math.round(
        forecast.reduce((sum, day) => sum + day.humidity, 0) / forecast.length
    );

    // Leaf Spot (Alternaria, Colletotrichum, etc.)
    if (temperature < 10) {
        // Very low risk if very cold
        risks.leafSpot.score = 10;
        risks.leafSpot.factors.push('Very low risk: Temperature < 10°C (too cold for fungal activity)');
    } else if (temperature < 18) {
        // Medium risk if cool but with high humidity, otherwise low
        if (humidity > 75) {
            risks.leafSpot.score = 50;
            risks.leafSpot.factors.push('Medium risk: Cool temperature (10-18°C) but high humidity (>75%) supports fungal activity');
        } else {
            risks.leafSpot.score = 20;
            risks.leafSpot.factors.push('Low risk: Temperature < 18°C (suboptimal but possible with high humidity)');
        }
    } else if (humidity < 50) {
        // Low Risk if humidity is too low, regardless of temperature
        risks.leafSpot.score = 20;
        risks.leafSpot.factors.push('Low risk: Humidity < 50% (too dry for significant risk)');
    } else if (temperature > 32) {
        // Medium Risk if too hot, but only if humidity is in range
        if (humidity >= 50 && humidity <= 70) {
            risks.leafSpot.score = 50;
            risks.leafSpot.factors.push('Medium risk: High temperature but moderate humidity');
        } else {
            risks.leafSpot.score = 20;
            risks.leafSpot.factors.push('Low risk: Temperature too high for optimal disease development');
        }
    } else if (temperature >= 25 && temperature <= 32 && humidity > 70) {
        // High Risk - optimal conditions
        risks.leafSpot.score = 90;
        risks.leafSpot.factors.push('High risk: Temperature 25-32°C and Humidity > 70% (optimal conditions)');
    } else if (temperature >= 18 && temperature <= 28 && humidity >= 50 && humidity <= 70) {
        // Medium Risk - moderate conditions
        risks.leafSpot.score = 50;
        risks.leafSpot.factors.push('Medium risk: Temperature 18-28°C and Humidity 50-70%');
    } else {
        // Default low risk for any other combinations
        risks.leafSpot.score = 20;
        risks.leafSpot.factors.push('Low risk: Suboptimal combination of temperature and humidity');
    }

    // Bacterial Soft Rot (Erwinia spp.)
    if (temperature < 15) {
        // Very low risk if too cold, regardless of humidity
        risks.bacterialSoftRot.score = 10;
        risks.bacterialSoftRot.factors.push('Very low risk: Temperature < 15°C (too cold for bacterial activity)');
    } else if (temperature < 25) {
        // Low risk if too cool, but consider humidity
        if (humidity > 90) {
            risks.bacterialSoftRot.score = 30;
            risks.bacterialSoftRot.factors.push('Low risk: Cool temperature (15-25°C) limits bacterial activity even with high humidity');
        } else {
            risks.bacterialSoftRot.score = 20;
            risks.bacterialSoftRot.factors.push('Low risk: Temperature < 25°C (suboptimal for bacterial growth)');
        }
    } else if (humidity < 60) {
        // Low risk if too dry, regardless of temperature
        risks.bacterialSoftRot.score = 20;
        risks.bacterialSoftRot.factors.push('Low risk: Humidity < 60% (too dry for significant bacterial growth)');
    } else if (temperature >= 25 && temperature <= 32) {
        if (humidity >= 80) {
            // High risk in warm, very humid conditions
            risks.bacterialSoftRot.score = 90;
            risks.bacterialSoftRot.factors.push('High risk: Temperature 25-32°C and Humidity > 80% (optimal conditions)');
        } else if (humidity >= 60) {
            // Medium risk in warm, moderately humid conditions
            risks.bacterialSoftRot.score = 50;
            risks.bacterialSoftRot.factors.push('Medium risk: Temperature 25-32°C and Humidity 60-80%');
        }
    } else if (temperature > 32) {
        // Risk decreases at very high temperatures
        if (humidity > 80) {
            risks.bacterialSoftRot.score = 60;
            risks.bacterialSoftRot.factors.push('Moderate risk: Very warm with high humidity');
        } else {
            risks.bacterialSoftRot.score = 30;
            risks.bacterialSoftRot.factors.push('Low risk: Temperature > 32°C (potentially too hot for optimal bacterial growth)');
        }
    } else {
        // Default to medium risk for any other combinations
        risks.bacterialSoftRot.score = 40;
        risks.bacterialSoftRot.factors.push('Moderate risk: Suboptimal but possible conditions for bacterial growth');
    }

    // Aloe Rust (Puccinia aloeicola)
    if (temperature < 10) {
        // Very low risk if very cold
        risks.aloeRust.score = 10;
        risks.aloeRust.factors.push('Very low risk: Temperature < 10°C (too cold for spore germination)');
    } else if (temperature < 18) {
        // Medium risk if cool with high humidity, otherwise low
        if (humidity > 75) {
            risks.aloeRust.score = 60;
            risks.aloeRust.factors.push('Medium risk: Cool temperature (10-18°C) but high humidity (>75%) supports rust development');
        } else {
            risks.aloeRust.score = 20;
            risks.aloeRust.factors.push('Low risk: Temperature < 18°C (suboptimal for spore activity)');
        }
    } else if (humidity < 55) {
        // Low risk if too dry, regardless of temperature
        risks.aloeRust.score = 20;
        risks.aloeRust.factors.push('Low risk: Humidity < 55% (too dry for spore germination)');
    } else if (temperature >= 18 && temperature <= 25) {
        if (humidity > 85) {
            // Very high risk in optimal temperature with very high humidity
            risks.aloeRust.score = 100;
            risks.aloeRust.factors.push('Very high risk: Temperature 18-25°C and Humidity > 85% (ideal for spore germination and infection)');
        } else if (humidity >= 75) {
            // High risk in optimal conditions
            risks.aloeRust.score = 80;
            risks.aloeRust.factors.push('High risk: Temperature 18-25°C and Humidity > 75%');
        } else if (humidity >= 55) {
            // Medium risk in moderate humidity
            risks.aloeRust.score = 50;
            risks.aloeRust.factors.push('Medium risk: Temperature 18-25°C and Humidity 55-75%');
        }
    } else if (temperature > 25 && temperature <= 30) {
        if (humidity > 75) {
            risks.aloeRust.score = 60;
            risks.aloeRust.factors.push('Moderate risk: Warm with high humidity may still support rust development');
        } else {
            risks.aloeRust.score = 30;
            risks.aloeRust.factors.push('Low risk: Temperature > 25°C (approaching upper limit for optimal rust development)');
        }
    } else if (temperature > 30) {
        // Low risk if too hot
        risks.aloeRust.score = 20;
        risks.aloeRust.factors.push('Low risk: Temperature > 30°C (too hot for optimal rust development)');
    } else {
        // Default to medium risk for any other combinations
        risks.aloeRust.score = 40;
        risks.aloeRust.factors.push('Moderate risk: Suboptimal but possible conditions for rust development');
    }

    // Root Rot (Pythium, Phytophthora, Fusarium)
    if (temperature < 10) {
        // Very low risk if very cold
        risks.rootRot.score = 10;
        risks.rootRot.factors.push('Very low risk: Temperature < 10°C (too cold for significant fungal activity in soil)');
    } else if (temperature < 20) {
        // Low to moderate risk when cool but not cold
        if (humidity > 85) {
            risks.rootRot.score = 40;
            risks.rootRot.factors.push('Moderate risk: Cool temperature (10-20°C) but very high humidity (>85%) may promote fungal activity');
        } else if (humidity > 75) {
            risks.rootRot.score = 30;
            risks.rootRot.factors.push('Low risk: Cool temperature (10-20°C) with high humidity (75-85%) has limited fungal activity');
        } else {
            risks.rootRot.score = 20;
            risks.rootRot.factors.push('Low risk: Temperature < 20°C (suboptimal for root rot pathogens)');
        }
    } else if (humidity < 55) {
        // Low risk if too dry, regardless of temperature
        risks.rootRot.score = 20;
        risks.rootRot.factors.push('Low risk: Humidity < 55% (too dry for significant fungal activity)');
    } else if (temperature >= 20 && temperature <= 28) {
        if (humidity > 80) {
            // High risk in optimal temperature with high humidity
            risks.rootRot.score = 90;
            risks.rootRot.factors.push('High risk: Temperature 20-28°C and Humidity > 80% (ideal for root rot development)');
        } else if (humidity >= 55) {
            // Medium risk in moderate conditions
            risks.rootRot.score = 50;
            risks.rootRot.factors.push('Medium risk: Temperature 20-28°C and Humidity 55-80%');
        }
    } else if (temperature > 28 && temperature <= 35) {
        if (humidity > 75) {
            // High risk in warm, very humid conditions
            risks.rootRot.score = 70;
            risks.rootRot.factors.push('High risk: Warm with high humidity (25-35°C and >75% humidity)');
        } else {
            risks.rootRot.score = 40;
            risks.rootRot.factors.push('Moderate risk: Warm but moderate humidity may limit root rot risk');
        }
    } else if (temperature > 35) {
        // Risk decreases at very high temperatures
        risks.rootRot.score = 30;
        risks.rootRot.factors.push('Low risk: Temperature > 35°C (potentially too hot for optimal pathogen activity)');
    } else {
        // Default to medium risk for any other combinations
        risks.rootRot.score = 40;
        risks.rootRot.factors.push('Moderate risk: Conditions may support root rot development');
    }

    // Ensure scores are within 0-100 range
    risks.rootRot.score = Math.min(100, Math.max(0, risks.rootRot.score));
    risks.leafSpot.score = Math.min(100, Math.max(0, risks.leafSpot.score));
    risks.aloeRust.score = Math.min(100, Math.max(0, risks.aloeRust.score));
    risks.bacterialSoftRot.score = Math.min(100, Math.max(0, risks.bacterialSoftRot.score));

    return risks;
}

module.exports = {
    getWeatherByCoordinates,
    getWeatherByCity,
    assessDiseaseRisk,
    clearCache: () => { weatherCache = {}; }
};
