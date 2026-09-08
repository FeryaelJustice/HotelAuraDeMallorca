const rawApiUrl = (process.env.API_URL || 'https://hotel-aura-de-mallorca-backend-qkh3.onrender.com').replace(/\/+$/, '');
export const API_URL_BASE = rawApiUrl;
export const API_URL = API_URL_BASE + '/api';

export const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY ? process.env.OPENWEATHERMAP_API_KEY : '';
export const OPENWEATHERMAP_BASE_URL = (process.env.OPENWEATHERMAP_BASE_URL || 'https://api.openweathermap.org').replace(/\/+$/, '');
export const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY ? process.env.ACCUWEATHER_API_KEY : '';
export const ACCUWEATHER_BASE_URL = (process.env.ACCUWEATHER_BASE_URL || 'https://dataservice.accuweather.com').replace(/\/+$/, '');