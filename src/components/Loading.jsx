import { useEffect, useState } from 'react';
import { useTopProgressActive } from '../hooks/useLoading';
import '../css/loading.css';

/* --------------------------------------------------------------------------
   Primitives
   -------------------------------------------------------------------------- */
export function Skeleton({ width, height, radius, className = '', style }) {
    return (
        <span
            className={`skeleton ${className}`}
            style={{ width, height, borderRadius: radius, ...style }}
            aria-hidden="true"
        />
    );
}

function SkeletonText({ lines = 3, lastWidth = '60%' }) {
    return (
        <div className="skeleton-text">
            {Array.from({ length: lines }, (_, i) => (
                <Skeleton key={i} height="0.75rem" width={i === lines - 1 ? lastWidth : '100%'} />
            ))}
        </div>
    );
}

/* --------------------------------------------------------------------------
   Building blocks
   -------------------------------------------------------------------------- */
function HeaderSkeleton({ title, subtitle = true, action = false }) {
    return (
        <div className="page-header skeleton-header">
            <div>
                {title ? <h2>{title}</h2> : <Skeleton width="min(320px, 70vw)" height="1.9rem" radius="10px" />}
                {subtitle && <Skeleton width="min(260px, 55vw)" height="0.85rem" style={{ marginTop: '0.6rem' }} />}
            </div>
            {action && <Skeleton width="132px" height="38px" radius="10px" />}
        </div>
    );
}

function StatCardSkeleton() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-row">
                <Skeleton width="40px" height="40px" radius="12px" />
                <Skeleton width="45%" height="0.75rem" />
            </div>
            <Skeleton width="65%" height="1.5rem" radius="8px" style={{ marginTop: '1.1rem' }} />
            <Skeleton width="80%" height="0.75rem" style={{ marginTop: '0.7rem' }} />
        </div>
    );
}

function CardSkeleton({ avatar = false }) {
    return (
        <div className="skeleton-card">
            {avatar ? (
                <div className="skeleton-row">
                    <Skeleton width="52px" height="52px" radius="50%" />
                    <div className="skeleton-stack">
                        <Skeleton width="70%" height="0.95rem" />
                        <Skeleton width="45%" height="0.75rem" />
                    </div>
                </div>
            ) : (
                <>
                    <Skeleton width="75%" height="1.1rem" radius="8px" />
                    <div className="skeleton-row" style={{ marginTop: '0.85rem' }}>
                        <Skeleton width="64px" height="22px" radius="999px" />
                        <Skeleton width="72px" height="22px" radius="999px" />
                    </div>
                </>
            )}
            <div style={{ marginTop: '1.1rem' }}>
                <SkeletonText lines={3} />
            </div>
            <div className="skeleton-row skeleton-card-footer">
                <Skeleton width="40%" height="0.75rem" />
                <Skeleton width="104px" height="34px" radius="10px" />
            </div>
        </div>
    );
}

function ListRowSkeleton() {
    return (
        <div className="skeleton-card skeleton-row skeleton-list-row">
            <Skeleton width="48px" height="48px" radius="14px" />
            <div className="skeleton-stack" style={{ flex: 1 }}>
                <Skeleton width="min(340px, 60%)" height="0.95rem" />
                <Skeleton width="min(220px, 40%)" height="0.75rem" />
            </div>
            <Skeleton width="96px" height="34px" radius="10px" className="skeleton-hide-sm" />
        </div>
    );
}

function Repeat({ count, children }) {
    return Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-item" style={{ '--i': i }}>{children}</div>
    ));
}

/* --------------------------------------------------------------------------
   Page skeletons
   -------------------------------------------------------------------------- */
