import { useEffect } from 'react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from './Modal';
import '../css/modal.css';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) {
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

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader onClose={onClose}>
                <h3>{title || 'Confirm Action'}</h3>
            </ModalHeader>
            <ModalBody>
                <p>{message || 'Are you sure you want to proceed?'}</p>
            </ModalBody>
            <ModalFooter>
                <button className="btn btn-outline" onClick={onClose}>
                    {cancelText}
                </button>
                <button 
                    className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                    onClick={handleConfirm}
                >
                    {confirmText}
                </button>
            </ModalFooter>
        </Modal>
    );
}


