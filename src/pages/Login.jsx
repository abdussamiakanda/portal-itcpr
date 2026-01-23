import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../css/style.css';
import '../css/login.css';

export default function Login() {
    const { signInWithSSO, loading } = useAuth();
    const [buttonDisabled, setButtonDisabled] = useState(true);

    useEffect(() => {
        // Enable button after a short delay (matching original behavior)
        const timer = setTimeout(() => {
            setButtonDisabled(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section id="loginSection" className="section-login">
            <div className="login-container">
                <div className="login-header">
                    <h1>ITCPR Portal</h1>
                    <p>Sign in with your institutional account</p>
                </div>
                <button 
                    id="loginButton" 
                    className="btn-apply" 
                    onClick={signInWithSSO}
                    disabled={buttonDisabled || loading}
                >
                    <i className="fa-solid fa-key"></i>
                    Sign in with SSO
                </button>
                <br />
                <small style={{ textAlign: 'center', color: '#7f8c8d' }}>
                    By signing in, you agree to our{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                </small>
            </div>
        </section>
    );
}


