import { NavLink } from "react-router-dom"
import { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

export const Header = () => {
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
                <img src="/logo.svg" alt="logo" aria-description="logo" width={'300px'} height={'40px'} />
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
                    <button>Book</button>
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