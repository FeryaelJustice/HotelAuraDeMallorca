import axios from "axios";

const api = axios.create({
    baseURL: "https://example.com/api",
});

export default api;