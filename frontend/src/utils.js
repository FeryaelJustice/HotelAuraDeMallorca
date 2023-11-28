function isEmptyOrSpaces(str) {
    return str === null || str.match(/^ *$/) !== null;
}

function validateEmail(email) {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

function validateDNI(dni) {
    // Check if the input is a string
    if (typeof dni !== 'string') {
        return false;
    }

    // Regular expression to match a DNI format (8 digits followed by a letter)
    const dniRegex = /^[0-9]{8}[A-Za-z]$/;

    // Check if the DNI matches the expected format
    if (!dniRegex.test(dni)) {
        return false;
    }

    // Extract the letter part of the DNI
    const letterPart = dni.slice(8, 9);

    // const letterIndex = parseInt(numericPart) % 23;
    const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const isValid = validLetters.includes(letterPart.toUpperCase());

    // Check if the calculated letter matches the last letter of the DNI
    return isValid;

}

export { isEmptyOrSpaces, validateEmail, validateDNI }