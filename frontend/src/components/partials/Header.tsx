import { NavLink } from "react-router-dom"
import { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import Button from 'react-bootstrap/Button'

interface HeaderProps {
    colorScheme: string,
    onOpenBookingModal: () => void;
}

export const Header = ({ colorScheme, onOpenBookingModal }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                    return isActive ? 'is-active' : undefined
                }}>Home</NavLink>
                <NavLink to="/services" className={({ isActive }) => {
                    return isActive ? 'is-active' : undefined
                }}>Services</NavLink>
                <NavLink to="/contact" className={({ isActive }) => {
                    return isActive ? 'is-active' : undefined
                }}>Contact</NavLink>
                <div id="nav-actions">
                    <Button variant="primary" onClick={onOpenBookingModal}>Book</Button>
                    <img id="user-icon" src='/user-icon.svg' alt="user icon img" aria-description="icon user image" />
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
                </div>)}
        </header>
    )
}