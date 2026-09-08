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
import WeatherBadge from './WeatherBadge';

interface HeaderProps {
    colorScheme: string,
    onToggleTheme?: () => void;
    onOpenBookingModal: () => void;
    onOpenUserModal: () => void;
    currentUserRole: Role,
    userHasBookings: boolean
}

export const Header = ({ colorScheme, onToggleTheme, onOpenBookingModal, onOpenUserModal, currentUserRole, userHasBookings }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);
    const [cookies] = useCookies(['token']);

    const { i18n, t } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)

    useEffect(() => {
        const handleProfilePicChange = () => {
            if (cookies.token) {
                serverAPI.post('/getUserImgByToken', { token: cookies.token }).then(res => {
                    let picURL = '';
                    if (res && res.data && res.data.fileURL && res.data.fileURL.url) {
                        const rawUrl = res.data.fileURL.url;
                        picURL = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
                            ? rawUrl
                            : API_URL_BASE + "/" + rawUrl;
                    }
                    setUserPhotoURL(picURL);
                }).catch((err: any) => console.log(err));
            }
        };

        EventEmitter.subscribe(Events.CHANGE_PROFILE_PIC, handleProfilePicChange);
        return () => {
            EventEmitter.unsubscribe(Events.CHANGE_PROFILE_PIC);
        };
    }, [cookies.token]);

    const onChangeLang = (code: string) => {
        const lang_code = code.toLowerCase();
        i18n.changeLanguage(lang_code);
        setSelectedLanguage(lang_code);
    };

    useEffect(() => {
        // Set the default language to the resolved language (short 2-letter code)
        const currentLang = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0].toLowerCase();
        setSelectedLanguage(currentLang);

        const handleLanguageChanged = (lng: string) => {
            const cleanLang = (lng || 'es').split('-')[0].toLowerCase();
            setSelectedLanguage(cleanLang);
        };

        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n.resolvedLanguage, i18n.language]);

    useEffect(() => {
        if (cookies.token) {
            serverAPI.post('/getUserImgByToken', { token: cookies.token }).then((res: any) => {
                if (res && res.data && res.data.status != "error") {
                    let picURL = '';
                    if (res && res.data && res.data.fileURL && res.data.fileURL.url) {
                        const rawUrl = res.data.fileURL.url;
                        picURL = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
                            ? rawUrl
                            : API_URL_BASE + "/" + rawUrl;
                    }
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
                {colorScheme === 'dark' ? (
                    <img src="/logo-dark-mode.svg" alt="logo dark mode" aria-description="logo" width="300" height="40" />
                ) : (
                    <img src="/logo.svg" alt="logo light mode" aria-description="logo" width="300" height="40" />
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
                <NavLink to="/cupones" className={({ isActive }) => {
                    let classNames = '';

                    if (isActive) {
                        classNames += 'is-active';
                    }

                    if (colorScheme !== 'dark') {
                        classNames += classNames ? '-light' : '-light';
                    }

                    return classNames;
                }}>{t("coupons")}</NavLink>
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
                    }}>{t("bookings")}</NavLink>
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
                    }}><strong>{t("admin")}</strong></NavLink>
                )}
                <div id="nav-actions">
                    {onToggleTheme && (
                        <button
                            type="button"
                            className="theme-toggle-btn"
                            onClick={onToggleTheme}
                            aria-label={colorScheme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                            title={colorScheme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                        >
                            {colorScheme === 'dark' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5" fill="#fbbf24" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#0f172a" />
                                </svg>
                            )}
                        </button>
                    )}
                    <WeatherBadge colorScheme={colorScheme} />
                    <Button variant="primary" id="bookBtn" onClick={onOpenBookingModal}>{t("book")}</Button>
                    <div className="user-icon">
                        <button
                            type="button"
                            className="header-user-btn"
                            onClick={onOpenUserModal}
                            aria-label={cookies.token ? "Abrir perfil de usuario" : "Iniciar sesión o registrarse"}
                            title={cookies.token ? "Mi perfil" : "Acceso de usuario"}
                        >
                            {userPhotoURL && cookies.token ? (
                                <img id="user-icon" src={userPhotoURL} alt="Foto de perfil" />
                            ) : (
                                colorScheme === 'dark' ? (
                                    <img id="user-icon" src='/user-icon-white.webp' alt="Acceso usuario" />
                                ) : (
                                    <img id="user-icon" src='/user-icon.svg' alt="Acceso usuario" />
                                )
                            )}
                        </button>
                    </div>


                    <div aria-label="multilanguage-selection" className="header-multilanguage">
                        <Form id="selectLangForm">
                            <Form.Select aria-label="Select language" value={selectedLanguage} name="selectLang" onChange={(event) => { onChangeLang(event.target.value) }}>
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
            <div className="header-mobile-right">
                {onToggleTheme && (
                    <button
                        type="button"
                        className="theme-toggle-btn"
                        onClick={onToggleTheme}
                        aria-label={colorScheme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                        title={colorScheme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                        {colorScheme === 'dark' ? (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" fill="#fbbf24" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#0f172a" />
                            </svg>
                        )}
                    </button>
                )}
                <WeatherBadge colorScheme={colorScheme} />
                <button aria-label="toggle navigation menu" className="menu-toggle" onClick={handleToggleMenu}>
                    <FontAwesomeIcon icon={faBars} />
                </button>
            </div>
            {isMenuOpen && (
                <div id="nav-menu">
                    <NavLink to="/" className={({ isActive }) => {
                        let classNames = '';

                        if (isActive) {
                            classNames += 'is-active';
                        }

                        if (colorScheme !== 'dark') {
                            classNames += classNames ? '-light' : '-light';
                        }

                        return classNames;
                    }} onClick={closeMenu}>{t("home")}</NavLink>
                    <NavLink to="/services" className={({ isActive }) => {
                        let classNames = '';

                        if (isActive) {
                            classNames += 'is-active';
                        }

                        if (colorScheme !== 'dark') {
                            classNames += classNames ? '-light' : '-light';
                        }

                        return classNames;
                    }} onClick={closeMenu}>{t("services")}</NavLink>
                    <NavLink to="/cupones" className={({ isActive }) => {
                        let classNames = '';

                        if (isActive) {
                            classNames += 'is-active';
                        }

                        if (colorScheme !== 'dark') {
                            classNames += classNames ? '-light' : '-light';
                        }

                        return classNames;
                    }} onClick={closeMenu}>{t("coupons")}</NavLink>
                    <NavLink to="/contact" className={({ isActive }) => {
                        let classNames = '';

                        if (isActive) {
                            classNames += 'is-active';
                        }

                        if (colorScheme !== 'dark') {
                            classNames += classNames ? '-light' : '-light';
                        }

                        return classNames;
                    }} onClick={closeMenu}>{t("contact")}</NavLink>
                    <button
                        type="button"
                        className="nav-menu-book-btn"
                        onClick={() => {
                            closeMenu();
                            onOpenBookingModal();
                        }}
                    >
                        {t("book")}
                    </button>
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
                        }}>{t("bookings")}</NavLink>
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
                        }}><strong>{t("admin")}</strong></NavLink>
                    )}
                    <div aria-label="user-icon-phone" className="user-icon-phone">
                        <button
                            type="button"
                            className="header-user-btn header-user-btn-mobile"
                            onClick={() => {
                                closeMenu();
                                onOpenUserModal();
                            }}
                            aria-label={cookies.token ? "Abrir perfil de usuario" : "Iniciar sesión o registrarse"}
                            title={cookies.token ? "Mi perfil" : "Acceso de usuario"}
                        >
                            {userPhotoURL && cookies.token ? (
                                <img id="user-icon" src={userPhotoURL} alt="Foto de perfil" />
                            ) : (
                                colorScheme === 'dark' ? (
                                    <img id="user-icon" src='/user-icon-white.webp' alt="Acceso usuario" />
                                ) : (
                                    <img id="user-icon" src='/user-icon.svg' alt="Acceso usuario" />
                                )
                            )}
                        </button>
                    </div>


                    <div aria-label="multilanguage-selection" className="header-multilanguage">
                        <Form id="selectLangFormPhone">
                            <Form.Select aria-label="Select language" value={selectedLanguage} name="selectLang" onChange={(event) => { onChangeLang(event.target.value) }}>
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