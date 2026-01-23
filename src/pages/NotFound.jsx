import { useNavigate } from 'react-router-dom';
import '../css/style.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="dashboard-container">
            <div className="error-message" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <span className="material-icons" style={{ fontSize: '4rem', color: 'var(--text-light)', marginBottom: 'var(--spacing-lg)' }}>error_outline</span>
                <h1 style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 'var(--spacing-md)' }}>404</h1>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-medium)', marginBottom: 'var(--spacing-md)' }}>Page Not Found</h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-medium)', marginBottom: 'var(--spacing-xl)', maxWidth: '500px', margin: '0 auto var(--spacing-xl)' }}>
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/dashboard')}
                    >
                        <span className="material-icons">dashboard</span>
                        Go to Dashboard
                    </button>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => navigate(-1)}
                    >
                        <span className="material-icons">arrow_back</span>
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}

