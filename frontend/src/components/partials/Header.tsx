import { NavLink } from "react-router-dom"

export function Header() {
    return (
        <header id="header">
            <img src="/logo.svg" alt="logo" aria-aria-description="logo" className="logo" id="logo" />
            <nav id="nav">
                <NavLink to="/" style={({ isActive }) => (
                    isActive ? {
                        textDecoration: 'none',
                        color: 'red'
                    } : {}
                )}>Home</NavLink>
                <NavLink to="/services" style={({ isActive }) => (
                    isActive ? {
                        textDecoration: 'none',
                        color: 'red'
                    } : {}
                )}>Services</NavLink>
                <NavLink to="/contact" style={({ isActive }) => (
                    isActive ? {
                        textDecoration: 'none',
                        color: 'red'
                    } : {}
                )}>Contact</NavLink>
            </nav>
            <div id="nav-actions">
                <button>Book</button>
                <img id="user-icon" src='/user-icon.svg' alt="user icon img" aria-description="icon user image" />
            </div>
        </header>
    )
}