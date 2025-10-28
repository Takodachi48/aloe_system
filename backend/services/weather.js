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

    if (humidity > 70) {
        risks.rootRot.score += 35;
        risks.rootRot.factors.push('High humidity (>70%)');
        risks.aloeRust.score += 40;
        risks.aloeRust.factors.push('High humidity (>70%)');
        risks.bacterialSoftRot.score += 30;
        risks.bacterialSoftRot.factors.push('High humidity (>70%)');
    } else if (humidity > 60) {
        risks.rootRot.score += 20;
        risks.rootRot.factors.push('Moderate humidity');
        risks.aloeRust.score += 20;
        risks.aloeRust.factors.push('Moderate humidity');
        risks.bacterialSoftRot.score += 15;
        risks.bacterialSoftRot.factors.push('Moderate humidity');
    }

    if (temperature > 24 && temperature < 30) {
        risks.leafSpot.score += 30;
        risks.leafSpot.factors.push('Warm temperature (24-30°C)');
        risks.bacterialSoftRot.score += 15;
        risks.bacterialSoftRot.factors.push('Warm temperature');
    } else if (temperature < 15) {
        risks.leafSpot.score = Math.max(0, risks.leafSpot.score - 15);
        risks.aloeRust.score = Math.max(0, risks.aloeRust.score - 10);
    }

    if (temperature > 18 && temperature < 28) {
        risks.rootRot.score += 20;
        risks.rootRot.factors.push('Moderate temperature (18-28°C)');
    }

    if (humidity > 70 && temperature > 18 && temperature < 28) {
        risks.aloeRust.score += 20;
        risks.aloeRust.factors.push('Combined: high humidity + moderate temperature');
    }

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
