import { NavLink } from "react-router-dom"
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCheck } from "@fortawesome/free-solid-svg-icons";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useCookies } from 'react-cookie';
import serverAPI from './../../services/serverAPI';
// Multilanguage
import { LANGUAGES } from "../../constants";
import { useTranslation } from "react-i18next";

interface HeaderProps {
    colorScheme: string,
    onOpenBookingModal: () => void;
    onOpenUserModal: () => void;
}

export const Header = ({ colorScheme, onOpenBookingModal, onOpenUserModal }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);
    const [cookies] = useCookies(['token']);
    const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';

    const { i18n, t } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)

    const onChangeLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang_code = e.target.value;
        i18n.changeLanguage(lang_code);
        setSelectedLanguage(lang_code);
    };

    useEffect(() => {
        if (cookies.token) {
            serverAPI.post('/api/userLogoByToken', { token: cookies.token }).then((response: any) => {
                if (response && response.data && response.data.status != "error") {
                    let picURL = API_URL + "/" + response.data.photoURL;
                    setUserPhotoURL(picURL)
                }
            }).catch((err: any) => console.error(err))
        }
    }, [cookies])

    useEffect(() => {
        // Set the default language to the one detected by i18next
        setSelectedLanguage(i18n.language);
        // Timer
        let timerProfilePic = setInterval(() => {
            if (cookies.token) {
                // retrieve profile pic and put each 20 seconds
                serverAPI.post('/api/getUserImgByToken', { token: cookies.token }).then(res => {
                    setUserPhotoURL(process.env.API_URL + "/" + res.data.fileURL.url);
                })
            }
        }, 20000)
        return () => {
            clearInterval(timerProfilePic)
        }
    }, [])

    // imagenes responsive: style="width:100%; aspect-ratio: (aspect ratio que se ve en network, abrir imagen y en preview abajo, en formato por ejemplo 16/9);"
    const handleToggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };
    return (
        <header id="header" className="header">
            <NavLink id="logo" className="logo" to="/">
                {colorScheme == 'dark' ? (
                    <img src="/logo.svg" alt="logo" aria-description="logo" width={'300px'} height={'40px'} />
                ) : (
                    <img src="/logo-white.webp" alt="logo" aria-description="logo" width={'300px'} height={'40px'} />
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

                    <div className="header-multilanguage">
                        <Form id="selectLangForm">
                            <Form.Select aria-label="Select language" value={selectedLanguage} onChange={onChangeLang}>
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
            <button className="menu-toggle" >
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
                    <a className="user-icon-phone">
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
                    </a>

                    <div className="header-multilanguage">
                        <Form id="selectLangFormPhone">
                            <Form.Select aria-label="Select language" value={selectedLanguage} onChange={onChangeLang}>
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