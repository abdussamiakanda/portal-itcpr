import { useEffect } from 'react';
import '../css/modal.css';

export default function Modal({ isOpen, onClose, children, size = 'default' }) {
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

    if (!isOpen) return null;

    const sizeClass = {
        'default': '',
        'full': { maxWidth: '90%' },
        'small': { maxWidth: '50%' }
    }[size] || {};

    return (
        <>
            <div className="modal-backdrop show" onClick={onClose || undefined}></div>
            <div 
                id="managementModal" 
                className="modal show" 
                style={sizeClass}
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
                <button className="btn-close" onClick={onClose}>
                    <span className="material-icons">close</span>
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

