import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../contexts/AuthContext';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { formatDate, capitalize } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import '../css/projects.css';
import '../css/modal.css';

export default function Courses() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [showNewCourseModal, setShowNewCourseModal] = useState(false);
    const [showEditCourseModal, setShowEditCourseModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseLeads, setCourseLeads] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        githubRepo: '',
        leadId: '',
        startDate: '',
        dueDate: '',
        status: 'planning',
        type: 'course',
        progress: 0
    });
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const loadCourses = async () => {
        if (!user || !userData) return;
        
        setLoading(true);
        try {
            const groupsRef = collection(db, 'groups');
            const groupsSnap = await getDocs(groupsRef);
            
            let allCourses = [];
            
            for (const groupDoc of groupsSnap.docs) {
                const projectsRef = collection(db, 'groups', groupDoc.id, 'projects');
                const projectsSnap = await getDocs(projectsRef);
                
                const groupCourses = projectsSnap.docs
                    .filter(doc => doc.data().type === 'course')
                    .map(doc => ({
                        id: doc.id,
                        groupId: groupDoc.id,
                        groupName: groupDoc.id, // Store group name (groupId is the group name)
                        ...doc.data()
                    }));
                
                allCourses = allCourses.concat(groupCourses);
            }

            // Check which courses user is contributor to
            const coursesWithContributorStatus = await Promise.all(
                allCourses.map(async (course) => {
                    const contributorsRef = collection(db, 'groups', course.groupId, 'projects', course.id, 'contributors');
                    const contributorsSnap = await getDocs(contributorsRef);
                    const isContributor = contributorsSnap.docs.some(doc => doc.data().userId === user.uid);
                    const contributorCount = contributorsSnap.docs.length;
                    
                    // Get lead data
                    let leadData = { name: 'Unknown' };
                    if (course.leadId) {
                        try {
                            const leadRef = doc(db, 'users', course.leadId);
                            const leadSnap = await getDoc(leadRef);
                            if (leadSnap.exists()) {
                                leadData = leadSnap.data();
                            }
                        } catch (err) {
                            console.error('Error fetching lead user:', err);
                        }
                    }

                    return {
                        ...course,
                        isContributor,
                        contributorCount,
                        leadData,
                        canView: isContributor || 
                                userData.role === 'lead' || 
                                userData.type === 'admin' || 
                                userData.type === 'manager' || 
                                course.status !== 'planning' ||
                                userData.position === 'staff'
                    };
                })
            );

            // Sort courses: status first, then isContributor within each status, then date
            const statusOrder = {
                'active': 1,
                'planning': 2,
                'on-hold': 3,
                'completed': 4
            };
            
            coursesWithContributorStatus.sort((a, b) => {
                try {
                    // First priority: status (active → planning → on-hold → completed)
                    const statusComparison = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
                    if (statusComparison !== 0) {
                        return statusComparison;
                    }
                    
                    // Second priority: isContributor within same status (contributor first)
                    const contributorComparison = (b.isContributor ? 1 : 0) - (a.isContributor ? 1 : 0);
                    if (contributorComparison !== 0) {
                        return contributorComparison;
                    }
                    
                    // Third priority: start date (newest first)
                    if (!a?.startDate || !b?.startDate) {
                        return 0;
                    }
                    
                    const dateA = new Date(a.startDate).getTime();
                    const dateB = new Date(b.startDate).getTime();
                    
                    if (isNaN(dateA) || isNaN(dateB)) {
                        return 0;
                    }
                    
                    return dateB - dateA; // Newest first
                } catch (error) {
                    console.error('Error sorting courses:', error);
                    return 0;
                }
            });

            setCourses(coursesWithContributorStatus);
            setFilteredCourses(coursesWithContributorStatus);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, [user, userData]);

    useEffect(() => {
        async function loadLeads() {
            if (!showNewCourseModal && !showEditCourseModal) return;
            try {
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const leads = usersSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCourseLeads(leads);
            } catch (error) {
                console.error('Error loading course leads:', error);
            }
        }
        loadLeads();
    }, [showNewCourseModal, showEditCourseModal]);

    const handleEditCourse = async (courseId, groupId) => {
        try {
            const courseRef = doc(db, 'groups', groupId, 'projects', courseId);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
                const courseData = courseSnap.data();
                setEditingCourse({ id: courseId, groupId, ...courseData });
                setFormData({
                    title: courseData.title || '',
                    description: courseData.description || '',
                    githubRepo: courseData.githubRepo || '',
                    leadId: courseData.leadId || '',
                    startDate: courseData.startDate || '',
                    dueDate: courseData.dueDate || '',
                    status: courseData.status || 'planning',
                    type: courseData.type || 'course',
                    progress: courseData.progress || 0
                });
                setShowEditCourseModal(true);
            }
        } catch (error) {
            console.error('Error loading course:', error);
            toast.error('Failed to load course details');
        }
    };

    const handleDeleteCourse = async (courseId, groupId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Course',
            message: 'Are you sure you want to delete this course?',
            onConfirm: async () => {
                try {
                    const courseRef = doc(db, 'groups', groupId, 'projects', courseId);
                    await deleteDoc(courseRef);
                    
                    // Remove course from state instead of reloading
                    setCourses(prevCourses => prevCourses.filter(c => c.id !== courseId));
                    setFilteredCourses(prevFiltered => prevFiltered.filter(c => c.id !== courseId));
                    
                    toast.success('Course deleted successfully');
                } catch (error) {
                    console.error('Error deleting course:', error);
                    toast.error('Failed to delete course');
                }
            }
        });
    };

    const updateLead = async (courseId, leadId, groupId, oldLeadId) => {
        try {
            const contributorsRef = collection(db, 'groups', groupId, 'projects', courseId, 'contributors');
            if (oldLeadId && oldLeadId !== leadId) {
                const contributorsQuery = query(contributorsRef, where('userId', '==', oldLeadId));
                const contributorsSnap = await getDocs(contributorsQuery);
                if (!contributorsSnap.empty) {
                    const contributorRef = contributorsSnap.docs[0].ref;
                    await updateDoc(contributorRef, {
                        userId: leadId,
                        joinedAt: new Date().toISOString()
                    });
                } else {
                    await addDoc(contributorsRef, {
                        userId: leadId,
                        role: 'Principal Investigator',
                        joinedAt: new Date().toISOString()
                    });
                }
            } else if (!oldLeadId) {
                await addDoc(contributorsRef, {
                    userId: leadId,
                    role: 'Principal Investigator',
                    joinedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error updating lead:', error);
        }
    };

    useEffect(() => {
        let filtered = courses;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(course => 
                course.title?.toLowerCase().includes(term) ||
                course.description?.toLowerCase().includes(term) ||
                course.leadData?.name?.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        filtered = filtered.filter(course => course.status === statusFilter);

        setFilteredCourses(filtered);
    }, [courses, searchTerm, statusFilter]);

    const canCreateCourse = userData?.role === 'lead' || userData?.type === 'admin' || userData?.type === 'manager';

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Courses</h2>
                    <p className="text-medium">Manage and track courses</p>
                </div>
                {canCreateCourse && (
                    <button className="btn btn-primary" onClick={() => {
                        setFormData({
                            title: '',
                            description: '',
                            githubRepo: '',
                            leadId: '',
                            startDate: '',
                            dueDate: '',
                            status: 'planning',
                            type: 'course',
                            progress: 0
                        });
                        setShowNewCourseModal(true);
                    }}>
                        <span className="material-icons">add</span>
                        New Course
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filters-container">
                <div className="search-bar">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        id="courseSearch" 
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-buttons">
                    <button 
                        className={`btn btn-outline ${statusFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('active')}
                    >
                        Active
                    </button>
                    <button 
                        className={`btn btn-outline ${statusFilter === 'on-hold' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('on-hold')}
                    >
                        On Hold
                    </button>
                    {canCreateCourse && (
                        <button 
                            className={`btn btn-outline ${statusFilter === 'planning' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('planning')}
                        >
                            Planning
                        </button>
                    )}
                    <button 
                        className={`btn btn-outline ${statusFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('completed')}
                    >
                        Completed
                    </button>
                </div>
            </div>

            {/* Courses Grid */}
            <div className="projects-page projects-grid">
                {filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => (
                        <ProjectCard 
                            key={course.id} 
                            project={course} 
                            userData={userData}
                            navigate={navigate}
                            onEdit={handleEditCourse}
                            onDelete={handleDeleteCourse}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <span className="material-icons">school</span>
                        <p>No courses found</p>
                    </div>
                )}
            </div>

            {/* New Course Modal */}
            <Modal isOpen={showNewCourseModal} onClose={() => {
                setFormData({
                    title: '',
                    description: '',
                    githubRepo: '',
                    leadId: '',
                    startDate: '',
                    dueDate: '',
                    status: 'planning',
                    type: 'course',
                    progress: 0
                });
                setShowNewCourseModal(false);
            }}>
                <ModalHeader onClose={() => setShowNewCourseModal(false)}>
                    <h3>Add New Course</h3>
                </ModalHeader>
                <ModalBody>
                    <form 
                        id="courseForm" 
                        className="form-grid"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!formData.title || !formData.description || !formData.leadId || !formData.startDate || !formData.dueDate) {
                                toast.error('Please fill in all required fields');
                                return;
                            }

                            try {
                                const courseData = {
                                    ...formData,
                                    progress: parseInt(formData.progress, 10) || 0,
                                    createdAt: serverTimestamp(),
                                    createdBy: user.uid
                                };

                                const coursesRef = collection(db, 'groups', userData.group, 'projects');
                                const courseDoc = await addDoc(coursesRef, courseData);
                                
                                // Track gamification
                                try {
                                    const { trackProjectCreate } = await import('../utils/gamification');
                                    await trackProjectCreate(courseDoc.id);
                                } catch (error) {
                                    console.error('Error tracking course creation:', error);
                                }
                                
                                setShowNewCourseModal(false);
                                setFormData({
                                    title: '',
                                    description: '',
                                    githubRepo: '',
                                    leadId: '',
                                    startDate: '',
                                    dueDate: '',
                                    status: 'planning',
                                    type: 'course',
                                    progress: 0
                                });
                                
                                toast.success('Course created successfully');
                                // Reload courses
                                await loadCourses();
                            } catch (error) {
                                console.error('Error creating course:', error);
                                toast.error('Failed to create course');
                            }
                        }}
                    >
                        <div className="form-group">
                            <label htmlFor="courseTitle">Course Title</label>
                            <input 
                                type="text" 
                                id="courseTitle" 
                                className="form-control"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="courseDescription">Description</label>
                            <textarea 
                                id="courseDescription" 
                                className="form-control"
                                rows="3" 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="courseLead">Course Lead</label>
                            <select 
                                id="courseLead" 
                                className="form-control"
                                value={formData.leadId}
                                onChange={(e) => setFormData({...formData, leadId: e.target.value})}
                                required
                            >
                                <option value="">Select Course Lead</option>
                                {courseLeads.map(lead => (
                                    <option key={lead.id} value={lead.id}>
                                        {lead.name} ({lead.group?.charAt(0).toUpperCase() + lead.group?.slice(1)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startDate">Start Date</label>
                                <input 
                                    type="date" 
                                    id="startDate" 
                                    className="form-control"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    required 
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="dueDate">Due Date</label>
                                <input 
                                    type="date" 
                                    id="dueDate" 
                                    className="form-control"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="courseStatus">Status</label>
                                <select 
                                    id="courseStatus" 
                                    className="form-control"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    required
                                >
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="on-hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="courseProgress">Progress (%)</label>
                                <input 
                                    type="number" 
                                    id="courseProgress" 
                                    className="form-control"
                                    max="100" 
                                    min="0" 
                                    value={formData.progress}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value, 10);
                                        if (val > 100) val = 100;
                                        if (val < 0) val = 0;
                                        setFormData({...formData, progress: val});
                                    }}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="courseGithub">GitHub Repo (optional)</label>
                            <input
                                type="url"
                                id="courseGithub"
                                className="form-control"
                                placeholder="https://github.com/ITCPR/repo"
                                value={formData.githubRepo}
                                onChange={(e) => setFormData({...formData, githubRepo: e.target.value})}
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-outline" onClick={() => {
                        setFormData({
                            title: '',
                            description: '',
                            githubRepo: '',
                            leadId: '',
                            startDate: '',
                            dueDate: '',
                            status: 'planning',
                            type: 'course',
                            progress: 0
                        });
                        setShowNewCourseModal(false);
                    }}>
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            const form = document.getElementById('courseForm');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        Create Course
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Course Modal */}
            <Modal isOpen={showEditCourseModal} onClose={() => {
                setShowEditCourseModal(false);
                setEditingCourse(null);
            }}>
                <ModalHeader onClose={() => {
                    setShowEditCourseModal(false);
                    setEditingCourse(null);
                }}>
                    <h3>Edit Course</h3>
                </ModalHeader>
                <ModalBody>
                    <form 
                        id="editCourseForm" 
                        className="form-grid"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!formData.title || !formData.description || !formData.leadId || !formData.startDate || !formData.dueDate) {
                                toast.error('Please fill in all required fields');
                                return;
                            }

                            try {
                                const courseData = {
                                    ...formData,
                                    progress: parseInt(formData.progress, 10) || 0,
                                    updatedAt: serverTimestamp()
                                };

                                const courseRef = doc(db, 'groups', editingCourse.groupId, 'projects', editingCourse.id);
                                const courseSnap = await getDoc(courseRef);
                                const oldCourseData = courseSnap.data();
                                
                                await updateDoc(courseRef, courseData);
                                await updateLead(editingCourse.id, courseData.leadId, editingCourse.groupId, oldCourseData.leadId);
                                
                                // Track gamification
                                try {
                                    const { trackProjectUpdate } = await import('../utils/gamification');
                                    await trackProjectUpdate(editingCourse.id);
                                } catch (error) {
                                    console.error('Error tracking course update:', error);
                                }
                                
                                setShowEditCourseModal(false);
                                setEditingCourse(null);
                                setFormData({
                                    title: '',
                                    description: '',
                                    githubRepo: '',
                                    leadId: '',
                                    startDate: '',
                                    dueDate: '',
                                    status: 'planning',
                                    type: 'course',
                                    progress: 0
                                });
                                
                                toast.success('Course updated successfully');
                                // Reload courses
                                await loadCourses();
                            } catch (error) {
                                console.error('Error updating course:', error);
                                toast.error('Failed to update course');
                            }
                        }}
                    >
                        <div className="form-group">
                            <label htmlFor="editCourseTitle">Course Title</label>
                            <input 
                                type="text" 
                                id="editCourseTitle" 
                                className="form-control"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="editCourseDescription">Description</label>
                            <textarea 
                                id="editCourseDescription" 
                                className="form-control"
                                rows="3" 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="editCourseLead">Course Lead</label>
                            <select 
                                id="editCourseLead" 
                                className="form-control"
                                value={formData.leadId}
                                onChange={(e) => setFormData({...formData, leadId: e.target.value})}
                                required
                            >
                                <option value="">Select Course Lead</option>
                                {courseLeads.map(lead => (
                                    <option key={lead.id} value={lead.id}>
                                        {lead.name} ({lead.group?.charAt(0).toUpperCase() + lead.group?.slice(1)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="editStartDate">Start Date</label>
                                <input 
                                    type="date" 
                                    id="editStartDate" 
                                    className="form-control"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    required 
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="editDueDate">Due Date</label>
                                <input 
                                    type="date" 
                                    id="editDueDate" 
                                    className="form-control"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="editCourseStatus">Status</label>
                                <select 
                                    id="editCourseStatus" 
                                    className="form-control"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    required
                                >
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="on-hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="editCourseProgress">Progress (%)</label>
                                <input 
                                    type="number" 
                                    id="editCourseProgress" 
                                    className="form-control"
                                    max="100" 
                                    min="0" 
                                    value={formData.progress}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value, 10);
                                        if (val > 100) val = 100;
                                        if (val < 0) val = 0;
                                        setFormData({...formData, progress: val});
                                    }}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="editCourseGithub">GitHub Repo (optional)</label>
                            <input
                                type="url"
                                id="editCourseGithub"
                                className="form-control"
                                placeholder="https://github.com/ITCPR/repo"
                                value={formData.githubRepo}
                                onChange={(e) => setFormData({...formData, githubRepo: e.target.value})}
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-outline" onClick={() => {
                        setShowEditCourseModal(false);
                        setEditingCourse(null);
                    }}>
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            const form = document.getElementById('editCourseForm');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        Update Course
                    </button>
                </ModalFooter>
            </Modal>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
            />
        </div>
    );
}

// Reuse ProjectCard component from Projects.jsx
function ProjectCard({ project, userData, navigate, onEdit, onDelete }) {
    const canEdit = (userData?.role === 'lead' || userData?.type === 'admin' || userData?.type === 'manager');
    const description = project.description?.length > (project.isContributor ? 300 : 400) 
        ? project.description.slice(0, project.isContributor ? 300 : 400).trim() + '...'
        : project.description;

    return (
        <div className="project-card" data-status={project.status} data-type={project.type}>
            <div className="project-header">
                <h4 className="project-title">{project.title}</h4>
                <div className="header-badges">
                    <span className={`status-badge ${project.status}`}>{project.status}</span>
                    {project.groupName && (
                        <span className="group-badge">{capitalize(project.groupName)}</span>
                    )}
                    {project.contributorCount !== undefined && (
                        <span className="contributor-count-badge">
                            <span className="material-icons" style={{ fontSize: '0.875rem', verticalAlign: 'middle', marginRight: '2px' }}>people</span>
                            {project.contributorCount}
                        </span>
                    )}
                    {project.isContributor ? (
                        <span className="access">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                                <path d="M702-480 560-622l57-56 85 85 170-170 56 57-226 226Zm-342 0q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm80-80h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 260Zm0-340Z"/>
                            </svg>
                        </span>
                    ) : (
                        <span className="access">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                                <path d="M791-55 686-160H160v-112q0-34 17.5-62.5T224-378q45-23 91.5-37t94.5-21L55-791l57-57 736 736-57 57ZM240-240h366L486-360h-6q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm496-138q29 14 46 42.5t18 61.5L666-408q18 7 35.5 14t34.5 16ZM568-506l-59-59q23-9 37-29.5t14-45.5q0-33-23.5-56.5T480-720q-25 0-45.5 14T405-669l-59-59q23-34 58-53t76-19q66 0 113 47t47 113q0 41-19 76t-53 58Zm38 266H240h366ZM457-617Z"/>
                            </svg>
                        </span>
                    )}
                </div>
            </div>
            <p className="project-description">{description}</p>
            <div className="project-meta">
                <div className="meta-item">
                    <span className="lead-name">
                        {project.type === 'course' ? 'Course Lead' : 'Principal Investigator'}: {project.leadData?.name || 'Unknown'}
                    </span>
                </div>
                <div className="meta-item">
                    <span>Start: {formatDate(project.startDate)}</span>
                </div>
                <div className="meta-item">
                    <span>Due: {formatDate(project.dueDate)}</span>
                </div>
            </div>
            <div className="project-actions">
                <div className="actions-group">
                    {(project.isContributor || userData?.position === 'staff') && (
                        <button 
                            className="btn btn-primary" 
                            onClick={() => navigate(`/${project.type === 'course' ? 'course' : 'project'}/${project.id}`)}
                        >
                            <span className="material-icons">visibility</span>
                            View Details
                        </button>
                    )}
                    {canEdit && (
                        <>
                            <button 
                                className="btn btn-outline" 
                                onClick={() => onEdit(project.id, project.groupId)}
                            >
                                Edit
                            </button>
                            <button 
                                className="btn btn-outline" 
                                onClick={() => onDelete(project.id, project.groupId)}
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

