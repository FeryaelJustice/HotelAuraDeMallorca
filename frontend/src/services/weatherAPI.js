import axios from "axios";

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY ? process.env.OPENWEATHERMAP_API_KEY : '';
const OPENWEATHERMAP_BASE_URL = process.env.OPENWEATHERMAP_BASE_URL ? process.env.OPENWEATHERMAP_BASE_URL : '';
const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY ? process.env.ACCUWEATHER_API_KEY : '';
const ACCUWEATHER_BASE_URL = process.env.ACCUWEATHER_BASE_URL ? process.env.ACCUWEATHER_BASE_URL : '';

const weatherAPI = axios.create({
    baseURL: OPENWEATHERMAP_BASE_URL,
    params: {
        apikey: OPENWEATHERMAP_API_KEY
    },
    headers: {
        'Content-Encoding': 'gzip'
    }
});

export default weatherAPI;