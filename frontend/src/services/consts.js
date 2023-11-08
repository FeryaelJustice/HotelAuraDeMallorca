export const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : process.env.API_URL + '/api';
export const API_URL_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.API_URL;

export const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY ? process.env.OPENWEATHERMAP_API_KEY : '';
export const OPENWEATHERMAP_BASE_URL = process.env.OPENWEATHERMAP_BASE_URL ? process.env.OPENWEATHERMAP_BASE_URL : '';
export const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY ? process.env.ACCUWEATHER_API_KEY : '';
export const ACCUWEATHER_BASE_URL = process.env.ACCUWEATHER_BASE_URL ? process.env.ACCUWEATHER_BASE_URL : '';