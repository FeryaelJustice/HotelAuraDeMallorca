import { useState } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';

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

    const goToScreen = async () => {
        switch (currentScreen) {
            case UserModalScreens.ScreenLogin:
                setCurrentScreen(UserModalScreens.ScreenRegister);
                break;
            case UserModalScreens.ScreenRegister:
                setCurrentScreen(UserModalScreens.ScreenVerify2FA);
                break;
            case UserModalScreens.ScreenVerify2FA:
                setCurrentScreen(UserModalScreens.ScreenEditProfile);
                break;
            case UserModalScreens.ScreenEditProfile:
                onClose();
                break;
            default:
                break;
        }
    }

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
            // api call
        }
    }

    // Form register
    const [registerValidated, setRegisterValidated] = useState(false);
    const [userRegister, setUserRegister] = useState({ email: "", password: "" });

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
                        <Button variant="primary" type="submit">
                            Login
                        </Button>
                    </Form>
                    {/* <Button variant="primary" type="submit" onClick={goToScreen}>
                        Go to next screen
                    </Button> */}
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenRegister && (
                <div>
                    <h1>
                        User register
                    </h1>
                    <Button variant="primary" type="submit" onClick={goToScreen}>
                        Go to next screen
                    </Button>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenVerify2FA && (
                <div>
                    <h1>
                        User verify 2fa
                    </h1>
                    <Button variant="primary" type="submit" onClick={goToScreen}>
                        Go to next screen
                    </Button>
                </div>
            )}

            {currentScreen === UserModalScreens.ScreenEditProfile && (
                <div>
                    <h1>
                        User edit profile
                    </h1>
                    <Button variant="primary" type="submit" onClick={goToScreen}>
                        Go to next screen
                    </Button>
                </div>
            )}
        </BaseModal>
    );
};

export default UserModal;