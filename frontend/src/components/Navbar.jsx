import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth()
    const location = useLocation()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

    const handleLogout = () => {
        logout()
        setIsUserMenuOpen(false)
    }

    const isActiveRoute = (path) => {
        return location.pathname === path
    }

    return (
        <nav className="main-nav">
            <div className="nav-container">
                <div className="nav-brand">
                    <Link to="/" className="brand-link">
                        <span className="cookbook-icon">📚</span>
                        <span className="brand-text">The Ableton Cookbook</span>
                    </Link>
                </div>

                <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
                    <Link
                        to="/"
                        className={`nav-link ${isActiveRoute('/') ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Home
                    </Link>
                    <Link
                        to="/search"
                        className={`nav-link ${isActiveRoute('/search') ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Browse Recipes
                    </Link>
                    <Link
                        to="/upload"
                        className={`nav-link ${isActiveRoute('/upload') ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Upload
                    </Link>

                    <div className="nav-user">
                        {isAuthenticated() ? (
                            <div className="nav-dropdown">
                                <button
                                    className="dropdown-toggle"
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                >
                                    <span className="user-icon">👨‍🍳</span>
                                    <span>{user?.username || 'User'}</span>
                                </button>
                                <div className={`dropdown-menu ${isUserMenuOpen ? 'show' : ''}`}>
                                    <Link
                                        to="/profile"
                                        className="dropdown-item"
                                        onClick={() => {
                                            setIsUserMenuOpen(false)
                                            setIsMenuOpen(false)
                                        }}
                                    >
                                        My Kitchen
                                    </Link>
                                    <Link
                                        to="/upload"
                                        className="dropdown-item"
                                        onClick={() => {
                                            setIsUserMenuOpen(false)
                                            setIsMenuOpen(false)
                                        }}
                                    >
                                        Upload Recipe
                                    </Link>
                                    <div className="dropdown-divider"></div>
                                    <button
                                        className="dropdown-item logout-btn"
                                        onClick={handleLogout}
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="nav-link"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="nav-link nav-register"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Join the Kitchen
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                <button
                    className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>
    )
}

export default Navbar
