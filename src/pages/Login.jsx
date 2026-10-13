import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../css/style.css';
import '../css/login.css';

const features = [
    { icon: 'science', label: 'Research projects' },
    { icon: 'event', label: 'Group meetings' },
    { icon: 'school', label: 'Courses & guides' },
];

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
        <main id="loginSection" className="section-login">
            <div className="login-backdrop" aria-hidden="true">
                <span className="login-orb login-orb-1"></span>
                <span className="login-orb login-orb-2"></span>
                <span className="login-orb login-orb-3"></span>
                <span className="login-grid"></span>
            </div>

            <div className="login-container">
                <div className="login-mark" aria-hidden="true">
                    <span className="material-icons">hub</span>
                </div>
                <div className="login-header">
                    <span className="login-eyebrow">ITCPR Research Workspace</span>
                    <h1>Welcome to the <span className="login-gradient-text">ITCPR Portal</span></h1>
                    <p>Sign in with your institutional account to continue.</p>
                </div>

                <button
                    id="loginButton"
                    type="button"
                    className="btn-apply"
                    onClick={signInWithSSO}
                    disabled={buttonDisabled || loading}
                >
                    <i className="fa-solid fa-key" aria-hidden="true"></i>
                    <span>Sign in with SSO</span>
                    <span className="material-icons btn-apply-arrow" aria-hidden="true">arrow_forward</span>
                </button>

                <ul className="login-features">
                    {features.map((f, i) => (
                        <li key={f.label} style={{ '--i': i }}>
                            <span className="material-icons" aria-hidden="true">{f.icon}</span>
                            {f.label}
                        </li>
                    ))}
                </ul>

                <small>
                    By signing in, you agree to our{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                </small>
            </div>
        </main>
    );
}
