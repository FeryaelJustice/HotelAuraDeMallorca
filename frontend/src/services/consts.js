// ==============================================================================
// CONSTANTES DE CONFIGURACION DE SERVICIOS EXTERNOS Y APIS
// Proposito: Centraliza las URLs base y credenciales de acceso para la API REST del backend
// y proveedores de datos meteorologicos (Open-Meteo, OpenWeatherMap, AccuWeather).
// ==============================================================================

// URL base del backend: resuelve la variable de entorno o recurre a la URL del cluster en la nube
const rawApiUrl = (process.env.API_URL || 'https://hotel-aura-de-mallorca-backend-qkh3.onrender.com').replace(/\/+$/, '');
export const API_URL_BASE = rawApiUrl;
export const API_URL = API_URL_BASE + '/api';

// Proveedores meteorologicos complementarios
export const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY ? process.env.OPENWEATHERMAP_API_KEY : '';
export const OPENWEATHERMAP_BASE_URL = (process.env.OPENWEATHERMAP_BASE_URL || 'https://api.openweathermap.org').replace(/\/+$/, '');
export const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY ? process.env.ACCUWEATHER_API_KEY : '';
export const ACCUWEATHER_BASE_URL = (process.env.ACCUWEATHER_BASE_URL || 'https://dataservice.accuweather.com').replace(/\/+$/, '');