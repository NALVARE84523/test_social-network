import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithEmail, signInWithGoogle } from '../services/auth';
import Button from '../components/Button';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await loginWithEmail(email, password);
            navigate('/');
        } catch (error) {
            console.error("Login error", error);
            alert('Failed to log in. Please check your credentials and try again.');
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (error) {
            console.error("Google sign-in error", error);
            alert('Failed to log in with Google.');
        }
    };

    return (
        <div>
            <h1>Login</h1>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <Button onClick={handleLogin}>Login</Button>
            <Button onClick={handleGoogleLogin}>Login with Google</Button>
            <p>
                Don't have an account? <a href="/signup">Sign up here</a>
            </p>
        </div>
    );
};

export default Login;