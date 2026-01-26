/**
 * OpenMeteo Client - Direct API calls from frontend
 * Reduces backend load and provides fallback when our API is down
 */

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

const HOURLY_PARAMS = [
    'temperature_2m',
    'relative_humidity_2m',
    'wind_speed_10m',
    'precipitation'
].join(',');

const DAILY_PARAMS = [
    'temperature_2m_max',
    'temperature_2m_min',
    'weather_code',
    'precipitation_sum'
].join(',');

/**
 * Transform OpenMeteo response format to our internal format
 */
const transformHourlyData = (hourly) => {
    if (!hourly || !hourly.time) return [];

    return hourly.time.map((time, i) => ({
        time,
        temperature_2m: hourly.temperature_2m?.[i] ?? null,
        relative_humidity_2m: hourly.relative_humidity_2m?.[i] ?? null,
        wind_speed_10m: hourly.wind_speed_10m?.[i] ?? null,
        precipitation: hourly.precipitation?.[i] ?? null,
        // Create unified temp field for chart compatibility
        unified_temp: hourly.temperature_2m?.[i] ?? null
    }));
};

const transformDailyData = (daily) => {
    if (!daily || !daily.time) return [];

    return daily.time.map((time, i) => ({
        time,
        temperature_2m_max: daily.temperature_2m_max?.[i] ?? null,
        temperature_2m_min: daily.temperature_2m_min?.[i] ?? null,
        weather_code: daily.weather_code?.[i] ?? null,
        precipitation_sum: daily.precipitation_sum?.[i] ?? null
    }));
};

/**
 * Get forecast data from OpenMeteo
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude  
 * @param {number} days - Forecast days (1-16)
 */
export const getForecastData = async (lat, lon, days = 7) => {
    const url = `${FORECAST_API}?latitude=${lat}&longitude=${lon}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}&forecast_days=${days}&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OpenMeteo Forecast API error: ${response.status}`);
    }

    const data = await response.json();

    return {
        hourly: transformHourlyData(data.hourly),
        daily: transformDailyData(data.daily)
    };
};

/**
 * Get historical data from OpenMeteo Archive
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} startDate - Start date YYYY-MM-DD
 * @param {string} endDate - End date YYYY-MM-DD
 */
export const getHistoricalData = async (lat, lon, startDate, endDate) => {
    const url = `${ARCHIVE_API}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OpenMeteo Archive API error: ${response.status}`);
    }

    const data = await response.json();

    return {
        hourly: transformHourlyData(data.hourly),
        daily: transformDailyData(data.daily)
    };
};

/**
 * Search for locations using OpenMeteo Geocoding API
 * @param {string} query - Search query
 * @param {number} count - Max results
 */
export const searchLocation = async (query, count = 5) => {
    const url = `${GEOCODING_API}?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OpenMeteo Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our format
    if (!data.results) return [];

    return data.results.map(r => ({
        name: r.name,
        country: r.country,
        admin1: r.admin1, // State/Region
        lat: r.latitude,
        lon: r.longitude
    }));
};

export default {
    getForecastData,
    getHistoricalData,
    searchLocation
};
