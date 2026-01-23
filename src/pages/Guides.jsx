import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, where } from 'firebase/firestore';
import { capitalize } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import '../css/guides.css';
import '../css/dashboard.css';
import '../css/projects.css';
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

export default function Guides() {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [guides, setGuides] = useState([]);
    const [filteredGuides, setFilteredGuides] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingGuide, setEditingGuide] = useState(null);
    const [deletingGuide, setDeletingGuide] = useState(null);
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
        creating: false,
        updating: false,
        deleting: false,
        loadingGroups: false
    });

    const loadGuides = async () => {
        setLoading(true);
        try {
            const guidesRef = collection(db, 'guides');
            const q = query(guidesRef, orderBy('createdAt', 'desc'));
            const guidesSnap = await getDocs(q);
            const guidesList = guidesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter by audience
            const filtered = guidesList.filter(guide => {
                if (guide.audience === 'all' || guide.audience === userData?.group || userData?.type === 'admin') {
                    return true;
                }
                return false;
            });

            setGuides(filtered);
            setFilteredGuides(filtered);
        } catch (error) {
            console.error('Error loading guides:', error);
            toast.error('Failed to load guides');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGuides();
    }, [userData]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredGuides(guides);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = guides.filter(guide =>
            guide.title?.toLowerCase().includes(term) ||
            guide.content?.toLowerCase().includes(term) ||
            guide.category?.toLowerCase().includes(term)
        );
        setFilteredGuides(filtered);
    }, [searchTerm, guides]);

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

    const handleCreateGuide = async () => {
        await loadAvailableGroups();
        setGuideFormData({
            title: '',
            content: '',
            category: 'platform',
            audience: 'all'
        });
        setShowCreateModal(true);
    };

    const handleSubmitGuide = async () => {
        const { title, content, category, audience } = guideFormData;

        if (!title || !content || !category || !audience) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoadingStates(prev => ({ ...prev, creating: true }));

        try {
            const guideData = {
                title,
                content,
                category,
                audience,
                author: auth.currentUser.uid,
                authorName: userData.name,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const guidesRef = collection(db, 'guides');
            await addDoc(guidesRef, guideData);

            toast.success('Guide created successfully');
            setShowCreateModal(false);
            await loadGuides();
        } catch (error) {
            console.error('Error creating guide:', error);
            toast.error('Failed to create guide');
        } finally {
            setLoadingStates(prev => ({ ...prev, creating: false }));
        }
    };

    const handleEditGuide = async (guide) => {
        setEditingGuide(guide);
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
            const guideRef = doc(db, 'guides', editingGuide.id);
            await updateDoc(guideRef, {
                title,
                content,
                category,
                audience,
                updatedAt: serverTimestamp()
            });

            toast.success('Guide updated successfully');
            setShowEditModal(false);
            setEditingGuide(null);
            await loadGuides();
        } catch (error) {
            console.error('Error updating guide:', error);
            toast.error('Failed to update guide');
        } finally {
            setLoadingStates(prev => ({ ...prev, updating: false }));
        }
    };

    const handleDeleteGuide = (guide) => {
        setDeletingGuide(guide);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteGuide = async () => {
        if (!deletingGuide) return;

        setLoadingStates(prev => ({ ...prev, deleting: true }));

        try {
            const guideRef = doc(db, 'guides', deletingGuide.id);
            await deleteDoc(guideRef);

            toast.success('Guide deleted successfully');
            setShowDeleteConfirm(false);
            setDeletingGuide(null);
            await loadGuides();
        } catch (error) {
            console.error('Error deleting guide:', error);
            toast.error('Failed to delete guide');
        } finally {
            setLoadingStates(prev => ({ ...prev, deleting: false }));
        }
    };

    const canCreate = userData?.type === 'admin' || userData?.role === 'lead';
    const canEdit = (guide) => userData?.type === 'admin' || userData?.uid === guide?.author;
    const canDelete = (guide) => userData?.type === 'admin' || userData?.role === 'lead' || userData?.uid === guide?.author;
    const isLoading = Object.values(loadingStates).some(state => state);

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Guides & Tutorials</h2>
                    <p className="text-medium">Guidelines and tutorials for using the platform or the research group.</p>
                </div>
                {canCreate && (
                    <button 
                        className="btn btn-primary" 
                        onClick={handleCreateGuide}
                        disabled={isLoading}
                    >
                        <span className="material-icons">add</span>
                        New Guide
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="filters-container">
                <div className="search-bar">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        id="guideSearch" 
                        placeholder="Search guides..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Guides Grid */}
            <div className="guides-grid">
                {filteredGuides.length > 0 ? (
                    filteredGuides.map(guide => (
                        <div key={guide.id} className="guide-card">
                            <div className="guide-header">
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
                                <h3>{guide.title}</h3>
                            </div>
                            <div className="guide-content">
                                {guide.content?.substring(0, 150)}{guide.content?.length > 150 ? '...' : ''}
                            </div>
                            <div className="guide-meta">
                                <div className="guide-author">
                                    <span className="material-icons">person</span>
                                    {guide.authorName || 'Unknown'}
                                </div>
                                <div className="guide-date">
                                    <span className="material-icons">calendar_today</span>
                                    {guide.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                                </div>
                            </div>
                            <div className="guide-actions">
                                <button 
                                    className="btn btn-outline btn-sm view-guide" 
                                    onClick={() => navigate(`/guide/${guide.id}`)}
                                    disabled={isLoading}
                                >
                                    <span className="material-icons">visibility</span>
                                    View
                                </button>
                                {canEdit(guide) && (
                                    <button 
                                        className="btn btn-outline btn-sm" 
                                        onClick={() => handleEditGuide(guide)}
                                        disabled={isLoading}
                                    >
                                        <span className="material-icons">edit</span>
                                        Edit
                                    </button>
                                )}
                                {canDelete(guide) && (
                                    <button 
                                        className="btn btn-outline btn-sm btn-danger" 
                                        onClick={() => handleDeleteGuide(guide)}
                                        disabled={isLoading}
                                    >
                                        <span className="material-icons">delete</span>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <span className="material-icons">article</span>
                        <p>No guides found</p>
                    </div>
                )}
            </div>

            {/* Create Guide Modal */}
            <Modal 
                isOpen={showCreateModal}
                onClose={() => !loadingStates.creating && setShowCreateModal(false)}
                size="full"
            >
                <ModalHeader onClose={() => !loadingStates.creating && setShowCreateModal(false)}>
                    <h3>Create New Guide</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid">
                        <div className="form-group">
                            <label htmlFor="guideTitle">Title</label>
                            <input 
                                type="text" 
                                id="guideTitle" 
                                value={guideFormData.title}
                                onChange={(e) => setGuideFormData(prev => ({ ...prev, title: e.target.value }))}
                                disabled={loadingStates.creating}
                                required
                                placeholder="Enter guide title"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="guideContent">Content</label>
                            <textarea 
                                id="guideContent" 
                                rows="10"
                                value={guideFormData.content}
                                onChange={(e) => setGuideFormData(prev => ({ ...prev, content: e.target.value }))}
                                disabled={loadingStates.creating}
                                required
                                placeholder="Write your guide content here..."
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="guideCategory">Category</label>
                                <select 
                                    id="guideCategory" 
                                    value={guideFormData.category}
                                    onChange={(e) => setGuideFormData(prev => ({ ...prev, category: e.target.value }))}
                                    disabled={loadingStates.creating}
                                    required
                                >
                                    <option value="platform">Platform Usage</option>
                                    <option value="research">Research Guidelines</option>
                                    <option value="tools">Tools & Software</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="guideAudience">Audience</label>
                                <select 
                                    id="guideAudience" 
                                    value={guideFormData.audience}
                                    onChange={(e) => setGuideFormData(prev => ({ ...prev, audience: e.target.value }))}
                                    disabled={loadingStates.creating || loadingStates.loadingGroups}
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
                        onClick={() => setShowCreateModal(false)}
                        disabled={loadingStates.creating}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSubmitGuide}
                        disabled={loadingStates.creating}
                    >
                        {loadingStates.creating ? 'Creating...' : 'Create Guide'}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Guide Modal */}
            {editingGuide && (
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
            )}

            {/* Delete Confirmation Dialog */}
            {deletingGuide && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        setDeletingGuide(null);
                    }}
                    title="Delete Guide"
                    message="Are you sure you want to delete this guide?"
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={confirmDeleteGuide}
                    variant="danger"
                />
            )}
        </div>
    );
}
