import axios from "axios";
import { API_URL } from './consts';

const serverAPI = axios.create({
    baseURL: API_URL,
    timeout: 5000,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': false,
    }
});

export default serverAPI;