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
        console.log(userLogin)
    }

    const handleLoginSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        setLoginValidated(form.checkValidity());
        if (form.checkValidity()) {
            axios.post('http://localhost:3000/api/login', userLogin, { headers: axiosHeaders }).then(res => {
                console.log(res)
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
        console.log(userRegister)
    }

    const handleRegisterSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        setRegisterValidated(form.checkValidity());
        if (form.checkValidity()) {
            // api call
            axios.post('http://localhost:3000/api/register', userRegister, { headers: axiosHeaders }).then(res => {
                console.log(res)
            }).catch(err => {
                console.error(err)
            })
        }
    }

    return (
        <BaseModal title={'User'} show={show} onClose={onClose}>
            {currentScreen === UserModalScreens.ScreenLogin && (
                <div>
                    <Form noValidate validated={loginValidated} onSubmit={handleLoginSubmit}>
                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="text" name='email' placeholder="Enter your email" onChange={handleLoginChange} />
                            <Form.Text className="text-muted">
                                We'll never share your email with anyone else and we will send confirmation mails to this one.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" name='password' placeholder="Enter your password" onChange={handleLoginChange} />
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
                    <Form noValidate validated={registerValidated} onSubmit={handleRegisterSubmit}>
                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="text" name='email' placeholder="Enter your email" onChange={handleRegisterChange} />
                            <Form.Text className="text-muted">
                                We'll never share your email with anyone else and we will send confirmation mails to this one.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" name='name' placeholder="Enter your name" onChange={handleRegisterChange} />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formSurnames">
                            <Form.Label>Surnames</Form.Label>
                            <Form.Control type="text" name='surnames' placeholder="Enter your surnames" onChange={handleRegisterChange} />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" name='password' placeholder="Enter your password" onChange={handleRegisterChange} />
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