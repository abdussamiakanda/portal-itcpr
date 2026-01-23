import '../css/overview.css';

/**
 * StatCard - A reusable component for displaying statistics
 * @param {string} icon - Material Icons name
 * @param {string} title - Title of the stat card
 * @param {string|number|ReactNode} value - The main value to display
 * @param {string|ReactNode} info - Optional additional information
 */
export default function StatCard({ icon, title, value, info }) {
    return (
        <div className="stat-card">
            <div className="stat-header">
                <span className="material-icons stat-icon">{icon}</span>
                <span className="stat-title">{title}</span>
            </div>
            <div className="stat-value">{value}</div>
            {info && <div className="stat-info">{info}</div>}
        </div>
    );
}

