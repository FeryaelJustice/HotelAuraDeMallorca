import axios from "axios";
import {
    OPENWEATHERMAP_API_KEY,
    OPENWEATHERMAP_BASE_URL,
    ACCUWEATHER_API_KEY,
    ACCUWEATHER_BASE_URL,
} from "./consts";

// In-memory cache for AccuWeather location keys by coordinates
const locationKeyCache = new Map();

/**
 * Normalizes AccuWeather daily forecasts into the structure expected by the backend and frontend.
 * @param {Array} dailyForecasts
 * @returns {Array} normalized list
 */
function normalizeAccuWeatherForecasts(dailyForecasts = []) {
    return dailyForecasts.map((df) => {
        const datePart = df.Date ? df.Date.split("T")[0] : "";
        const dayRain =
            (df.Day?.HasPrecipitation &&
                (!df.Day?.PrecipitationType ||
                    df.Day?.PrecipitationType.toLowerCase() === "rain")) ||
            /rain|shower|storm|thunderstorm/i.test(df.Day?.IconPhrase || "");
        const nightRain =
            (df.Night?.HasPrecipitation &&
                (!df.Night?.PrecipitationType ||
                    df.Night?.PrecipitationType.toLowerCase() === "rain")) ||
            /rain|shower|storm|thunderstorm/i.test(df.Night?.IconPhrase || "");
        const isRain = dayRain || nightRain;

        let mainState = "Clear";
        if (isRain) {
            mainState = "Rain";
        } else if (
            /cloud|overcast/i.test(df.Day?.IconPhrase || "") ||
            /cloud|overcast/i.test(df.Night?.IconPhrase || "")
        ) {
            mainState = "Clouds";
        }

        return {
            dt_txt: `${datePart} 12:00:00`,
            weather: [
                {
                    main: mainState,
                    description: df.Day?.IconPhrase || df.Night?.IconPhrase || mainState,
                },
            ],
            raw: df,
        };
    });
}

/**
 * Fetches 5-day weather forecast using AccuWeather.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ data: { list: Array }, provider: string }>}
 */
async function fetchFromAccuWeather(lat, lon) {
    if (!ACCUWEATHER_API_KEY || ACCUWEATHER_API_KEY === "1234") {
        throw new Error("ACCUWEATHER_API_KEY is not configured or is a placeholder");
    }

    const cacheKey = `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
    let locationKey = locationKeyCache.get(cacheKey);

    if (!locationKey) {
        try {
            const geoRes = await axios.get(
                `${ACCUWEATHER_BASE_URL}/locations/v1/cities/geoposition/search`,
                {
                    params: {
                        apikey: ACCUWEATHER_API_KEY,
                        q: `${lat},${lon}`,
                    },
                    headers: {
                        Accept: "application/json",
                    },
                }
            );
            locationKey = geoRes.data?.Key;
            if (locationKey) {
                locationKeyCache.set(cacheKey, locationKey);
            }
        } catch (geoError) {
            // Fallback for Mallorca region if geoposition search is unavailable
            const isNearMallorca =
                Math.abs(Number(lat) - 39.58) < 0.5 &&
                Math.abs(Number(lon) - 2.71) < 0.5;
            if (isNearMallorca) {
                locationKey = "1451511";
            } else {
                throw geoError;
            }
        }
    }

    if (!locationKey) {
        throw new Error("Unable to resolve AccuWeather location key");
    }

    const forecastRes = await axios.get(
        `${ACCUWEATHER_BASE_URL}/forecasts/v1/daily/5day/${locationKey}`,
        {
            params: {
                apikey: ACCUWEATHER_API_KEY,
                metric: true,
            },
            headers: {
                Accept: "application/json",
            },
        }
    );

    const dailyForecasts = forecastRes.data?.DailyForecasts || [];
    const list = normalizeAccuWeatherForecasts(dailyForecasts);

    return {
        data: {
            list,
            raw: forecastRes.data,
        },
        provider: "accuweather",
    };
}

/**
 * Fetches 5-day weather forecast using OpenWeatherMap as fallback.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ data: { list: Array }, provider: string }>}
 */
async function fetchFromOpenWeatherMap(lat, lon) {
    if (!OPENWEATHERMAP_API_KEY || OPENWEATHERMAP_API_KEY === "1234") {
        throw new Error("OPENWEATHERMAP_API_KEY is not configured or is a placeholder");
    }

    const owmRes = await axios.get(
        `${OPENWEATHERMAP_BASE_URL}/data/2.5/forecast`,
        {
            params: {
                lat,
                lon,
                appid: OPENWEATHERMAP_API_KEY,
            },
            headers: {
                Accept: "application/json",
            },
        }
    );

    return {
        data: {
            list: owmRes.data?.list || [],
            raw: owmRes.data,
        },
        provider: "openweathermap",
    };
}

// In-memory cache for forecast with 30-minute TTL
let cachedForecast = null;
let cachedForecastTimestamp = 0;
let pendingForecastPromise = null;
const FORECAST_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Primary forecast function: attempts AccuWeather first, falls back to OpenWeatherMap.
 * Uses in-memory cache (30 min) and promise deduplication to prevent repeated calls.
 * @param {{ lat?: number, lon?: number, forceRefresh?: boolean }} [params]
 * @returns {Promise<{ data: { list: Array }, provider: string }>}
 */
export async function getFiveDayForecast(params = {}) {
    const lat = params.lat ?? 39.58130105;
    const lon = params.lon ?? 2.709183392285786;
    const now = Date.now();

    // 1. Return cached forecast if valid and not force-refreshed
    if (!params.forceRefresh && cachedForecast && (now - cachedForecastTimestamp < FORECAST_CACHE_TTL_MS)) {
        return cachedForecast;
    }

    // 2. Return in-flight request if already pending (deduplication)
    if (pendingForecastPromise) {
        return pendingForecastPromise;
    }

    // 3. Initiate request with deduplication wrapper
    pendingForecastPromise = (async () => {
        try {
            const result = await fetchFromAccuWeather(lat, lon);
            cachedForecast = result;
            cachedForecastTimestamp = Date.now();
            return result;
        } catch (accuError) {
            console.warn(
                "[weatherAPI] AccuWeather request failed, falling back to OpenWeatherMap:",
                accuError?.message || accuError
            );
            const fallbackResult = await fetchFromOpenWeatherMap(lat, lon);
            cachedForecast = fallbackResult;
            cachedForecastTimestamp = Date.now();
            return fallbackResult;
        } finally {
            pendingForecastPromise = null;
        }
    })();

    return pendingForecastPromise;
}

export const getForecast = getFiveDayForecast;

const weatherAPI = {
    getFiveDayForecast,
    getForecast,
    async get(url, config = {}) {
        const params = config?.params || {};
        const isForecastCall =
            typeof url === "string" &&
            (url.includes("forecast") || url.includes("weather"));

        if (isForecastCall || (params.lat !== undefined && params.lon !== undefined)) {
            return await getFiveDayForecast(params);
        }

        return await axios.get(url, config);
    },
};

export default weatherAPI;