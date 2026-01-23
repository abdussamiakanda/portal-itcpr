import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, getDocs, where } from 'firebase/firestore';
import { capitalize, formatContent, formatDate } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import '../css/guides.css';
import '../css/modal.css';

function getCategoryLabel(category) {
    const labels = {
        'platform': 'Platform Usage',
        'research': 'Research Guidelines',
        'tools': 'Tools & Software',
        'other': 'Other'
    };
    return labels[category] || capitalize(category);
}

export default function Guide() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const toast = useToast();
    const contentRef = useRef(null);
    
    const [loading, setLoading] = useState(true);
    const [guide, setGuide] = useState(null);
    const [error, setError] = useState(null);
    
    // Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [availableGroups, setAvailableGroups] = useState([]);
    
    // Form states
    const [guideFormData, setGuideFormData] = useState({
        title: '',
        content: '',
        category: 'platform',
        audience: 'all'
    });
    
    // Loading states
    const [loadingStates, setLoadingStates] = useState({
        updating: false,
        deleting: false,
        loadingGroups: false
    });

    const loadGuide = async () => {
        setLoading(true);
        setError(null);
        try {
            const guideRef = doc(db, 'guides', id);
            const guideSnap = await getDoc(guideRef);
            
            if (!guideSnap.exists()) {
                setError('Guide not found');
                return;
            }
            
            const guideData = {
                id: guideSnap.id,
                ...guideSnap.data()
            };
            
            // Check if user has access
            if (guideData.audience !== 'all' && 
                guideData.audience !== userData?.group && 
                userData?.type !== 'admin') {
                setError('You do not have access to this guide');
                return;
            }
            
            setGuide(guideData);
            
            // Set document title
            document.title = `${guideData.title} - Guide - ITCPR Portal`;
        } catch (error) {
            console.error('Error loading guide:', error);
            setError('Failed to load guide');
            toast.error('Failed to load guide');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGuide();
    }, [id, userData]);

    useEffect(() => {
        // Add target="_blank" to links after content is rendered
        if (contentRef.current && guide) {
            const links = contentRef.current.querySelectorAll('a');
            links.forEach(link => {
                link.setAttribute('target', '_blank');
                
                const href = link.getAttribute('href') || '';
                const encoded = encodeURIComponent(href);
                const codeExtensions = ['.py', '.m', '.mx3', '.m3', '.tex', '.jl', '.fortran', '.md', '.txt', '.r', '.go', '.rust',
                    '.js', '.java', '.cpp', '.c', '.csharp', '.html', '.css', '.json', '.xml', '.bash', '.shell', '.typescript', '.csv'];
                
                if (href.toLowerCase().endsWith('.ipynb')) {
                    link.setAttribute('href', `https://jupyter.itcpr.org/file?link=${encoded}`);
                } else if (codeExtensions.some(ext => href.toLowerCase().endsWith(ext))) {
                    link.setAttribute('href', `https://code.itcpr.org/code?link=${encoded}`);
                }
            });
        }
    }, [guide]);

    const loadAvailableGroups = async () => {
        setLoadingStates(prev => ({ ...prev, loadingGroups: true }));
        try {
            const groupsRef = collection(db, 'groups');
            let groupsSnap;
            
            if (userData?.type === 'admin') {
                groupsSnap = await getDocs(groupsRef);
            } else if (userData?.role === 'lead') {
                const q = query(groupsRef, where('lead', '==', auth.currentUser.uid));
                groupsSnap = await getDocs(q);
            } else {
                setAvailableGroups([]);
                return;
            }
            
            const groups = groupsSnap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }));
            
            setAvailableGroups(groups);
        } catch (error) {
            console.error('Error loading groups:', error);
            toast.error('Failed to load groups');
        } finally {
            setLoadingStates(prev => ({ ...prev, loadingGroups: false }));
        }
    };

    const handleEditGuide = async () => {
        await loadAvailableGroups();
        setGuideFormData({
            title: guide.title,
            content: guide.content,
            category: guide.category,
            audience: guide.audience
        });
        setShowEditModal(true);
    };

    const handleUpdateGuide = async () => {
        const { title, content, category, audience } = guideFormData;

        if (!title || !content || !category || !audience) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoadingStates(prev => ({ ...prev, updating: true }));

        try {
            const guideRef = doc(db, 'guides', id);
            await updateDoc(guideRef, {
                title,
                content,
                category,
                audience,
                updatedAt: serverTimestamp()
            });

            toast.success('Guide updated successfully');
            setShowEditModal(false);
            await loadGuide();
        } catch (error) {
            console.error('Error updating guide:', error);
            toast.error('Failed to update guide');
        } finally {
            setLoadingStates(prev => ({ ...prev, updating: false }));
        }
    };

    const handleDeleteGuide = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteGuide = async () => {
        setLoadingStates(prev => ({ ...prev, deleting: true }));

        try {
            const guideRef = doc(db, 'guides', id);
            await deleteDoc(guideRef);

            toast.success('Guide deleted successfully');
            navigate('/guides');
        } catch (error) {
            console.error('Error deleting guide:', error);
            toast.error('Failed to delete guide');
        } finally {
            setLoadingStates(prev => ({ ...prev, deleting: false }));
            setShowDeleteConfirm(false);
        }
    };

    const canEdit = userData?.type === 'admin' || userData?.uid === guide?.author;
    const canDelete = userData?.type === 'admin' || userData?.role === 'lead' || userData?.uid === guide?.author;
    const isLoading = Object.values(loadingStates).some(state => state);

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    if (error || !guide) {
        return (
            <div className="dashboard-container">
                <div className="error-message" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                    <span className="material-icons" style={{ fontSize: '4rem', color: 'var(--text-light)', marginBottom: 'var(--spacing-lg)' }}>error_outline</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--spacing-md)' }}>Guide Not Found</h2>
                    <p style={{ fontSize: '1rem', color: 'var(--text-medium)', marginBottom: 'var(--spacing-xl)', maxWidth: '500px', margin: '0 auto var(--spacing-xl)' }}>
                        {error || 'The guide ID is not valid or the guide doesn\'t exist.'}
                        <br />
                        Please check the URL or contact the administrator.
                    </p>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/guides')}
                    >
                        <span className="material-icons">arrow_back</span>
                        Back to Guides
                    </button>
                </div>
            </div>
        );
    }

    const formattedContent = formatContent(guide.content);

    return (
        <div className="dashboard-container">
            <div className="breadcrumb" style={{ marginBottom: 'var(--spacing-md)' }}>
                <button className="btn-link" onClick={() => navigate('/guides')}>
                    <span className="material-icons">arrow_back</span>
                    Back to Guides
                </button>
            </div>

            <div className="guide-view">
                <div className="guide-view-header">
                    <div className="guide-meta-top">
                        <div className={`guide-category ${guide.category}`}>
                            {getCategoryLabel(guide.category)}
                        </div>
                        <div className={`guide-audience ${guide.audience === 'all' ? 'all' : 'group'}`}>
                            <span className="material-icons">
                                {guide.audience === 'all' ? 'public' : 
                                 guide.audience === 'allGroups' ? 'groups' : 'group'}
                            </span>
                            {guide.audience === 'all' ? 'All Users' : capitalize(guide.audience)}
                        </div>
                    </div>
                    <h2>{guide.title}</h2>
                </div>

                <div className="guide-meta view-meta">
                    <div className="guide-author">
                        <span className="material-icons">person</span>
                        {guide.authorName || 'Unknown'}
                    </div>
                    <div className="guide-dates">
                        <div className="guide-date">
                            <span className="material-icons">calendar_today</span>
                            Created: {formatDate(guide.createdAt?.toDate())}
                        </div>
                        {guide.updatedAt && (
                            <div className="update-date">
                                <span className="material-icons">update</span>
                                Updated: {formatDate(guide.updatedAt.toDate())}
                            </div>
                        )}
                    </div>
                </div>

                <div 
                    className="guide-content-full" 
                    ref={contentRef}
                    dangerouslySetInnerHTML={{ __html: formattedContent }}
                />

                {canEdit && (
                    <div className="guide-actions">
                        <button 
                            className="btn btn-outline btn-sm" 
                            onClick={handleEditGuide}
                            disabled={isLoading}
                        >
                            <span className="material-icons">edit</span>
                            Edit Guide
                        </button>
                        {canDelete && (
                            <button 
                                className="btn btn-danger btn-sm" 
                                onClick={handleDeleteGuide}
                                disabled={isLoading}
                            >
                                <span className="material-icons">delete</span>
                                Delete Guide
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Guide Modal */}
            <Modal 
                isOpen={showEditModal}
                onClose={() => !loadingStates.updating && setShowEditModal(false)}
                size="full"
            >
                <ModalHeader onClose={() => !loadingStates.updating && setShowEditModal(false)}>
                    <h3>Edit Guide</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid">
                        <div className="form-group">
                            <label htmlFor="editGuideTitle">Title</label>
                            <input 
                                type="text" 
                                id="editGuideTitle" 
                                value={guideFormData.title}
                                onChange={(e) => setGuideFormData(prev => ({ ...prev, title: e.target.value }))}
                                disabled={loadingStates.updating}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="editGuideContent">Content</label>
                            <textarea 
                                id="editGuideContent" 
                                rows="10"
                                value={guideFormData.content}
                                onChange={(e) => setGuideFormData(prev => ({ ...prev, content: e.target.value }))}
                                disabled={loadingStates.updating}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="editGuideCategory">Category</label>
                                <select 
                                    id="editGuideCategory" 
                                    value={guideFormData.category}
                                    onChange={(e) => setGuideFormData(prev => ({ ...prev, category: e.target.value }))}
                                    disabled={loadingStates.updating}
                                    required
                                >
                                    <option value="platform">Platform Usage</option>
                                    <option value="research">Research Guidelines</option>
                                    <option value="tools">Tools & Software</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="editGuideAudience">Audience</label>
                                <select 
                                    id="editGuideAudience" 
                                    value={guideFormData.audience}
                                    onChange={(e) => setGuideFormData(prev => ({ ...prev, audience: e.target.value }))}
                                    disabled={loadingStates.updating || loadingStates.loadingGroups}
                                    required
                                >
                                    <option value="all">All Users</option>
                                    {availableGroups.map(group => (
                                        <option key={group.id} value={group.id}>{group.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => setShowEditModal(false)}
                        disabled={loadingStates.updating}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleUpdateGuide}
                        disabled={loadingStates.updating}
                    >
                        {loadingStates.updating ? 'Updating...' : 'Save Changes'}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Delete Guide"
                message="Are you sure you want to delete this guide? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDeleteGuide}
                variant="danger"
            />
        </div>
    );
}

