import { useNavigate } from 'react-router-dom';
import '../css/style.css';
import '../css/other.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="dashboard-container">
            <div className="not-found">
                <div className="not-found-code" aria-hidden="true">404</div>
                <span className="material-icons not-found-icon" aria-hidden="true">explore_off</span>
                <h1>Page not found</h1>
                <p>The page you're looking for doesn't exist or has been moved.</p>
                <div className="not-found-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate('/dashboard')}
                    >
                        <span className="material-icons" aria-hidden="true">dashboard</span>
                        Go to Dashboard
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => navigate(-1)}
                    >
                        <span className="material-icons" aria-hidden="true">arrow_back</span>
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
