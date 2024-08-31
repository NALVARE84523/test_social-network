import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { logout } from '../services/auth';
import Button from './Button';

const Header = () => {
    const user = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout error", error);
            alert('Failed to log out.');
        }
    };

    return (
        <header>
            <nav>
                <Link to="/">Home</Link>
                {user ? (
                    <>
                        <span>Welcome, {user.email}</span>
                        <Button onClick={handleLogout}>Logout</Button>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/signup">Sign Up</Link>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;