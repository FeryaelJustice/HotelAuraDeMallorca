// ==============================================================================
// CLIENTE HTTP AXIOS PARA COMUNICACION CON EL BACKEND (serverAPI)
// Proposito: Gestiona todas las llamadas a la API REST del hotel, inyectando
// de forma automatica el token JWT de sesion en el encabezado Authorization.
// ==============================================================================
import axios from "axios";
import { API_URL } from "./consts";

// Helper: Extraccion de cookies por nombre en el navegador
// Que hace: Parsea document.cookie para obtener el valor del token de sesion.
// Por que: Permite recuperar el JWT guardado por la aplicacion tras el login.
const getCookie = (name) => {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
};

// Instancia preconfigurada de Axios
const serverAPI = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        Accept: "application/json",
    },
});

// Interceptor de peticion HTTP
// Que hace: Inyecta el token Bearer en el encabezado Authorization si existe la cookie 'token'.
// Por que: Desacopla a los componentes de UI de adjuntar credenciales manualmente en cada peticion.
serverAPI.interceptors.request.use((config) => {
    const token = getCookie("token");
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default serverAPI;