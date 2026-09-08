import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup'
import Alert from 'react-bootstrap/Alert';
import { FaEye, FaEyeSlash } from "react-icons/fa"
import { useCookies } from 'react-cookie';
import ReCAPTCHA from "react-google-recaptcha";
import { User, Role } from './../../models/index';
import { API_URL, API_URL_BASE } from './../../services/consts';
import serverAPI from './../../services/serverAPI';
import { UserRoles } from '../../constants';
import './UserModal.css'

import { useTranslation } from "react-i18next";
import { EventEmitter, Events } from "./../../events/events";
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

interface UserModalProps {
    colorScheme: string,
    show: boolean,
    onClose: () => void;
}

/**
 * Pantallas del modal de usuario (UserModalScreens)
 * Que hace: Alterna entre vistas de login, registro con QR, edicion de perfil,
 * cambio de contrasena y solicitud de recuperacion de cuenta.
 * Por que: Centraliza toda la logica de gestion de cuentas en un unico contenedor modal desacoplado.
 */
enum UserModalScreens {
    ScreenLogin,
    ScreenRegister,
    ScreenEditProfile,
    ScreenChangePassword,
    ScreenRecoverAccount,
}

/**
 * Componente: UserModal
 * Que hace: Modal interactivo para autenticacion (JWT + cookies), registro con Google reCAPTCHA,
 * escaneo/generacion de QR, gestion de perfil y recuperacion de contrasena con alertas SweetAlert2.
 * Por que: Ofrece una experiencia de usuario fluida y reactiva para el acceso seguro al sistema.
 */
