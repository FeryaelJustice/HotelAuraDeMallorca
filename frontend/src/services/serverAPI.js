import axios from "axios";
import { API_URL } from "./consts";

const getCookie = (name) => {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
};

const serverAPI = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        Accept: "application/json",
    },
});

serverAPI.interceptors.request.use((config) => {
    const token = getCookie("token");
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default serverAPI;