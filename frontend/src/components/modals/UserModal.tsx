import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import axios from 'axios'
import { useCookies } from 'react-cookie';

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

const UserModal = ({ show, onClose }: UserModalProps) => {
    const [currentScreen, setCurrentScreen] = useState(UserModalScreens.ScreenLogin);
    const [cookies, setCookie, removeCookie] = useCookies(['token']);

    useEffect(() => {
        if (cookies.token) {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
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

    // Axios request properties
    const axiosHeaders = {
        'Content-Type': 'application/json',
        'Authorization': '',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    axios.defaults.withCredentials = true;

    // Form login
    const [loginValidated, setLoginValidated] = useState(false);
    const [userLogin, setUserLogin] = useState({ email: "", password: "" });

    const handleLoginChange = (event: any) => {
        setUserLogin({ ...userLogin, [event.target.name]: event.target.value });
    }

    const handleLoginSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        setLoginValidated(form.checkValidity());
        console.log(loginValidated)
        if (loginValidated) {
            axios.post('http://localhost:3000/api/login', userLogin, { headers: axiosHeaders }).then(res => {
                console.log("logged successfully")
            }).catch(err => {
                console.error(err)
            })
        }
    }

    // Form register
    const [registerValidated, setRegisterValidated] = useState(false);
    const [userRegister, setUserRegister] = useState({ email: "", name: "", surnames: "", password: "" });

    const handleRegisterChange = (event: any) => {
        setUserRegister({ ...userRegister, [event.target.name]: event.target.value });
    }

    const handleRegisterSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        setRegisterValidated(form.checkValidity());
        if (registerValidated) {
            // api call
            axios.post('http://localhost:3000/api/register', userRegister, { headers: axiosHeaders }).then(res => {
                console.log('registered successfully')
            }).catch(err => {
                console.error(err)
            })
        }
    }

    return (
        <BaseModal title={'User'} show={show} onClose={onClose}>
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
                    <Button variant="primary" type="submit" onClick={onClose}>
                        Verify
                    </Button>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenEditProfile && (
                <div>
                    <h1>
                        User edit profile
                    </h1>
                    <Button variant="primary" type="submit" onClick={logout}>
                        Logout
                    </Button>
                </div>
            )}
        </BaseModal>
    );
};

export default UserModal;