const UserModal = ({ colorScheme, show, onClose }: UserModalProps) => {

    const { t } = useTranslation();
    const MySwal = withReactContent(Swal);

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    const getCleanErrorMessage = (err: any, fallback: string = 'Ha ocurrido un error inesperado'): string => {
        if (!err) return fallback;
        const msg = err.response?.data?.message ?? err.message;
        if (typeof msg === 'string' && msg.trim().length > 0) return msg;
        if (typeof msg === 'object' && msg !== null) {
            try {
                return JSON.stringify(msg);
            } catch {
                return fallback;
            }
        }
        return fallback;
    };

    const handleClose = () => {
        // De cualquier forma cuando lo cierre, vaciar el modal de data
        resetUserModal();
        onClose();
    }

    const resetUserModal = () => {
        setUserLogin({ email: "", password: "" })
        setLoginPasswordVisible(false)
        setUserRegister({ email: "", dni: "", name: "", surnames: "", password: "", repeatpassword: "", roleID: 1 })
        setUserRegisterPasswordsVisiblity({ passwordVisible: false, repeatPasswordVisible: false })
        setUserPasswordData({ password: "", repeatPassword: "" })
        setUserPasswordsVisible({ passwordVisible: false, repeatPasswordVisible: false })
        setRecoverAccountData({ email: '', codeIsSent: false, code: '', password: '', passwordVisible: false })

        if (!cookies.token) {
            setCurrentScreen(UserModalScreens.ScreenLogin)
            setCurrentUser(new User())
            setUserEdit({ name: '', surnames: '', token: '' });
        } else {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
        }
    }

    const [currentScreen, setCurrentScreen] = useState(UserModalScreens.ScreenLogin);
    const [cookies, setCookie, removeCookie] = useCookies(['token', 'cookieConsent']);
    const [currentUser, setCurrentUser] = useState(new User());
    const [currentUserRole, setCurrentUserRole] = useState<Role>({ id: null, name: UserRoles.CLIENT })
    const captchaKey =
        process.env.reCAPTCHA_SITE_KEY && process.env.reCAPTCHA_SITE_KEY !== "abc"
            ? process.env.reCAPTCHA_SITE_KEY
            : "6Le_wa4tAAAAAJurghi0g584K9-TBNOod089b5wM";
    // const [showQRCameraReader, setShowQRCameraReader] = useState<boolean>(false)

    useEffect(() => {
        if (!show) return;

        if (cookies.token) {
            setCurrentScreen(UserModalScreens.ScreenEditProfile);
            getAllLoggedUserData().then(res => {
                const userData = res.data;
                const modelUserData = new User({ id: userData.id, name: userData.user_name, surnames: userData.user_surnames, email: userData.user_email, dni: userData.user_dni, password: '', verified: userData.user_verified, enabled: userData.isEnabled });
                setCurrentUser(modelUserData);
                setUserEdit({ name: modelUserData.name ? modelUserData.name : '', surnames: modelUserData.surnames ? modelUserData.surnames : '', token: cookies.token });

                // Check if user has a promo code present for 5 bookings
                serverAPI.post('/userPresentCheck', { userID: modelUserData.id }, { headers: { 'Authorization': cookies.token } }).then(res => {
                    if (res.data.promotion) {
                        Toast.fire({
                            icon: 'info',
                            title: '¡Se ha generado una promoción exclusiva para ti! Puedes ver el código en la sección de Editar Perfil.'
                        });
                    }
                }).catch(err => console.log(err));

                // Check if user is disabled for cancelling 2 bookings, a punishment
                serverAPI.post('/userPunishmentCheck', { userID: modelUserData.id }, { headers: { 'Authorization': cookies.token } }).then(res => {
                    if (res.data.disabled) {
                        MySwal.fire({
                            icon: 'error',
                            title: 'Cuenta desactivada',
                            text: 'Tu cuenta ha sido suspendida temporalmente por cancelar 2 o más reservas. Por favor, contacta con el administrador.',
                            confirmButtonText: 'Entendido'
                        }).then(() => {
                            logout();
                        });
                    }
                }).catch(err => console.log(err));

                // Get user promo code
                serverAPI.post('/getUserAssociatedPromoCode', { userID: modelUserData.id }).then(res => {
                    if (res && res.data && res.data.results && res.data.results.length > 0) {
                        setUserPromoCode(res.data.results[0].code);
                    } else {
                        setUserPromoCode(null);
                    }
                }).catch(err => { console.log(err); });
            }).catch(err => console.log(err));

            // retrieve profile pic
            serverAPI.post('/getUserImgByToken', { token: cookies.token }).then(res => {
                let picURL = '';
                if (res && res.data && res.data.fileURL && res.data.fileURL.url) {
                    const rawUrl = res.data.fileURL.url;
                    picURL = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
                        ? rawUrl
                        : API_URL_BASE + "/" + rawUrl;
                }
                setImagePicPreview(picURL);
            }).catch(err => console.log(err));
        } else {
            setCurrentScreen(UserModalScreens.ScreenLogin);
        }
    }, [cookies, show]);

    const goToRegisterScreen = async () => {
        setCurrentScreen(UserModalScreens.ScreenRegister)
    }

    const goToRecoverAccount = async () => {
        setCurrentScreen(UserModalScreens.ScreenRecoverAccount);
    }

    const logout = () => {
        removeCookie('token')
        window.location.reload();
    }

    async function showConfirmationDialog() {
        const result = await MySwal.fire({
            title: 'Are you sure?',
            text: 'You won\'t be able to revert this!',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
        })
        return result.isConfirmed;
    };

    const deleteAccount = () => {
        showConfirmationDialog().then(confirm => {
            if (confirm) {
                // Delete account
                serverAPI.delete('/user', {
                    headers: {
                        Authorization: cookies.token
                    }
                }).then(response => {
                    if (response.data.status == "success") {
                        alert(response.data.message)
                        // Remove cookies
                        logout();
                    }
                }).catch(err => console.log(err))
            }
        })
    }

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const loggedUserID = await serverAPI.post('/getLoggedUserID', { token: cookies.token }).catch(err => {
            console.log(err)
            removeCookie('token');
        });
        if (loggedUserID) {
            const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID, { headers: { 'Authorization': cookies.token } }).catch(err => {
                removeCookie('token')
                console.log(err)
            });
            if (getLoggedUserData) {
                const userRole = await serverAPI.get('/getUserRole/' + loggedUserID.data.userID, { headers: { 'Authorization': cookies.token } })
                setCurrentUserRole(new Role({ id: userRole.data.data.id, name: userRole.data.data.name }))
                return getLoggedUserData.data;
            }
        }
    }

    // Form login
    const [loginValidated, setLoginValidated] = useState(false);
    const [userLogin, setUserLogin] = useState({ email: "", password: "" });
    const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
    const [captchaLoginValid, setCaptchaLoginValid] = useState(false);
    const [captchaLoginError, setCaptchaLoginError] = useState(false);

    const handleLoginChange = (event: any) => {
        setUserLogin({ ...userLogin, [event.target.name]: event.target.value });
    }

    const handleLoginSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        const isFormValid = form.checkValidity();
        setLoginValidated(isFormValid);
        if (!captchaLoginValid && import.meta.env.MODE != 'development') {
            setCaptchaLoginError(true);
        }
        if ((isFormValid && captchaLoginValid) || import.meta.env.MODE == 'development') {
            serverAPI.post('/login', userLogin).then(res => {
                if (!res.data.cookieJWT) {
                    resetUserModal();
                    onClose();
                    removeCookie('token');
                    Toast.fire({
                        icon: 'error',
                        title: 'No se pudo obtener el token de acceso. Contacte al administrador.'
                    });
                } else {
                    if (cookies.cookieConsent) {
                        setCookie('token', res.data.cookieJWT);
                        Toast.fire({
                            icon: 'success',
                            title: '¡Sesión iniciada con éxito! Bienvenido.'
                        });
                        onClose();
                    } else {
                        Toast.fire({
                            icon: 'warning',
                            title: 'No aceptó las cookies, no se pudo mantener la sesión iniciada.'
                        });
                    }
                }
            }).catch(err => {
                console.error("Login error:", err);
                const errorMessage = getCleanErrorMessage(err, 'No se pudo iniciar sesión. Verifique sus credenciales.');
                Toast.fire({
                    icon: 'error',
                    title: errorMessage
                });
            });
        }
    }

    const onLoginCaptchaChange = async (value: string | null) => {
        if (!value) {
            setCaptchaLoginValid(false);
            return;
        }
        const body = {
            response: value,
        };
        const headers = {
            "Content-Type": "application/json",
        };
        try {
            const isHuman = await serverAPI.post("/captchaSiteVerify", body, { headers });
            if (isHuman?.data?.success) {
                setCaptchaLoginValid(true);
                setCaptchaLoginError(false);
            } else {
                setCaptchaLoginValid(false);
                setCaptchaLoginError(true);
            }
        } catch {
            setCaptchaLoginValid(false);
            setCaptchaLoginError(true);
        }
    };

    // Form register
    const [registerValidated, setRegisterValidated] = useState(false);
    const [userRegister, setUserRegister] = useState({ email: "", dni: "", name: "", surnames: "", password: "", repeatpassword: "", roleID: 1 }); // roleID: 1 CLIENT, 2 ADMIN, 3 EMPLOYEE
    const [userRegisterPasswordsVisibility, setUserRegisterPasswordsVisiblity] = useState({ passwordVisible: false, repeatPasswordVisible: false });
    const [captchaRegisterValid, setCaptchaRegisterValid] = useState(false);
    const [captchaRegisterError, setCaptchaRegisterError] = useState(false);

    const handleRegisterChange = (event: any) => {
        setUserRegister({ ...userRegister, [event.target.name]: event.target.value });
    }

    const handleRegisterSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();
        let form = event.currentTarget;

        // Check if Email or DNI exists
        serverAPI.post('/checkUserExists', { email: userRegister.email, dni: userRegister.dni }).then(_ => {
            let formValidity = true;
            let passwordsMatching = userRegister.password === userRegister.repeatpassword;
            if (!captchaRegisterValid && import.meta.env.MODE != 'development') {
                setCaptchaRegisterError(true);
            }
            formValidity = ((form.checkValidity() && captchaRegisterValid) || import.meta.env.MODE == 'development') && (passwordsMatching)
            setRegisterValidated(formValidity);
            if (formValidity) {
                // api call
                serverAPI.post('/register', userRegister).then(res => {
                    alert(res.data.message)
                    resetUserModal();
                    onClose();
                }).catch(err => {
                    console.log(err)
                    if (err.response.data && err.response.data.message) {
                        alert(err.response.data.message)
                    }
                })
            } else {
                if (!passwordsMatching) {
                    alert("Passwords don't match!")
                } else {
                    alert("Form not valid!")
                }
            }
        }).catch(error => {
            if (error && error.response && error.response.data && error.response.data.message) {
                alert(error.response.data.message)
            }
        })
    }

    const onRegisterCaptchaChange = async (token: string | null) => {
        if (!token) {
            setCaptchaRegisterValid(false);
            return;
        }
        const body = {
            response: token,
        };
        const headers = {
            "Content-Type": "application/json",
        };
        try {
            const isHuman = await serverAPI.post("/captchaSiteVerify", body, { headers });
            if (isHuman?.data?.success) {
                setCaptchaRegisterValid(true);
                setCaptchaRegisterError(false);
            } else {
                setCaptchaRegisterValid(false);
                setCaptchaRegisterError(true);
            }
        } catch {
            setCaptchaRegisterValid(false);
            setCaptchaRegisterError(true);
        }
    };

    // Edit profile

    const [userEdit, setUserEdit] = useState({ name: '', surnames: '', token: '' });
    const [imagePic, setImagePic] = useState('')
    const [imagePicPreview, setImagePicPreview] = useState<string | ArrayBuffer | null>()
    const [userPromoCode, setUserPromoCode] = useState<string | null>(null); // Not editable

    const handleSaveEditChange = (event: any) => {
        setUserEdit({ ...userEdit, [event.target.name]: event.target.value });
    }

    const handleSaveEdit = async (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        if (userEdit.name != "" && userEdit.surnames != "" && form.checkValidity()) {
            try {
                const res = await serverAPI.post('/edituser', userEdit);

                if (imagePic) {
                    const formData = new FormData();
                    formData.append("image", imagePic);
                    formData.append('userID', currentUser.id?.toString() ? currentUser.id.toString() : '');

                    await serverAPI.post('/uploadUserImg', formData, { headers: { 'Authorization': cookies.token } });

                    const imgRes = await serverAPI.post('/getUserImgByToken', { token: cookies.token });
                    if (imgRes && imgRes.data && imgRes.data.fileURL && imgRes.data.fileURL.url) {
                        const rawUrl = imgRes.data.fileURL.url;
                        const pic = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
                            ? rawUrl
                            : API_URL_BASE + "/" + rawUrl;
                        setImagePicPreview(pic);
                    }

                    EventEmitter.dispatch(Events.CHANGE_PROFILE_PIC, null);
                }

                alert(res.data?.message || 'User updated successfully');
                resetUserModal();
                onClose();
            } catch (err: any) {
                console.error("Error saving user profile:", err);
                if (err?.response?.data?.message) {
                    alert(err.response.data.message);
                } else {
                    alert(err?.message || 'Something went wrong');
                }
            }
        } else {
            alert('Something went wrong');
        }
    }

    const handleProfilePicChange = (e: any) => {
        const file = e.target.files[0];
        setImagePic(file);

        const reader = new FileReader();
        reader.onload = () => {
            setImagePicPreview(reader.result);
        }
        reader.readAsDataURL(file)
    }

    // CHANGE PASSWORD SCREEN

    const [userPasswordData, setUserPasswordData] = useState({ password: '', repeatPassword: '' });
    const [userPasswordsVisible, setUserPasswordsVisible] = useState({ passwordVisible: false, repeatPasswordVisible: false });
    function goToChangePassword() {
        setCurrentScreen(UserModalScreens.ScreenChangePassword)
    }

    const handleChangePasswordForm = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        if (userPasswordData.password != "" && userPasswordData.repeatPassword != "" && form.checkValidity()) {
            if (userPasswordData.password === userPasswordData.repeatPassword) {
                serverAPI.post('/editUserPassword', { password: userPasswordData.password }, { headers: { 'Authorization': cookies.token } }).then(res => {
                    alert(res.data.message)
                    resetUserModal();
                    onClose();
                }).catch(err => {
                    console.log(err)
                    if (err.response.data && err.response.data.message) {
                        alert(err.response.data.message)
                    }
                })
            } else {
                alert('Passwords don\'t match!')
            }
        } else {
            alert('Passwords need to be set')
        }
    }

    const handleEditPasswordFieldChange = (event: any) => {
        setUserPasswordData({ ...userPasswordData, [event.target.name]: event.target.value });
    }

    // Recover account SCREEN

    const [recoverAccountData, setRecoverAccountData] = useState({ email: '', codeIsSent: false, code: '', password: '', passwordVisible: false });

    const handleRecoverAccountForm = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (recoverAccountData.code != '' && recoverAccountData.password != '') {
            if (recoverAccountData.email === '') {
                alert('Cannot recover account because email data is lost and it\'s empty!')
                return;
            }
            serverAPI.post('/recoverAccount', { token: recoverAccountData.code, email: recoverAccountData.email, password: recoverAccountData.password }).then(_ => {
                alert('Password changed successfully')
                resetUserModal();
                onClose();
            }).catch(error => {
                if (error && error.response && error.response.data && error.response.data.message) {
                    alert(error.response.data.message)
                }
            })
        } else {
            alert('Fields are not valid or are empty')
        }
    }

    const handleRecoverDataFieldChange = (event: any) => {
        setRecoverAccountData({ ...recoverAccountData, [event.target.name]: event.target.value });
    }

    function sendRecoverAccountEmail() {
        if (recoverAccountData.email === '') {
            alert('Email is required')
            return
        }
        serverAPI.post('/sendRecoverAccountMail', { email: recoverAccountData.email }).then(res => {
            setRecoverAccountData({ ...recoverAccountData, codeIsSent: true })
            alert(res.data.message)
        }).catch(error => {
            if (error && error.response && error.response.data && error.response.data.message) {
                alert(error.response.data.message)
            }
        })
    }

    // When close, reset
    useEffect(() => {
        resetUserModal();
    }, [show])

    return (
        <BaseModal title={t("user")} show={show} onClose={handleClose}>
            {currentScreen === UserModalScreens.ScreenLogin && (
                <div>
                    <Form id='userLoginForm' validated={loginValidated} onSubmit={handleLoginSubmit}>
                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>{t("modal_user_login_email_label")}</Form.Label>
                            <Form.Control type="email" name='email' minLength={1} maxLength={100} placeholder={t("modal_user_login_email_placeholder")} onChange={handleLoginChange} required />
                            <Form.Text className="text-muted">
                                {t("modal_user_login_email_description")}
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>Please put a valid email</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formPassword">
                            <Form.Label>{t("modal_user_login_password_label")}</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type={loginPasswordVisible ? 'text' : 'password'}
                                    name='password'
                                    placeholder={t("modal_user_login_password_placeholder")}
                                    onChange={handleLoginChange}
                                    value={userLogin.password}
                                    required
                                />
                                <Button
                                    variant="outline-secondary"
                                    type="button"
                                    onClick={() => setLoginPasswordVisible(!loginPasswordVisible)}
                                    aria-label={loginPasswordVisible ? "Ocultar contraseña" : "Ver contraseña"}
                                    tabIndex={-1}
                                >
                                    {loginPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                                </Button>
                            </InputGroup>
                            <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                        </Form.Group>

                        {import.meta.env.MODE != 'development' && (<div className='captcha user-modal-captcha'>
                            <ReCAPTCHA
                                sitekey={captchaKey as string}
                                onChange={(token) => onLoginCaptchaChange(token ?? '')}
                            />
                            {captchaLoginError ? (
                                <Alert key='danger' variant='danger' style={{ marginTop: '8px', width: '100%' }}>
                                    Captcha error
                                </Alert>
                            ) : null}
                        </div>)}

                        <div className="userLoginModalActions">
                            <Button variant="primary" type="submit" className="btn-login-submit">
                                {t("modal_user_login_send")}
                            </Button>
                            <div className="user-login-links-container">
                                <div className="user-login-register-line">
                                    <span>{t("modal_user_login_advert")}</span>
                                    <a id='goToRegisterA' onClick={goToRegisterScreen}>
                                        {t("modal_user_login_register")}
                                    </a>
                                </div>
                                <div className="user-login-recover-line">
                                    <a id='goToRecoverA' onClick={goToRecoverAccount} className="user-login-recover-link">
                                        ¿Forgot your password? Recover your account here
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Form>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenRegister && (
                <div>
                    <Form id='userRegisterForm' validated={registerValidated} onSubmit={handleRegisterSubmit}>
                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>{t("modal_user_register_email_label")}</Form.Label>
                            <Form.Control type="email" minLength={1} maxLength={100} name='email' placeholder={t("modal_user_register_email_placeholder")} onChange={handleRegisterChange} required />
                            <Form.Text className="text-muted">
                                {t("modal_user_register_email_description")}
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>Please put a valid email</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formDNI">
                            <Form.Label>{t("modal_user_register_dni_label")}</Form.Label>
                            <Form.Control type="text" minLength={9} maxLength={9} name='dni' placeholder={t("modal_user_register_dni_placeholder")} pattern="[0-9]{8}[A-Za-z]{1}" title="8 numbers and 1 character" onChange={handleRegisterChange} required />
                            <Form.Text className="text-muted">
                                {t("modal_user_register_dni_description")}
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>Please put a valid DNI</Form.Control.Feedback>
                        </Form.Group>

                        <div>
                            <Form.Group className="mb-3" controlId="formName">
                                <Form.Label>{t("modal_user_register_name_label")}</Form.Label>
                                <Form.Control type="text" name='name' placeholder={t("modal_user_register_name_placeholder")} onChange={handleRegisterChange} />
                                <Form.Control.Feedback type='invalid'>Name is not valid</Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formSurnames">
                                <Form.Label>{t("modal_user_register_surnames_label")}</Form.Label>
                                <Form.Control type="text" name='surnames' placeholder={t("modal_user_register_surnames_placeholder")} onChange={handleRegisterChange} />
                                <Form.Control.Feedback type='invalid'>Surnames is not valid</Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formPassword">
                                <Form.Label>{t("modal_user_register_password_label")}</Form.Label>
                                <InputGroup>
                                    <Form.Control type={userRegisterPasswordsVisibility.passwordVisible ? 'text' : 'password'} name='password' placeholder={t("modal_user_register_password_placeholder")} onChange={handleRegisterChange} required />
                                    <Button onClick={() => { setUserRegisterPasswordsVisiblity({ ...userRegisterPasswordsVisibility, passwordVisible: !userRegisterPasswordsVisibility.passwordVisible }) }}>
                                        {userRegisterPasswordsVisibility.passwordVisible ? <FaEyeSlash /> : <FaEye />}
                                    </Button>
                                </InputGroup>
                                <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formRepeatPassword">
                                <Form.Label>{t("modal_user_register_repeatpassword_label")}</Form.Label>
                                <InputGroup>
                                    <Form.Control type={userRegisterPasswordsVisibility.repeatPasswordVisible ? 'text' : 'password'} name='repeatpassword' placeholder={t("modal_user_register_repeatpassword_placeholder")} onChange={handleRegisterChange} required />
                                    <Button onClick={() => { setUserRegisterPasswordsVisiblity({ ...userRegisterPasswordsVisibility, repeatPasswordVisible: !userRegisterPasswordsVisibility.repeatPasswordVisible }) }}>
                                        {userRegisterPasswordsVisibility.repeatPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                                    </Button>
                                </InputGroup>
                                <Form.Control.Feedback type='invalid'>Passwords don't match</Form.Control.Feedback>
                            </Form.Group>
                        </div>

                        {import.meta.env.MODE != 'development' && (<div className='captcha user-modal-captcha'>
                            <ReCAPTCHA
                                sitekey={captchaKey as string}
                                onChange={(token) => onRegisterCaptchaChange(token ?? '')}
                            />
                            {captchaRegisterError ? (
                                <Alert key='danger' variant='danger' style={{ marginTop: '8px', width: '100%' }}>
                                    Captcha error
                                </Alert>
                            ) : null}
                        </div>)}

                        <div style={{
                            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '1rem'
                        }}>
                            <Button variant="primary" type="submit" className="btn-login-submit">
                                {t("modal_user_register_send")}
                            </Button>
                        </div>
                    </Form>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenEditProfile && (
                <div>
                    <h2>
                        {t("modal_user_editprofile_title")}
                    </h2>
                    {(currentUserRole?.name == UserRoles.ADMIN || currentUserRole?.name == UserRoles.EMPLOYEE) && (
                        <p>
                            Eres {currentUserRole.name}
                        </p>
                    )}
                    <Form id='userEditProfileForm' onSubmit={handleSaveEdit}>
                        <div className='userEditDetails'>
                            <Form.Group className='mb-3' controlId='formImage'>
                                <img src={typeof imagePicPreview === 'string' ? imagePicPreview : ''} width={200} height={200} alt='image picture' />
                                <br />
                                <br />
                                <Form.Control type='file' accept='image/*' onChange={handleProfilePicChange} />
                            </Form.Group>

                            <div>
                                <p><strong>{t("modal_user_login_email_label")}</strong>: {currentUser.email}</p>
                                <p><strong>DNI:</strong> {currentUser.dni}</p>
                                {userPromoCode && (<p><strong>{t("promoCode")}:</strong> {userPromoCode}</p>)}
                            </div>

                            <Form.Group className="mb-3" controlId="formName">
                                <Form.Label>{t("modal_user_editprofile_name_label")}</Form.Label>
                                <Form.Control type="text" name='name' placeholder={t("modal_user_editprofile_name_placeholder")} onChange={handleSaveEditChange} value={userEdit.name ? userEdit.name : ''} minLength={1} maxLength={100} />
                                <Form.Control.Feedback type='invalid'>Name is not valid</Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formSurnames">
                                <Form.Label>{t("modal_user_editprofile_surnames_label")}</Form.Label>
                                <Form.Control type="text" name='surnames' placeholder={t("modal_user_editprofile_surnames_placeholder")} onChange={handleSaveEditChange} value={userEdit.surnames ? userEdit.surnames : ''} minLength={1} maxLength={200} />
                                <Form.Control.Feedback type='invalid'>Surnames is not valid</Form.Control.Feedback>
                            </Form.Group>

                            <span style={{ cursor: 'pointer' }} onClick={() => { goToChangePassword() }}><strong>Want to change your password? Click here</strong></span>
                        </div>
                        <div className='userEditBtns'>
                            <Button variant="primary" type='submit'>
                                {t("modal_user_editprofile_send")}
                            </Button>
                            <Button variant="warning" type='button' onClick={logout} style={{ backgroundColor: colorScheme == "light" ? 'purple' : 'yellow', color: colorScheme == "light" ? 'white' : 'black' }}>
                                {t("modal_user_editprofile_logout")}
                            </Button>
                            <Button variant='danger' type='button' onClick={deleteAccount}>
                                {t("modal_user_editprofile_delete")}
                            </Button>
                        </div>
                    </Form>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenChangePassword && (
                <div>
                    <h3>{t("modal_user_changePassword_title")}</h3>
                    <Form id='userChangePasswordForm' onSubmit={handleChangePasswordForm}>
                        <div className='userChangePasswordFormDetails'>
                            <Form.Group className="mb-3" controlId="userChangePasswordFormPassword">
                                <Form.Label>{t("password")}</Form.Label>
                                <InputGroup>
                                    <Form.Control type={userPasswordsVisible.passwordVisible ? 'text' : 'password'} name='password' placeholder='xxxx' onChange={handleEditPasswordFieldChange} value={userPasswordData.password ? userPasswordData.password : ''} minLength={1} maxLength={100} />
                                    <Button onClick={() => { setUserPasswordsVisible({ ...userPasswordsVisible, passwordVisible: !userPasswordsVisible.passwordVisible }) }}>
                                        {userPasswordsVisible.passwordVisible ? <FaEyeSlash /> : <FaEye />}
                                    </Button>
                                </InputGroup>
                                <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="userChangePasswordFormRepeatPassword">
                                <Form.Label>{t("repeatPassword")}</Form.Label>
                                <InputGroup>
                                    <Form.Control type={userPasswordsVisible.repeatPasswordVisible ? 'text' : 'password'} name='repeatPassword' placeholder='xxxx' onChange={handleEditPasswordFieldChange} value={userPasswordData.repeatPassword ? userPasswordData.repeatPassword : ''} minLength={1} maxLength={200} />
                                    <Button onClick={() => { setUserPasswordsVisible({ ...userPasswordsVisible, repeatPasswordVisible: !userPasswordsVisible.repeatPasswordVisible }) }}>
                                        {userPasswordsVisible.repeatPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                                    </Button>
                                </InputGroup>
                                <Form.Control.Feedback type='invalid'>Repeat password is not valid</Form.Control.Feedback>
                            </Form.Group>
                        </div>
                        <div className='userEditBtns'>
                            <Button variant="primary" type='submit'>
                                {t("modal_user_editprofile_send")}
                            </Button>
                        </div>
                    </Form>
                </div>
            )
            }

            {currentScreen === UserModalScreens.ScreenRecoverAccount && (
                <div>
                    <h3>{t("modal_user_recoverAccount_title")}</h3>
                    <Form id='userRecoverAccountForm' onSubmit={handleRecoverAccountForm}>
                        <div className='userRecoverAccountFormDetails'>
                            {recoverAccountData.codeIsSent ? (
                                <div>
                                    <Form.Group className="mb-3" controlId="userRecoverAccountFormTempCode">
                                        <Form.Label>{t("code")}</Form.Label>
                                        <Form.Control type='text' name='code' placeholder={t("code")} onChange={handleRecoverDataFieldChange} value={recoverAccountData.code ? recoverAccountData.code : ''} minLength={1} maxLength={100} />
                                    </Form.Group>
                                    <Form.Group className="mb-3" controlId="userRecoverAccountFormPassword">
                                        <Form.Label>{t("new") + " " + t("password")}</Form.Label>
                                        <InputGroup>
                                            <Form.Control type={recoverAccountData.passwordVisible ? 'text' : 'password'} name='password' placeholder='xxxx' onChange={handleRecoverDataFieldChange} value={recoverAccountData.password ? recoverAccountData.password : ''} minLength={1} maxLength={100} />
                                            <Button onClick={() => { setRecoverAccountData({ ...recoverAccountData, passwordVisible: !recoverAccountData.passwordVisible }) }}>
                                                {recoverAccountData.passwordVisible ? <FaEyeSlash /> : <FaEye />}
                                            </Button>
                                        </InputGroup>
                                        <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                                    </Form.Group>
                                    <Button variant="primary" type='submit'>
                                        {t("modal_user_editprofile_send")}
                                    </Button>
                                </div>
                            ) : (
                                <div>
                                    <Form.Group className="mb-3" controlId="userRecoverAccountFormEmail">
                                        <Form.Label>{t("modal_user_register_email_label")}</Form.Label>
                                        <Form.Control type="email" minLength={1} maxLength={100} name='email' placeholder={t("modal_user_register_email_placeholder")} onChange={handleRecoverDataFieldChange} value={recoverAccountData.email ? recoverAccountData.email : ''} required />
                                        <Form.Control.Feedback type='invalid'>Please put a valid email</Form.Control.Feedback>
                                    </Form.Group>
                                    <Button variant="primary" type='button' onClick={() => { sendRecoverAccountEmail() }}>
                                        {t("modal_user_recoverAccount_sendCode")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Form>
                </div>
            )}
        </BaseModal>
    );
};

export default UserModal;
