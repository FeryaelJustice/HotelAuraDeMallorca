import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import { useCookies } from 'react-cookie';
import Alert from 'react-bootstrap/Alert';
import ReCAPTCHA from "react-google-recaptcha";
import { User, Role } from './../../models/index';
import { API_URL, API_URL_BASE } from './../../services/consts';
import serverAPI from './../../services/serverAPI';
import { UserRoles } from '../../constants';
import './UserModal.css'

import { useTranslation } from "react-i18next";
import QRCode from 'qrcode.react';
import { EventEmitter, Events } from "./../../events/events";
// import { QrScanner } from '@yudiel/react-qr-scanner';
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

interface UserModalProps {
    colorScheme: string,
    show: boolean,
    onClose: () => void;
}

enum UserModalScreens {
    ScreenLogin,
    ScreenRegister,
    ScreenEditProfile,
}

const UserModal = ({ colorScheme, show, onClose }: UserModalProps) => {

    const { t } = useTranslation();
    const MySwal = withReactContent(Swal)

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
            setUserRegister({ email: "", dni: "", name: "", surnames: "", password: "", repeatpassword: "", roleID: 1 })
        } else {
            setCurrentScreen(UserModalScreens.ScreenEditProfile)
        }
    }

    const [currentScreen, setCurrentScreen] = useState(UserModalScreens.ScreenLogin);
    const [cookies, setCookie, removeCookie] = useCookies(['token', 'cookieConsent']);
    const [currentUser, setCurrentUser] = useState(new User());
    const [currentUserRole, setCurrentUserRole] = useState<Role>({ id: null, name: UserRoles.CLIENT })
    const captchaKey = process.env.reCAPTCHA_SITE_KEY
    const captchaServerKey = process.env.reCAPTCHA_SECRET_KEY;
    // const [showQRCameraReader, setShowQRCameraReader] = useState<boolean>(false)

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
                const modelUserData = new User({ id: userData.id, name: userData.user_name, surnames: userData.user_surnames, email: userData.user_email, dni: userData.user_dni, password: userData.user_password, verified: userData.user_verified, enabled: userData.isEnabled })
                setCurrentUser(modelUserData)
                setUserEdit({ name: modelUserData.name ? modelUserData.name : '', surnames: modelUserData.surnames ? modelUserData.surnames : '', token: cookies.token });

                // Check if user has a promo code present for 5 bookings
                serverAPI.post('/userPresentCheck', { userID: modelUserData.id }, { headers: { 'Authorization': cookies.token } }).then(res => {
                    if (res.data.promotion) {
                        alert("A unique promotion has been generated for you! You can see the code in 'Edit Profile' section.")
                    }
                })

                // Check if user is disabled for cancelling 2 bookings, a punishment
                serverAPI.post('/userPunishmentCheck', { userID: modelUserData.id }, { headers: { 'Authorization': cookies.token } }).then(res => {
                    if (res.data.disabled) {
                        alert("Your account is disabled for cancelling 2 or more bookings, contact the administrator")
                        logout();
                    }
                });

                // Get user promo code
                serverAPI.post('getUserAssociatedPromoCode', { userID: modelUserData.id }).then(res => {
                    if (res && res.data && res.data.results && res.data.results.length > 0) {
                        setUserPromoCode(res.data.results[0].code);
                    } else {
                        setUserPromoCode(null);
                    }
                }).catch(err => { console.log(err) })
            }).catch(err => console.log(err))
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
                if (!res.data.cookieJWT) {
                    resetUserModal();
                    onClose();
                    removeCookie('token');
                    alert('User has no access token, contact the administrator')
                } else {
                    if (cookies.cookieConsent) {
                        setCookie('token', res.data.cookieJWT)
                    } else {
                        alert("You didn't consent to use cookies, couldn't login")
                    }
                }
            }).catch(err => {
                console.log(err)
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
            setCaptchaLoginValid(true)
        } else {
            setCaptchaLoginValid(true)
        }
    }

    // Form register
    const [registerValidated, setRegisterValidated] = useState(false);
    const [userRegister, setUserRegister] = useState({ email: "", dni: "", name: "", surnames: "", password: "", repeatpassword: "", roleID: 1 }); // roleID: 1 CLIENT, 2 ADMIN, 3 EMPLOYEE
    const [captchaRegisterValid, setCaptchaRegisterValid] = useState(false)
    // QR
    const [formWantsQRRegister, setFormWantsQRRegister] = useState(false);
    const qrData = {
        user_name: 'usuario',
        user_surnames: 'usuario',
        user_password: '1234',
        user_verified: 0,
        user_email: userRegister.email,
        user_dni: userRegister.dni,
        endpointUrl_register: API_URL + '/register',
        endPointUrl_login: API_URL + '/login',
    };
    const handleFormWantsQRRegister = (e: any) => {
        setFormWantsQRRegister(!formWantsQRRegister);
        // setShowQRCameraReader(true)
        console.log(e.type)
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
        let form = event.currentTarget;

        // Check if Email or DNI exists
        serverAPI.post('/checkUserExists', { email: userRegister.email, dni: userRegister.dni }).then(_ => {
            let formValidity = true;
            let passwordsMatching = userRegister.password === userRegister.repeatpassword;
            formValidity = ((form.checkValidity() && captchaRegisterValid) || import.meta.env.MODE == 'development') && (passwordsMatching)
            setRegisterValidated(formValidity);
            if (formValidity) {
                if (!formWantsQRRegister) {
                    // api call
                    serverAPI.post('/register', userRegister).then(res => {
                        alert(res.data.msg)
                        resetUserModal();
                        onClose();
                    }).catch(err => {
                        console.log(err)
                        if (err.response.data && err.response.data.message) {
                            alert(err.response.data.message)
                        }
                    })
                } else {
                    serverAPI.post('/registerWithQR', { imagePicQR }).then(res => {
                        alert(res.data.msg)
                        resetUserModal();
                        onClose();
                    }).catch(err => {
                        console.log(err)
                        if (err.response.data && err.response.data.message) {
                            alert(err.response.data.message)
                        }
                    })
                }
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
            setCaptchaRegisterValid(true)
        } else {
            setCaptchaRegisterValid(false)
        }
    }

    // Edit profile

    const [userEdit, setUserEdit] = useState({ name: '', surnames: '', token: '' });
    const [imagePic, setImagePic] = useState('')
    const [imagePicPreview, setImagePicPreview] = useState<string | ArrayBuffer | null>()
    const [userPromoCode, setUserPromoCode] = useState<string | null>(null); // Not editable

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

                serverAPI.post('/uploadUserImg', formData, { headers: { 'Authorization': cookies.token } }).then(_ => {
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
                console.log(err)
                if (err.response.data && err.response.data.msg) {
                    alert(err.response.data.msg)
                }
            })
        } else {
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

                        <Form.Group className="mb-3" controlId="formDNI">
                            <Form.Label>{t("modal_user_register_dni_label")}</Form.Label>
                            <Form.Control type="text" minLength={9} maxLength={9} name='dni' placeholder={t("modal_user_register_dni_placeholder")} pattern="[0-9]{8}[A-Za-z]{1}" title="8 numbers and 1 character" onChange={handleRegisterChange} required />
                            <Form.Text className="text-muted">
                                {t("modal_user_register_dni_description")}
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>Please put a valid DNI</Form.Control.Feedback>
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
                                    {userRegister.email != '' && userRegister.dni != '' && (
                                        <div>
                                            <QRCode value={JSON.stringify(qrData)} size={128} />
                                            <img src={typeof imagePicQRPreview === 'string' ? imagePicQRPreview : ''} width={140} height={140} alt='uploaded image picture QR' style={{ marginLeft: '20px', verticalAlign: 'none' }} />
                                            <br />
                                            <br />
                                            <Form.Label htmlFor=''>Upload your QR</Form.Label>
                                            <Form.Control type='file' accept='image/*' name='qrPreview' id="qrPreview" onChange={handlePicQRChange} />
                                        </div>
                                    )}
                                </Form.Group>
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

                        {/*showQRCameraReader && (
                            <div style={{ width: '200px', height: '200px' }}>
                                <QrScanner
                                    onDecode={(result) => console.log(result)}
                                    onError={(error) => console.log(error?.message)}
                                />
                            </div>
                        )*/}

                        <div style={{
                            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        }}>
                            {/*formWantsQRRegister && (
                                <Button type='button' variant='warning' style={{ marginBottom: '12px' }} onClick={() => { setShowQRCameraReader(!showQRCameraReader) }}>{!showQRCameraReader ? `Open` : `Close`} your camera {!showQRCameraReader && `and scan your QR`}</Button>
                            )*/}
                            <Button variant="primary" type="submit">
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
                        </div>
                        <div className='userEditBtn'>
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
        </BaseModal>
    );
};

export default UserModal;