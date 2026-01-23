import '../css/style.css';
import '../css/layout.css';

export default function LoadingOverlay({ show }) {
    if (!show) return null;
    
    return (
        <div id="loadingOverlay" className="loading-overlay">
            <div className="loader"></div>
        </div>
    );
}


