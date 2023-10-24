import axios from "axios";

const ACCUWEATHER_APIKEY = process.env.ACCUWEATHER_API_KEY ? process.env.ACCUWEATHER_API_KEY : '';
const WEATHER_APIURL = 'http://dataservice.accuweather.com/forecasts/v1/'

const weatherAPI = axios.create({
    baseURL: WEATHER_APIURL,
    params: {
        apikey: ACCUWEATHER_APIKEY
    }
});

export default weatherAPI;