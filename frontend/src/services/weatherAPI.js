import axios from "axios";
import { OPENWEATHERMAP_API_KEY, OPENWEATHERMAP_BASE_URL, ACCUWEATHER_API_KEY, ACCUWEATHER_BASE_URL } from "./consts";

const weatherAPI = axios.create({
    baseURL: OPENWEATHERMAP_BASE_URL,
    params: {
        apikey: OPENWEATHERMAP_API_KEY
    },
    headers: {
        'Content-Encoding': 'gzip',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Authorization': OPENWEATHERMAP_API_KEY,
    }
});

export default weatherAPI;