const variants = {
    dashboard: ({ title }) => (
        <>
            <HeaderSkeleton title={title} />
            <div className="skeleton-grid skeleton-grid-stats">
                <Repeat count={4}><StatCardSkeleton /></Repeat>
            </div>
            <div className="skeleton-panel">
                <Skeleton width="180px" height="1.1rem" radius="8px" />
                <div className="skeleton-grid skeleton-grid-2">
                    <Repeat count={2}><ListRowSkeleton /></Repeat>
                </div>
            </div>
            <div className="skeleton-panel">
                <Skeleton width="160px" height="1.1rem" radius="8px" />
                <div className="skeleton-grid skeleton-grid-cards">
                    <Repeat count={3}><CardSkeleton /></Repeat>
                </div>
            </div>
        </>
    ),
    grid: ({ title, action }) => (
        <>
            <HeaderSkeleton title={title} action={action} />
            <div className="skeleton-toolbar">
                <Skeleton height="42px" radius="10px" style={{ flex: 1 }} />
                <Skeleton width="240px" height="42px" radius="12px" className="skeleton-hide-sm" />
            </div>
            <div className="skeleton-grid skeleton-grid-cards">
                <Repeat count={6}><CardSkeleton /></Repeat>
            </div>
        </>
    ),
    people: ({ title }) => (
        <>
            <HeaderSkeleton title={title} />
            <div className="skeleton-toolbar">
                <Skeleton height="42px" radius="10px" style={{ flex: 1 }} />
            </div>
            <div className="skeleton-grid skeleton-grid-cards">
                <Repeat count={6}><CardSkeleton avatar /></Repeat>
            </div>
        </>
    ),
    list: ({ title, action }) => (
        <>
            <HeaderSkeleton title={title} action={action} />
            <div className="skeleton-stack skeleton-stack-lg">
                <Repeat count={5}><ListRowSkeleton /></Repeat>
            </div>
        </>
    ),
    detail: ({ title }) => (
        <>
            <div className="skeleton-panel skeleton-hero">
                {title ? <h2>{title}</h2> : <Skeleton width="min(480px, 80%)" height="1.9rem" radius="10px" />}
                <div className="skeleton-row" style={{ marginTop: '1rem' }}>
                    <Skeleton width="72px" height="24px" radius="999px" />
                    <Skeleton width="88px" height="24px" radius="999px" />
                    <Skeleton width="64px" height="24px" radius="999px" />
                </div>
                <div style={{ marginTop: '1.25rem', maxWidth: 720 }}>
                    <SkeletonText lines={3} lastWidth="40%" />
                </div>
            </div>
            <div className="skeleton-tabs">
                <Repeat count={5}><Skeleton width="96px" height="18px" /></Repeat>
            </div>
            <div className="skeleton-grid skeleton-grid-cards">
                <Repeat count={3}><CardSkeleton /></Repeat>
            </div>
        </>
    ),
    article: () => (
        <div className="skeleton-article">
            <Skeleton width="120px" height="0.8rem" />
            <Skeleton width="85%" height="2.2rem" radius="10px" style={{ marginTop: '1rem' }} />
            <div className="skeleton-row" style={{ marginTop: '1.1rem' }}>
                <Skeleton width="32px" height="32px" radius="50%" />
                <Skeleton width="180px" height="0.8rem" />
            </div>
            <div className="skeleton-panel" style={{ marginTop: '2rem' }}>
                <SkeletonText lines={4} />
                <Skeleton height="180px" radius="14px" style={{ margin: '1.5rem 0' }} />
                <SkeletonText lines={5} lastWidth="35%" />
            </div>
        </div>
    ),
    profile: ({ title }) => (
        <>
            <HeaderSkeleton title={title} />
            <div className="skeleton-panel skeleton-profile">
                <Skeleton width="112px" height="112px" radius="50%" />
                <div className="skeleton-stack" style={{ flex: 1, minWidth: 220 }}>
                    <Skeleton width="min(260px, 70%)" height="1.4rem" radius="8px" />
                    <Skeleton width="min(200px, 55%)" height="0.8rem" />
                    <Skeleton width="min(160px, 45%)" height="0.8rem" />
                </div>
            </div>
            <div className="skeleton-grid skeleton-grid-2">
                <Repeat count={4}>
                    <div className="skeleton-card">
                        <Skeleton width="35%" height="0.7rem" />
                        <Skeleton width="70%" height="1rem" style={{ marginTop: '0.6rem' }} />
                    </div>
                </Repeat>
            </div>
        </>
    ),
    calendar: ({ title }) => (
        <>
            <HeaderSkeleton title={title} action />
            <div className="skeleton-panel">
                <div className="skeleton-row" style={{ justifyContent: 'space-between' }}>
                    <Skeleton width="180px" height="1.3rem" radius="8px" />
                    <Skeleton width="96px" height="34px" radius="10px" />
                </div>
                <div className="skeleton-calendar">
                    {Array.from({ length: 35 }, (_, i) => (
                        <Skeleton key={i} height="clamp(48px, 9vw, 92px)" radius="10px" />
                    ))}
                </div>
            </div>
        </>
    ),
};

/**
 * Content-shaped placeholder shown inside the layout while a page loads for
 * the first time. Navbar and sidebar stay interactive.
 */
export function PageSkeleton({ variant = 'grid', title, action = false, label = 'Loading content' }) {
    const Variant = variants[variant] || variants.grid;
    return (
        <div className="dashboard-container page-skeleton" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">{label}…</span>
            <Variant title={title} action={action} />
        </div>
    );
}

/* --------------------------------------------------------------------------
   App boot splash — shown once while the auth session is resolved
   -------------------------------------------------------------------------- */
export function AppSplash() {
    // Avoid a flash for fast (cached) sessions: only reveal after a short beat
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 150);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className={`app-splash ${visible ? 'is-visible' : ''}`} role="status" aria-live="polite">
            <div className="app-splash-mark" aria-hidden="true">
                <span className="material-icons">hub</span>
            </div>
            <div className="app-splash-name">ITCPR <span>Portal</span></div>
            <div className="app-splash-bar" aria-hidden="true"><span /></div>
            <span className="sr-only">Loading ITCPR Portal…</span>
        </div>
    );
}

/* --------------------------------------------------------------------------
   Inline status for single-purpose flows (e.g. OAuth callbacks)
   -------------------------------------------------------------------------- */
export function InlineStatus({ icon = 'sync', title, message }) {
    return (
        <div className="dashboard-container">
            <div className="inline-status" role="status" aria-live="polite">
                <div className="inline-status-icon" aria-hidden="true">
                    <span className="material-icons">{icon}</span>
                    <span className="inline-status-ring" />
                </div>
                {title && <h2>{title}</h2>}
                {message && <p>{message}</p>}
            </div>
        </div>
    );
}

/* --------------------------------------------------------------------------
   Top progress bar — background refreshes after an action
   -------------------------------------------------------------------------- */
export function TopProgress() {
    const active = useTopProgressActive();
    // Keep the bar mounted briefly after finishing so it can complete & fade
    const [phase, setPhase] = useState('idle');

    useEffect(() => {
        if (active) {
            setPhase('running');
            return;
        }
        setPhase((prev) => (prev === 'running' ? 'done' : prev));
        const t = setTimeout(() => setPhase('idle'), 450);
        return () => clearTimeout(t);
    }, [active]);

    if (phase === 'idle') return null;
    return (
        <div className={`top-progress is-${phase}`} role="progressbar" aria-label="Updating" aria-busy={phase === 'running'}>
            <span />
        </div>
    );
}
