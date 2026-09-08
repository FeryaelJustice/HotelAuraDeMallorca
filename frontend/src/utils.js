// ==============================================================================
// UTILIDADES DE VALIDACION DE FORMULARIOS Y ENTRADAS (utils.js)
// Proposito: Centraliza validaciones de texto vacio, correo electronico y DNI espanol
// utilizadas a lo largo de los formularios de registro, login y reservas.
// ==============================================================================

/**
 * Comprueba si una cadena es nula, indefinida o contiene exclusivamente espacios en blanco.
 * @param {string|null} str Cadena a evaluar.
 * @returns {boolean} true si esta vacia o solo contiene espacios.
 */
function isEmptyOrSpaces(str) {
    return str === null || str.match(/^ *$/) !== null;
}

/**
 * Valida si un correo electronico cumple con el formato estandar RFC 5322.
 * @param {string} email Direccion de correo a validar.
 * @returns {boolean} true si el formato es valido.
 */
function validateEmail(email) {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        ) !== null;
}

/**
 * Valida la estructura y letra de control de un Documento Nacional de Identidad (DNI) espanol.
 * @param {string} dni Cadena con 8 digitos y 1 letra.
 * @returns {boolean} true si la letra coincide con la tabla oficial de correspondencia del Ministerio del Interior.
 */
function validateDNI(dni) {
    // Validacion de tipo de dato
    if (typeof dni !== 'string') {
        return false;
    }

    // Formato: 8 digitos numericos seguidos de 1 letra
    const dniRegex = /^[0-9]{8}[A-Za-z]$/;
    if (!dniRegex.test(dni)) {
        return false;
    }

    // Verificacion de letra de control segun modulo 23
    const numericPart = parseInt(dni.slice(0, 8), 10);
    const letterPart = dni.slice(8, 9).toUpperCase();
    const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const calculatedLetter = validLetters.charAt(numericPart % 23);

    return letterPart === calculatedLetter;
}

export { isEmptyOrSpaces, validateEmail, validateDNI }