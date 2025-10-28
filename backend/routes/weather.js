const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const weatherService = require('../services/weather');

router.get('/by-coordinates', authMiddleware, async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude or longitude'
            });
        }

        const weatherData = await weatherService.getWeatherByCoordinates(lat, lon);

        const forecast = weatherData.forecast || [];
        const risks = weatherService.assessDiseaseRisk(weatherData.current, forecast);

        res.json({
            success: true,
            data: {
                current: weatherData.current,
                forecast: weatherData.forecast,
                diseaseRisks: risks
            }
        });
    } catch (error) {
        console.error('Weather fetch error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch weather data'
        });
    }
});

router.get('/by-city', authMiddleware, async (req, res) => {
    try {
        const { city } = req.query;

        if (!city) {
            return res.status(400).json({
                success: false,
                message: 'City name is required'
            });
        }

        const weatherData = await weatherService.getWeatherByCity(city);

        const forecast = weatherData.forecast || [];
        const risks = weatherService.assessDiseaseRisk(weatherData.current, forecast);

        res.json({
            success: true,
            data: {
                current: weatherData.current,
                forecast: weatherData.forecast,
                diseaseRisks: risks
            }
        });
    } catch (error) {
        console.error('Weather fetch error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch weather data'
        });
    }
});

module.exports = router;
