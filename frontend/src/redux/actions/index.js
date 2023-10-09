// import { Action } from "redux";

export const LOGIN = "LOGIN";
export const LOGOUT = "LOGOUT";

export const login = (data) => ({
    type: LOGIN,
    data,
});

export const logout = () => ({
    type: LOGOUT,
});