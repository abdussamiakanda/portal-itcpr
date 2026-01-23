import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { capitalize } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import { useToast } from '../components/Toast';
import '../css/profile.css';
import '../css/modal.css';

export default function Profile() {
    const { user, userData } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [uploading, setUploading] = useState(false);
    const [showGoogleScholarModal, setShowGoogleScholarModal] = useState(false);
    const [googleScholarUrl, setGoogleScholarUrl] = useState('');
    const [updatingGoogleScholar, setUpdatingGoogleScholar] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function loadProfile() {
            setLoading(true);
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setProfileData(data);
                    setGoogleScholarUrl(data.googleScholar || '');
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [user]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("New password and confirm password do not match.");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            toast.error("New password must be at least 6 characters long.");
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(
                auth.currentUser.email, 
                passwordForm.currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, passwordForm.newPassword);
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password changed successfully!');
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error("Failed to change password. Please check your current password and try again.");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 500 * 1024) {
            toast.error('File size must be less than 500KB');
            return;
        }

        setUploading(true);
        try {
            // Convert to data URL
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        photoURL: reader.result
                    });
                    setProfileData({ ...profileData, photoURL: reader.result });
                    toast.success('Profile picture updated successfully!');
                } catch (error) {
                    console.error('Error updating profile picture:', error);
                    toast.error('Failed to update profile picture.');
                } finally {
                    setUploading(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Failed to upload profile picture.');
            setUploading(false);
        }
    };

    const handleGoogleScholarUpdate = async (e) => {
        e.preventDefault();
        setUpdatingGoogleScholar(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                googleScholar: googleScholarUrl.trim() || null
            });
            setProfileData({ ...profileData, googleScholar: googleScholarUrl.trim() || null });
            setShowGoogleScholarModal(false);
            toast.success('Google Scholar profile updated successfully!');
        } catch (error) {
            console.error('Error updating Google Scholar:', error);
            toast.error('Failed to update Google Scholar profile.');
        } finally {
            setUpdatingGoogleScholar(false);
        }
    };

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    if (!profileData) {
        return <div>Profile not found</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Profile Information</h2>
                    <p className="text-medium">Review your profile information</p>
                </div>
            </div>

            <div className="profile-content">
                <div className="profile-section">
                    <h3>Personal Information</h3>
                    <div className="profile-info">
                        <div className="profile-avatar-container">
                            <div className="profile-avatar">
                                {profileData.photoURL ? (
                                    <img src={profileData.photoURL} alt={profileData.name} />
                                ) : (
                                    profileData.name?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="profile-avatar-upload">
                                <label htmlFor="profile-picture-upload" className="upload-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7,10 12,15 17,10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    Upload Photo
                                </label>
                                <input 
                                    type="file" 
                                    id="profile-picture-upload" 
                                    accept="image/*" 
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                <p className="upload-hint">Max size: 500KB</p>
                            </div>
                        </div>
                        <div className="profile-details">
                            <div className="detail-item">
                                <span className="label">Name</span>
                                <span className="value">{profileData.name}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Email</span>
                                <span className="value">{profileData.email}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Password</span>
                                <span className="password-button" onClick={() => setShowPasswordModal(true)}>
                                    Change Password
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Role</span>
                                <span className="value">{capitalize(profileData.role) || capitalize(profileData.type)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Research Group</span>
                                <span className="value">{capitalize(profileData.group) || 'None'}</span>
                            </div>
                            {profileData.contact && (
                                <div className="detail-item">
                                    <span className="label">Contact Number</span>
                                    <span className="value">{profileData.contact}</span>
                                </div>
                            )}
                            {profileData.address && (
                                <div className="detail-item">
                                    <span className="label">Address</span>
                                    <span className="value">{profileData.address}</span>
                                </div>
                            )}
                            {profileData.university && (
                                <div className="detail-item">
                                    <span className="label">University</span>
                                    <span className="value">{profileData.university}</span>
                                </div>
                            )}
                            {profileData.major && (
                                <div className="detail-item">
                                    <span className="label">Major</span>
                                    <span className="value">{profileData.major}</span>
                                </div>
                            )}
                            {profileData.zerotierId && (
                                <div className="detail-item">
                                    <span className="label">ZeroTier ID</span>
                                    <span className="value">{profileData.zerotierId}</span>
                                </div>
                            )}
                            {profileData.ip && (
                                <div className="detail-item">
                                    <span className="label">
                                        IP Address{profileData.ip.split(';').length > 1 ? 'es' : ''}
                                    </span>
                                    <span className="value">
                                        {profileData.ip.split(';').map(ip => ip.trim()).join(', ')}
                                    </span>
                                </div>
                            )}
                            <div className="detail-item">
                                <span className="label">Google Scholar</span>
                                {profileData.googleScholar ? (
                                    <span className="value">
                                        <a 
                                            href={profileData.googleScholar} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}
                                        >
                                            {profileData.googleScholar}
                                        </a>
                                    </span>
                                ) : (
                                    <span className="value" style={{ color: '#999', fontStyle: 'italic' }}>Not set</span>
                                )}
                                <span 
                                    className="password-button" 
                                    onClick={() => {
                                        setGoogleScholarUrl(profileData.googleScholar || '');
                                        setShowGoogleScholarModal(true);
                                    }}
                                    style={{ marginLeft: '10px', cursor: 'pointer' }}
                                >
                                    {profileData.googleScholar ? 'Edit' : 'Add'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)}>
                <ModalHeader onClose={() => setShowPasswordModal(false)}>
                    <h3>Change Password</h3>
                </ModalHeader>
                <ModalBody>
                    <form id="passwordChangeForm" onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input 
                                type="password" 
                                id="currentPassword" 
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input 
                                type="password" 
                                id="newPassword" 
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input 
                                type="password" 
                                id="confirmPassword" 
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                required 
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-outline" onClick={() => setShowPasswordModal(false)}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => {
                        const form = document.getElementById('passwordChangeForm');
                        if (form) form.requestSubmit();
                    }}>
                        Change Password
                    </button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={showGoogleScholarModal} onClose={updatingGoogleScholar ? undefined : () => setShowGoogleScholarModal(false)}>
                <ModalHeader onClose={updatingGoogleScholar ? undefined : () => setShowGoogleScholarModal(false)}>
                    <h3>Edit Google Scholar Profile</h3>
                </ModalHeader>
                <ModalBody>
                    <form id="googleScholarForm" onSubmit={handleGoogleScholarUpdate}>
                        <div className="form-group">
                            <label htmlFor="googleScholarUrl">Google Scholar URL</label>
                            <input 
                                type="url" 
                                id="googleScholarUrl" 
                                value={googleScholarUrl}
                                onChange={(e) => setGoogleScholarUrl(e.target.value)}
                                placeholder="https://scholar.google.com/citations?user=..."
                                disabled={updatingGoogleScholar}
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => setShowGoogleScholarModal(false)}
                        disabled={updatingGoogleScholar}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-primary"
                        disabled={updatingGoogleScholar}
                        onClick={() => {
                            const form = document.getElementById('googleScholarForm');
                            if (form) form.requestSubmit();
                        }}
                    >
                        {updatingGoogleScholar ? 'Updating...' : 'Save'}
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

