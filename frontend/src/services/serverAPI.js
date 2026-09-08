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

// Helper: Guardar cookie en el navegador con fecha de expiracion
const setCookie = (name, value, days = 7) => {
    if (typeof document === "undefined") return;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
};

// Helper: Eliminar cookie en el navegador
const removeCookie = (name) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
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

// Cola de reintentos concurrentes mientras se renueva el token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Interceptor de respuesta HTTP
// Que hace: Detecta errores 401 (token expirado) e intenta renovar silenciosamente usando el refresh token.
// Por que: Permite una experiencia continua y sin cortes de sesion para el usuario.
serverAPI.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response &&
            error.response.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes("/login") &&
            !originalRequest.url?.includes("/refreshToken")
        ) {
            const refreshToken = getCookie("refreshToken");
            if (!refreshToken) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((newToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return serverAPI(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Usamos una instancia limpia de axios para evitar loops en interceptores
                const refreshResponse = await axios.post(
                    `${API_URL}/refreshToken`,
                    { refreshToken },
                    { timeout: 10000 }
                );

                const newAccessToken =
                    refreshResponse.data?.token || refreshResponse.data?.cookieJWT;
                const newRefreshToken = refreshResponse.data?.refreshToken;

                if (newAccessToken) {
                    setCookie("token", newAccessToken, 1);
                    if (newRefreshToken) {
                        setCookie("refreshToken", newRefreshToken, 7);
                    }

                    serverAPI.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                    processQueue(null, newAccessToken);
                    return serverAPI(originalRequest);
                } else {
                    processQueue(new Error("No new token received"), null);
                    removeCookie("token");
                    removeCookie("refreshToken");
                    return Promise.reject(error);
                }
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                removeCookie("token");
                removeCookie("refreshToken");
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default serverAPI;