import { useEffect } from 'react';
import '../css/modal.css';

export default function Modal({ isOpen, onClose, children, size = 'default', className = '' }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close on Escape when the modal is dismissible
    useEffect(() => {
        if (!isOpen || !onClose) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClass = {
        'default': '',
        'full': { maxWidth: '90%' },
        'small': { maxWidth: '50%' }
    }[size] || {};

    const modalClass = ['modal', 'show', className].filter(Boolean).join(' ');

    return (
        <>
            <div className="modal-backdrop show" onClick={onClose || undefined}></div>
            <div 
                id="managementModal" 
                className={modalClass}
                style={sizeClass}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </>
    );
}

export function ModalHeader({ children, onClose }) {
    return (
        <div className="modal-header">
            {children}
            {onClose && (
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close dialog">
                    <span className="material-icons" aria-hidden="true">close</span>
                </button>
            )}
        </div>
    );
}

export function ModalBody({ children }) {
    return <div className="modal-body">{children}</div>;
}

export function ModalFooter({ children }) {
    return <div className="modal-footer">{children}</div>;
}

