import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import axios from 'axios'
import { useCookies } from 'react-cookie';
import Alert from 'react-bootstrap/Alert';
import ReCAPTCHA from "react-google-recaptcha";
import { User } from './../../models/index'

interface UserModalProps {
    show: boolean,
    onClose: () => void;
}

enum UserModalScreens {
    ScreenLogin,
    ScreenRegister,
    ScreenVerify2FA,
    ScreenEditProfile,
}

// Axios request properties
const axiosHeaders = {
    'Content-Type': 'application/json',
    'Authorization': '',
    'Accept': 'application/json',
    'Access-Control-Allow-Origin': '*'
}
axios.defaults.withCredentials = true;

const UserModal = ({ show, onClose }: UserModalProps) => {
    const handleClose = () => {
        // De cualquier forma cuando lo cierre, vaciar el modal de data
        resetUserModal();
        onClose();
    }

    const resetUserModal = () => {
        if (!cookies.token) {
            setCurrentScreen(UserModalScreens.ScreenLogin)
            setCurrentUser(new User())
            setUserLogin({ email: "", password: "" })
            setUserRegister({ email: "", name: "", surnames: "", password: "" })
        } else {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
        }
    }

    const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';
    const [currentScreen, setCurrentScreen] = useState(UserModalScreens.ScreenLogin);
    const [cookies, setCookie, removeCookie] = useCookies(['token']);
    const [currentUser, setCurrentUser] = useState(new User());
    const captchaKey = process.env.reCAPTCHA_SITE_KEY
    const captchaServerKey = process.env.reCAPTCHA_SECRET_KEY;

    useEffect(() => {
        if (cookies.token) {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
            getAllLoggedUserData().then(res => {
                const userData = res.data;
                const modelUserData = new User({ id: userData.id, name: userData.user_name, surnames: userData.user_surnames, email: userData.user_email, password: userData.user_password_hash, verified: userData.user_verified })
                setCurrentUser(modelUserData)
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
        axios.delete(API_URL + '/api/');
        axios.delete(API_URL + '/api/user/' + currentUser.id).then(response => {
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
        const currentUser = await axios.post(API_URL + '/api/currentUser', cookies, { headers: axiosHeaders });
        if (currentUser) {
            const getLoggedUserData = await axios.get(API_URL + '/api/loggedUser/' + currentUser.data.userID, { headers: axiosHeaders }).catch(err => {
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
            axios.post(API_URL + '/api/login', userLogin, { headers: axiosHeaders }).then(res => {
                setCookie('token', res.data.cookieJWT)
                console.log("logged successfully" + res)
            }).catch(err => {
                console.error(err)
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
        const isHuman = await axios.post('https://www.google.com/recaptcha/api/siteverify', body, { headers: headers })
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
    const [userRegister, setUserRegister] = useState({ email: "", name: "", surnames: "", password: "" });
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
            // api call
            axios.post(API_URL + '/api/register', userRegister, { headers: axiosHeaders }).then(res => {
                // Esto redirigirá al edit profile por el listener, cuidado ya que esto no lo hacemos hasta que se verifique
                // setCookie('token', res.data.cookieJWT)
                console.log('registered successfully' + res)

                // After successful registration, send a request to generate and send a confirmation email
                axios.get(API_URL + `/api/user/sendConfirmationEmail/${res.data.insertId}`)
                    .then(response => {
                        alert('An email has been sent to your mail to verify your account!')
                        console.log('Confirmation email sent successfully', response);
                    })
                    .catch(error => {
                        console.error('Error sending confirmation email', error);
                    });
            }).catch(err => {
                console.error(err)
            })
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
        const isHuman = await axios.post('https://www.google.com/recaptcha/api/siteverify', body, { headers: headers })
        if (isHuman) {
            console.log('captcha verified successfully')
            setCaptchaRegisterValid(true)
        } else {
            console.log('captcha failed')
            setCaptchaRegisterValid(false)
        }
    }

    // Edit profile

    // When close, reset
    useEffect(() => {
        resetUserModal();
    }, [show])

    return (
        <BaseModal title={'User'} show={show} onClose={handleClose}>
            {currentScreen === UserModalScreens.ScreenLogin && (
                <div>
                    <Form validated={loginValidated} onSubmit={handleLoginSubmit}>
                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" name='email' minLength={1} maxLength={100} placeholder="Enter your email" onChange={handleLoginChange} required />
                            <Form.Text className="text-muted">
                                We'll never share your email with anyone else and we will send confirmation mails to this one.
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>Please put a valid email</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" name='password' placeholder="Enter your password" onChange={handleLoginChange} required />
                            <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                        </Form.Group>

                        {import.meta.env.MODE != 'development' && (<div className='captcha'>
                            <ReCAPTCHA
                                sitekey={captchaKey as string}
                                onChange={(token) => onLoginCaptchaChange(token ?? '')}
                            />
                            {captchaLoginValid == false ? (
                                <Alert key='danger' variant='danger'>
                                    Completa el captcha
                                </Alert>
                            ) : null}
                        </div>)}

                        <div className="userLoginModalActions">
                            <Button variant="primary" type="submit">
                                Login
                            </Button>
                            <div className="vertical-align">
                                <span>Don't have an account?</span>
                                <a id='goToRegisterA' onClick={goToRegisterScreen}>Register here</a>
                            </div>
                        </div>
                    </Form>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenRegister && (
                <div>
                    <Form validated={registerValidated} onSubmit={handleRegisterSubmit}>
                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" minLength={1} maxLength={100} name='email' placeholder="Enter your email" onChange={handleRegisterChange} required />
                            <Form.Text className="text-muted">
                                We'll never share your email with anyone else and we will send confirmation mails to this one.
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>Please put a valid email</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" name='name' placeholder="Enter your name" onChange={handleRegisterChange} />
                            <Form.Control.Feedback type='invalid'>Name is not valid</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formSurnames">
                            <Form.Label>Surnames</Form.Label>
                            <Form.Control type="text" name='surnames' placeholder="Enter your surnames" onChange={handleRegisterChange} />
                            <Form.Control.Feedback type='invalid'>Surnames is not valid</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" name='password' placeholder="Enter your password" onChange={handleRegisterChange} required />
                            <Form.Control.Feedback type='invalid'>Password is not valid</Form.Control.Feedback>
                        </Form.Group>

                        {import.meta.env.MODE != 'development' && (<div className='captcha'>
                            <ReCAPTCHA
                                sitekey={captchaKey as string}
                                onChange={(token) => onRegisterCaptchaChange(token ?? '')}
                            />
                            {captchaRegisterValid == false ? (
                                <Alert key='danger' variant='danger'>
                                    Completa el captcha
                                </Alert>
                            ) : null}
                        </div>)}

                        <Button variant="primary" type="submit">
                            Register
                        </Button>
                    </Form>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenVerify2FA && (
                <div>
                    <h1>
                        User verify 2fa
                    </h1>
                    <Button variant="primary" onClick={onClose}>
                        Verify
                    </Button>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenEditProfile && (
                <div>
                    <h1>
                        User edit profile
                    </h1>
                    <span>{currentUser.name}</span>
                    <Button variant="primary" onClick={logout}>
                        Logout
                    </Button>
                    <Button variant='danger' onClick={deleteAccount}>Delete Account</Button>
                </div>
            )}
        </BaseModal>
    );
};

export default UserModal;