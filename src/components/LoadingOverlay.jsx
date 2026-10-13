import '../css/style.css';
import '../css/layout.css';

export default function LoadingOverlay({ show }) {
    if (!show) return null;
    
    return (
        <div id="loadingOverlay" className="loading-overlay" role="status" aria-live="polite">
            <div className="loader" aria-hidden="true"></div>
            <span className="loader-text">Loading…</span>
        </div>
    );
}


