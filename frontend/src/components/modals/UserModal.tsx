import { useState } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'

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

    return (
        <BaseModal title={'User'} show={show} onClose={onClose}>
            {currentScreen === UserModalScreens.ScreenLogin && (
                <div>
                    <h1>
                        User login
                    </h1>
                    <Button variant="primary" type="submit" onClick={goToScreen}>
                        Go to next screen
                    </Button>
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