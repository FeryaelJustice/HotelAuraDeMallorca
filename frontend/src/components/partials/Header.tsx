import { NavLink } from "react-router-dom"
import { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCheck } from "@fortawesome/free-solid-svg-icons";
import Button from 'react-bootstrap/Button';
import { useCookies } from 'react-cookie';

interface HeaderProps {
    colorScheme: string,
    onOpenBookingModal: () => void;
    onOpenUserModal: () => void;
}

export const Header = ({ colorScheme, onOpenBookingModal, onOpenUserModal }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cookies] = useCookies(['token']);

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
                }}>Home</NavLink>
                <NavLink to="/services" className={({ isActive }) => {
                    let classNames = '';

                    if (isActive) {
                        classNames += 'is-active';
                    }

                    if (colorScheme !== 'dark') {
                        classNames += classNames ? '-light' : '-light';
                    }

                    return classNames;
                }}>Services</NavLink>
                <NavLink to="/contact" className={({ isActive }) => {
                    let classNames = '';

                    if (isActive) {
                        classNames += 'is-active';
                    }

                    if (colorScheme !== 'dark') {
                        classNames += classNames ? '-light' : '-light';
                    }

                    return classNames;
                }}>Contact</NavLink>
                <div id="nav-actions">
                    <Button variant="primary" id="bookBtn" onClick={onOpenBookingModal}>Book</Button>
                    <div className="user-icon">
                        {colorScheme === 'dark' ? (
                            <img id="user-icon" src='/user-icon.svg' alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                        ) : (
                            <img id="user-icon" src='/user-icon-white.webp' alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                        )}
                        {cookies.token ? (
                            <div className={`logged-icon${colorScheme === 'dark' ? '' : '-light'}`}>
                                <FontAwesomeIcon icon={faCheck} />
                                <span>Logged</span>
                            </div>
                        ) : (
                            <div className="logged-icon">
                                <span></span>
                            </div>
                        )}
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
                    }} onClick={closeMenu}>Home</NavLink>
                    <NavLink to="/services" className={({ isActive }) => {
                        return isActive ? 'is-active' : undefined
                    }} onClick={closeMenu}>Services</NavLink>
                    <NavLink to="/contact" className={({ isActive }) => {
                        return isActive ? 'is-active' : undefined
                    }} onClick={closeMenu}>Contact</NavLink>
                    <a className="user-icon-phone">
                        <img id="user-icon" src='/user-icon.svg' alt="user icon img" aria-description="icon user image" onClick={onOpenUserModal} />
                        {cookies.token ? (
                            <div className="logged-icon">
                                <FontAwesomeIcon icon={faCheck} />
                                <span>Logged</span>
                            </div>
                        ) : (

                            <div className="logged-icon">
                                <span></span>
                            </div>
                        )}
                    </a>
                </div>)}
        </header>
    )
}