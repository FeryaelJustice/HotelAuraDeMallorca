import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import { useCookies } from 'react-cookie';
import Alert from 'react-bootstrap/Alert';
import ReCAPTCHA from "react-google-recaptcha";
import { User, Role } from './../../models/index';
import { API_URL_BASE } from './../../services/consts';
import serverAPI from './../../services/serverAPI';
import { UserRoles } from '../../constants';
import './UserModal.css'

import { useTranslation } from "react-i18next";
import QRCode from 'qrcode.react';
import { EventEmitter, Events } from "./../../events/events";

interface UserModalProps {
    show: boolean,
    onClose: () => void;
}

enum UserModalScreens {
    ScreenLogin,
    ScreenRegister,
    ScreenEditProfile,
}

const UserModal = ({ show, onClose }: UserModalProps) => {

    const { t } = useTranslation();

    const handleClose = () => {
        // De cualquier forma cuando lo cierre, vaciar el modal de data
        resetUserModal();
        onClose();
    }

    const resetUserModal = () => {
        if (!cookies.token) {
            setCurrentScreen(UserModalScreens.ScreenLogin)
            setCurrentUser(new User())
            setUserEdit({ name: '', surnames: '', token: '' });
            setUserLogin({ email: "", password: "" })
            setUserRegister({ email: "", name: "", surnames: "", password: "", repeatpassword: "", roleID: 1 })
        } else {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
        }
    }

    const [currentScreen, setCurrentScreen] = useState(UserModalScreens.ScreenLogin);
    const [cookies, setCookie, removeCookie] = useCookies(['token']);
    const [currentUser, setCurrentUser] = useState(new User());
    const [currentUserRole, setCurrentUserRole] = useState<Role>({ id: null, name: UserRoles.CLIENT })
    const captchaKey = process.env.reCAPTCHA_SITE_KEY
    const captchaServerKey = process.env.reCAPTCHA_SECRET_KEY;

    useEffect(() => {
        if (cookies.token) {
            // retrieve profile pic and put
            serverAPI.post('/getUserImgByToken', { token: cookies.token }).then(res => {
                let picURL = API_URL_BASE + "/" + res.data.fileURL.url;
                setImagePicPreview(picURL);
            })
        }
    }, [])
    useEffect(() => {
        if (cookies.token) {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
            getAllLoggedUserData().then(res => {
                const userData = res.data;
                const modelUserData = new User({ id: userData.id, name: userData.user_name, surnames: userData.user_surnames, email: userData.user_email, password: userData.user_password, verified: userData.user_verified })
                setCurrentUser(modelUserData)
                setUserEdit({ name: modelUserData.name ? modelUserData.name : '', surnames: modelUserData.surnames ? modelUserData.surnames : '', token: cookies.token });
            }).catch(err => console.error(err))
            // retrieve profile pic and put
            serverAPI.post('/getUserImgByToken', { token: cookies.token }).then(res => {
                let picURL = API_URL_BASE + "/" + res.data.fileURL.url;
                setImagePicPreview(picURL);
            })
        } else {
            setCurrentScreen(UserModalScreens.ScreenLogin)
        }
    }, [cookies])

    const goToRegisterScreen = async () => {
        setCurrentScreen(UserModalScreens.ScreenRegister)
    }

    const logout = () => {
        removeCookie('token')
        window.location.reload();
    }

    const deleteAccount = () => {
        // Delete account
        serverAPI.delete('/user', {
            headers: {
                Authorization: cookies.token
            }
        }).then(response => {
            if (response.data.status == "success") {
                alert(response.data.message)
                // Remove cookies
                removeCookie('token')
                window.location.reload()
            }
        }).catch(err => console.error(err))
    }

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const loggedUserID = await serverAPI.post('/getLoggedUserID', { token: cookies.token });
        if (loggedUserID) {
            const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID).catch(err => {
                removeCookie('token')
                console.error(err)
            });
            if (getLoggedUserData) {
                const userRole = await serverAPI.get('/getUserRole/' + loggedUserID.data.userID)
                setCurrentUserRole(new Role({ id: userRole.data.data.id, name: userRole.data.data.name }))
                return getLoggedUserData.data;
            } else {
                removeCookie('token');
            }
        }
    }

    // Form login
    const [loginValidated, setLoginValidated] = useState(false);
    const [userLogin, setUserLogin] = useState({ email: "", password: "" });
    const [captchaLoginValid, setCaptchaLoginValid] = useState(false)

    const handleLoginChange = (event: any) => {
        setUserLogin({ ...userLogin, [event.target.name]: event.target.value });
    }

    const handleLoginSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        setLoginValidated(form.checkValidity());
        if ((loginValidated && captchaLoginValid) || import.meta.env.MODE == 'development') {
            serverAPI.post('/login', userLogin).then(res => {
                setCookie('token', res.data.cookieJWT)
                console.log("logged successfully" + res)
            }).catch(err => {
                console.error(err)
                if (err.response.data && err.response.data.msg) {
                    alert(err.response.data.msg)
                }
            })
        }
    }

    const onLoginCaptchaChange = async (value: string | null) => {
        const body = {
            secret: captchaServerKey,
            response: value
        }
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        // Verify captcha to backend
        const isHuman = await serverAPI.post('/captchaSiteVerify', body, { headers: headers })
        if (isHuman) {
            console.log('captcha verified successfully')
            setCaptchaLoginValid(true)
        } else {
            console.log('captcha failed')
            setCaptchaLoginValid(true)
        }
    }

    // Form register
    const [registerValidated, setRegisterValidated] = useState(false);
    const [userRegister, setUserRegister] = useState({ email: "", name: "", surnames: "", password: "", repeatpassword: "", roleID: 1 }); // roleID: 1 CLIENT, 2 ADMIN, 3 EMPLOYEE
    const [captchaRegisterValid, setCaptchaRegisterValid] = useState(false)
    // QR
    const [formWantsQRRegister, setFormWantsQRRegister] = useState(false);
    const qrData = {
        user_name: 'usuario',
        user_surnames: 'usuario',
        user_password: '1234',
        user_verified: 0,
        verification_token: null,
        verification_token_expiry: null,
        user_email: userRegister.email,
    };
    const handleFormWantsQRRegister = (e: any) => {
        setFormWantsQRRegister(!formWantsQRRegister);
        console.log(e)
    }
    const [imagePicQR, setImagePicQR] = useState<string | ArrayBuffer | null>()
    const [imagePicQRPreview, setImagePicQRPreview] = useState<string | ArrayBuffer | null>()

    const handlePicQRChange = (e: any) => {
        const file = e.target.files[0];

        const reader = new FileReader();
        reader.onload = () => {
            setImagePicQRPreview(reader.result);
            setImagePicQR(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleRegisterChange = (event: any) => {
        setUserRegister({ ...userRegister, [event.target.name]: event.target.value });
    }

    const handleRegisterSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!formWantsQRRegister) {
            let form = event.currentTarget;
            setRegisterValidated(form.checkValidity());
            if ((registerValidated && captchaRegisterValid) || import.meta.env.MODE == 'development') {
                if (userRegister.password === userRegister.repeatpassword) {
                    // api call
                    serverAPI.post('/register', userRegister).then(res => {
                        // Esto redirigirá al edit profile por el listener, cuidado ya que esto no lo hacemos hasta que se verifique
                        // setCookie('token', res.data.cookieJWT)
                        console.log('registered successfully' + res)

                        // After successful registration, send a request to generate and send a confirmation email
                        serverAPI.get(`/user/sendConfirmationEmail/${res.data.insertId}`)
                            .then(response => {
                                alert('An email has been sent to your mail to verify your account!')
                                console.log('Confirmation email sent successfully', response);
                                resetUserModal();
                                onClose();
                            })
                            .catch(error => {
                                console.error('Error sending confirmation email', error);
                                if (error.response.data) {
                                    alert(error.response.data.msg)
                                }
                            });
                    }).catch(err => {
                        console.error(err)
                        if (err.response.data && err.response.data.message) {
                            alert(err.response.data.message)
                        }
                    })
                } else {
                    alert("Passwords don't match!")
                    setRegisterValidated(false)
                }
            }
        } else {
            serverAPI.post('/registerWithQR', { imagePicQR }).then(res => {
                console.log(res)
            }).catch(err => console.error(err))
        }
    }

    const onRegisterCaptchaChange = async (token: string | null) => {
        const body = {
            secret: captchaServerKey,
            response: token
        }
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        // Verify captcha to backend
        const isHuman = await serverAPI.post('/captchaSiteVerify', body, { headers: headers })
        if (isHuman) {
            console.log('captcha verified successfully')
            setCaptchaRegisterValid(true)
        } else {
            console.log('captcha failed')
            setCaptchaRegisterValid(false)
        }
    }

    // Edit profile

    const [userEdit, setUserEdit] = useState({ name: '', surnames: '', token: '' });
    const [imagePic, setImagePic] = useState('')
    const [imagePicPreview, setImagePicPreview] = useState<string | ArrayBuffer | null>()

    const handleSaveEditChange = (event: any) => {
        setUserEdit({ ...userEdit, [event.target.name]: event.target.value });
    }

    const handleSaveEdit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        if (userEdit.name != "" && userEdit.surnames != "" && form.checkValidity()) {
            serverAPI.post('/edituser', userEdit).then(res => {
                const formData = new FormData();
                formData.append("image", imagePic);
                formData.append('userID', currentUser.id?.toString() ? currentUser.id.toString() : '')

                serverAPI.post('/uploadUserImg', formData).then(_ => {
                    // retrieve profile pic and put
                    serverAPI.post('/getUserImgByToken', { token: cookies.token }).then(res => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            setImagePicPreview(reader.result);
                        }
                        reader.readAsDataURL(res.data.fileURL.url)
                    })

                    // Emit event
                    EventEmitter.dispatch(Events.CHANGE_PROFILE_PIC, null);
                })
                alert(res.data.msg)
                resetUserModal();
                onClose();
            }).catch(err => {
                console.error(err)
                if (err.response.data && err.response.data.msg) {
                    alert(err.response.data.msg)
                }
            })
        } else {
            console.log(form.checkValidity())
            console.log(userEdit)
            alert('Something went wrong')
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
                            <Form.Control type="password" name='password' placeholder={t("modal_user_login_password_placeholder")} onChange={handleLoginChange} required />
                            <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                        </Form.Group>

                        {import.meta.env.MODE != 'development' && (<div className='captcha'>
                            <ReCAPTCHA
                                sitekey={captchaKey as string}
                                onChange={(token) => onLoginCaptchaChange(token ?? '')}
                            />
                            {captchaLoginValid == false ? (
                                <Alert key='danger' variant='danger'>
                                    Captcha error
                                </Alert>
                            ) : null}
                        </div>)}

                        <div className="userLoginModalActions">
                            <Button variant="primary" type="submit">
                                {t("modal_user_login_send")}
                            </Button>
                            <div className="vertical-align">
                                <span>{t("modal_user_login_advert")}</span>
                                <a id='goToRegisterA' onClick={goToRegisterScreen}>{t("modal_user_login_register")}</a>
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

                        {!formWantsQRRegister ? (
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
                                    <Form.Control type="password" name='password' placeholder={t("modal_user_register_password_placeholder")} onChange={handleRegisterChange} required />
                                    <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formRepeatPassword">
                                    <Form.Label>{t("modal_user_register_repeatpassword_label")}</Form.Label>
                                    <Form.Control type="password" name='repeatpassword' placeholder={t("modal_user_register_repeatpassword_placeholder")} onChange={handleRegisterChange} required />
                                    <Form.Control.Feedback type='invalid'>Passwords don't match</Form.Control.Feedback>
                                </Form.Group>
                            </div>
                        ) : (
                            <div>
                                <Form.Group className='mb-3'>
                                    <img src={typeof imagePicQRPreview === 'string' ? imagePicQRPreview : ''} width={200} height={200} alt='image picture QR' />
                                    <br />
                                    <br />
                                    <Form.Label htmlFor=''>Upload your QR</Form.Label>
                                    <Form.Control type='file' accept='image/*' name='qrPreview' id="qrPreview" onChange={handlePicQRChange} />
                                </Form.Group>
                                <QRCode value={JSON.stringify(qrData)} size={128} />
                            </div>
                        )}

                        <Form.Group className='mb-3' controlId='formWantsQRRegister'>
                            <Form.Check
                                type="checkbox"
                                label={t("modal_user_register_wantsToRegisterWithQR")}
                                name="formWantsQRRegister"
                                checked={formWantsQRRegister}
                                onChange={(e) => handleFormWantsQRRegister(e)}
                            />
                        </Form.Group>

                        {import.meta.env.MODE != 'development' && (<div className='captcha'>
                            <ReCAPTCHA
                                sitekey={captchaKey as string}
                                onChange={(token) => onRegisterCaptchaChange(token ?? '')}
                            />
                            {captchaRegisterValid == false ? (
                                <Alert key='danger' variant='danger'>
                                    Captcha error
                                </Alert>
                            ) : null}
                        </div>)}

                        <Button variant="primary" type="submit">
                            {t("modal_user_register_send")}
                        </Button>
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
                        </div>
                        <div className='userEditBtn'>
                            <Button variant="primary" type='submit'>
                                {t("modal_user_editprofile_send")}
                            </Button>
                            <Button variant="warning" type='button' onClick={logout}>
                                {t("modal_user_editprofile_logout")}
                            </Button>
                            <Button variant='danger' type='button' onClick={deleteAccount}>
                                {t("modal_user_editprofile_delete")}
                            </Button>
                        </div>
                    </Form>
                </div>
            )}
        </BaseModal>
    );
};

export default UserModal;