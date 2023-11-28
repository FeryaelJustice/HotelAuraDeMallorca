import { NavLink } from "react-router-dom"
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useCookies } from 'react-cookie';
import serverAPI from './../../services/serverAPI';
// Multilanguage and roles
import { LANGUAGES, UserRoles } from "./../../constants";
import { Role } from './../../models/index';
import { useTranslation } from "react-i18next";
import { EventEmitter, Events } from "./../../events/events";
import { API_URL_BASE } from './../../services/consts';

interface HeaderProps {
    colorScheme: string,
    onOpenBookingModal: () => void;
    onOpenUserModal: () => void;
    currentUserRole: Role,
    userHasBookings: boolean
}

export const Header = ({ colorScheme, onOpenBookingModal, onOpenUserModal, currentUserRole, userHasBookings }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);
    const [cookies] = useCookies(['token']);

    const { i18n, t } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)

    EventEmitter.subscribe(Events.CHANGE_PROFILE_PIC, (_) => {
        if (cookies.token) {
            // retrieve profile pic and put each 20 seconds
            serverAPI.post('/getUserImgByToken', { token: cookies.token }).then(res => {
                let picURL = API_URL_BASE + "/" + res.data.fileURL.url;
                setUserPhotoURL(picURL);
            })
        }
    })

    const onChangeLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang_code = e.target.value;
        i18n.changeLanguage(lang_code);
        setSelectedLanguage(lang_code);
    };

    useEffect(() => {
        // Set the default language to the one detected by i18next
        setSelectedLanguage(i18n.language);
    }, [])

    useEffect(() => {
        if (cookies.token) {
            serverAPI.post('/getUserImgByToken', { token: cookies.token }).then((res: any) => {
                if (res && res.data && res.data.status != "error") {
                    let picURL = API_URL_BASE + "/" + res.data.fileURL.url;
                    setUserPhotoURL(picURL);
                }
            }).catch((err: any) => console.log(err))
        }
    }, [cookies])

    // imagenes responsive: style="width:100%; aspect-ratio: (aspect ratio que se ve en network, abrir imagen y en preview abajo, en formato por ejemplo 16/9);"
    const handleToggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };
    return (
        <header id="header" className="header">
            <h1>.</h1>
            <NavLink id="logo" className="logo" to="/" aria-hidden role="presentation">
                {colorScheme == 'dark' ? (
                    <img src="/logo.svg" alt="logo dark mode" aria-description="logo" width={'300px'} height={'40px'} />
                ) : (
                    <img src="/logo-white.webp" alt="logo light mode" aria-description="logo" width={'300px'} height={'40px'} />
                )}
            </NavLink>
            <nav id="nav" className="navigation">
                <NavLink to="/" className={({ isActive }) => {
                    let classNames = '';

                    if (isActive) {
                        classNames += 'is-active';
                    }

                    if (colorScheme !== 'dark') {
                        classNames += classNames ? '-light' : '-light';
                    }

                    return classNames;
                }}>{t("home")}</NavLink>
                <NavLink to="/services" className={({ isActive }) => {
                    let classNames = '';

                    if (isActive) {
                        classNames += 'is-active';
                    }

                    if (colorScheme !== 'dark') {
                        classNames += classNames ? '-light' : '-light';
                    }

                    return classNames;
                }}>{t("services")}</NavLink>
                <NavLink to="/contact" className={({ isActive }) => {
                    let classNames = '';

                    if (isActive) {
                        classNames += 'is-active';
                    }

                    if (colorScheme !== 'dark') {
                        classNames += classNames ? '-light' : '-light';
                    }

                    return classNames;
                }}>{t("contact")}</NavLink>
                {(cookies.token && userHasBookings) && (
                    <NavLink to="/user-bookings" className={({ isActive }) => {
                        let classNames = '';

                        if (isActive) {
                            classNames += 'is-active';
                        }

                        if (colorScheme !== 'dark') {
                            classNames += classNames ? '-light' : '-light';
                        }

                        return classNames;
                    }}>Reservas</NavLink>
                )}
                {(currentUserRole.name == UserRoles.ADMIN || currentUserRole.name == UserRoles.EMPLOYEE) && (
                    <NavLink to="/admin" className={({ isActive }) => {
                        let classNames = '';

                        if (isActive) {
                            classNames += 'is-active';
                        }

                        if (colorScheme !== 'dark') {
                            classNames += classNames ? '-light' : '-light';
                        }

                        return classNames;
                    }}><strong>Admin</strong></NavLink>
                )}
                <div id="nav-actions">
                    <Button variant="primary" id="bookBtn" onClick={onOpenBookingModal}>{t("book")}</Button>
                    <div className="user-icon">
                        {userPhotoURL && cookies.token ? (
                            <div className="user-icon-container">
                                <img id="user-icon" src={userPhotoURL} alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                            </div>
                        ) : (
                            <div>
                                {colorScheme === 'dark' ? (
                                    <img id="user-icon" src='/user-icon.svg' alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                                ) : (
                                    <img id="user-icon" src='/user-icon-white.webp' alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                                )}
                            </div>
                        )}

                        {/* Logged icon */}
                        {/* {cookies.token ? (
                            <div className={`logged-icon${colorScheme === 'dark' ? '' : '-light'}`}>
                                <FontAwesomeIcon icon={faCheck} />
                                <span>Logged</span>
                            </div>
                        ) : (
                            <div className="logged-icon">
                                <span></span>
                            </div>
                        )} */}
                    </div>

                    <div aria-label="multilanguage-selection" className="header-multilanguage">
                        <Form id="selectLangForm">
                            <Form.Select aria-label="Select language" value={selectedLanguage} name="selectLang" onChange={onChangeLang}>
                                {LANGUAGES.map(({ code, label }) => (
                                    <option key={code} value={code}>
                                        {label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form>
                    </div>
                </div>
            </nav>
            <button aria-label="toggle" className="menu-toggle" >
                <FontAwesomeIcon icon={faBars} onClick={handleToggleMenu} />
            </button>
            {isMenuOpen && (
                <div id="nav-menu">
                    <NavLink to="/" className={({ isActive }) => {
                        return isActive ? 'is-active' : undefined
                    }} onClick={closeMenu}>{t("home")}</NavLink>
                    <NavLink to="/services" className={({ isActive }) => {
                        return isActive ? 'is-active' : undefined
                    }} onClick={closeMenu}>{t("services")}</NavLink>
                    <NavLink to="/contact" className={({ isActive }) => {
                        return isActive ? 'is-active' : undefined
                    }} onClick={closeMenu}>{t("contact")}</NavLink>
                    <div aria-label="user-icon-phone" className="user-icon-phone">
                        {userPhotoURL && cookies.token ? (
                            <div className="user-icon-container">
                                <img id="user-icon" src={userPhotoURL} alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                            </div>
                        ) : (
                            <div className="user-icon-container">
                                <img id="user-icon" src='/user-icon.svg' alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                            </div>
                        )}

                        {/* Logged icon */}
                        {/* {cookies.token ? (
                            <div className="logged-icon">
                                <FontAwesomeIcon icon={faCheck} />
                                <span>Logged</span>
                            </div>
                        ) : (

                            <div className="logged-icon">
                                <span></span>
                            </div>
                        )} */}
                    </div>

                    <div aria-label="multilanguage-selection" className="header-multilanguage">
                        <Form id="selectLangFormPhone">
                            <Form.Select aria-label="Select language" value={selectedLanguage} name="selectLang" onChange={onChangeLang}>
                                {LANGUAGES.map(({ code, label }) => (
                                    <option key={code} value={code}>
                                        {label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form>
                    </div>
                </div>)}
        </header>
    )
}