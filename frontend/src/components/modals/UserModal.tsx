import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import { useCookies } from 'react-cookie';
import Alert from 'react-bootstrap/Alert';
import ReCAPTCHA from "react-google-recaptcha";
import { User } from './../../models/index'
import './UserModal.css'
import { API_URL } from './../../services/consts';
import serverAPI from './../../services/serverAPI';

import { useTranslation } from "react-i18next";

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
            setUserRegister({ email: "", name: "", surnames: "", password: "", repeatpassword: "" })
        } else {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
        }
    }

    const [currentScreen, setCurrentScreen] = useState(UserModalScreens.ScreenLogin);
    const [cookies, setCookie, removeCookie] = useCookies(['token']);
    const [currentUser, setCurrentUser] = useState(new User());
    const captchaKey = process.env.reCAPTCHA_SITE_KEY
    const captchaServerKey = process.env.reCAPTCHA_SECRET_KEY;

    useEffect(() => {
        if (cookies.token) {
            getAllLoggedUserData().then(res => {
                const userData = res.data;
                // retrieve profile pic and put
                serverAPI.get('/api/getUserImg', { params: { userID: userData.id } }).then(res => {
                    setImagePicPreview(process.env.API_URL + "/" + res.data.fileURL.url);
                })
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
                // retrieve profile pic and put
                serverAPI.get('/api/getUserImg', { params: { userID: userData.id } }).then(res => {
                    setImagePicPreview(process.env.API_URL + "/" + res.data.fileURL.url);
                })
            }).catch(err => console.error(err))
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
        serverAPI.delete('/api/user/' + currentUser.id, {
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
        const currentUser = await serverAPI.post('/api/currentUser', cookies);
        if (currentUser) {
            const getLoggedUserData = await serverAPI.get('/api/loggedUser/' + currentUser.data.userID).catch(err => {
                removeCookie('token')
                console.error(err)
            });
            if (getLoggedUserData) {
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
            serverAPI.post('/api/login', userLogin).then(res => {
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
        const isHuman = await serverAPI.post('https://www.google.com/recaptcha/api/siteverify', body, { headers: headers })
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
    const [userRegister, setUserRegister] = useState({ email: "", name: "", surnames: "", password: "", repeatpassword: "" });
    const [captchaRegisterValid, setCaptchaRegisterValid] = useState(false)

    const handleRegisterChange = (event: any) => {
        setUserRegister({ ...userRegister, [event.target.name]: event.target.value });
    }

    const handleRegisterSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        setRegisterValidated(form.checkValidity());
        if ((registerValidated && captchaRegisterValid) || import.meta.env.MODE == 'development') {
            if (userRegister.password === userRegister.repeatpassword) {
                // api call
                serverAPI.post('/api/register', userRegister).then(res => {
                    // Esto redirigirá al edit profile por el listener, cuidado ya que esto no lo hacemos hasta que se verifique
                    // setCookie('token', res.data.cookieJWT)
                    console.log('registered successfully' + res)

                    // After successful registration, send a request to generate and send a confirmation email
                    serverAPI.get(API_URL + `/api/user/sendConfirmationEmail/${res.data.insertId}`)
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
        const isHuman = await serverAPI.post('https://www.google.com/recaptcha/api/siteverify', body, { headers: headers })
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
            serverAPI.post('/api/edituser', userEdit).then(res => {
                const formData = new FormData();
                formData.append("image", imagePic);
                formData.append('userID', currentUser.id?.toString() ? currentUser.id.toString() : '')

                serverAPI.post('/api/uploadUserImg', formData).then(res => {
                    console.log(res)

                    // retrieve profile pic and put
                    serverAPI.get('/api/getUserImg', { params: { userID: currentUser.id } }).then(res => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            setImagePicPreview(reader.result);
                        }
                        reader.readAsDataURL(res.data.fileURL.url)
                    })

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