import { Skeleton } from './Loading';
import '../css/overview.css';

/**
 * StatCard - A reusable component for displaying statistics
 * @param {string} icon - Material Icons name
 * @param {string} title - Title of the stat card
 * @param {string|number|ReactNode} value - The main value to display
 * @param {string|ReactNode} info - Optional additional information
 * @param {boolean} loading - Show placeholders for value and info
 */
export default function StatCard({ icon, title, value, info, loading = false }) {
    return (
        <div className="stat-card">
            <div className="stat-header">
                <span className="material-icons stat-icon">{icon}</span>
                <span className="stat-title">{title}</span>
            </div>
            {loading ? (
                <div aria-busy="true">
                    <Skeleton width="60%" height="1.6rem" radius="8px" />
                    <Skeleton width="80%" height="0.75rem" style={{ marginTop: '0.7rem' }} />
                </div>
            ) : (
                <>
                    <div className="stat-value">{value}</div>
                    {info && <div className="stat-info">{info}</div>}
                </>
            )}
        </div>
    );
}

