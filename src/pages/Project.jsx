import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';
import { formatDate, capitalize, formatContent, renderAndReplaceLatex, addTargetBlankToLinksInHtml } from '../utils/helpers';
import { sendEmail, sendContributorEmail, getEmailTemplate } from '../utils/email';
import { uploadFileToSupabase } from '../utils/github';
import { PORTAL_URL } from '../config/env';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import '../css/modal.css';
import '../css/project.css';

export default function Project() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { id: projectId } = useParams();
    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [leadData, setLeadData] = useState(null);
    const [contributors, setContributors] = useState([]);
    const [outlines, setOutlines] = useState([]);
    const [summaries, setSummaries] = useState([]);
    const [publications, setPublications] = useState([]);
    const [grades, setGrades] = useState([]);
    const [rubrics, setRubrics] = useState([]);
    const [expandedStudents, setExpandedStudents] = useState(new Set());
    const [projectGroup, setProjectGroup] = useState(userData?.group);
    const [reportFilter, setReportFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddContributorModal, setShowAddContributorModal] = useState(false);
    const [showAddOutlineModal, setShowAddOutlineModal] = useState(false);
    const [showAddReportModal, setShowAddReportModal] = useState(false);
    const [showAddPublicationModal, setShowAddPublicationModal] = useState(false);
    const [showEditOutlineModal, setShowEditOutlineModal] = useState(false);
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [showEditPublicationModal, setShowEditPublicationModal] = useState(false);
    const [showAddGradeModal, setShowAddGradeModal] = useState(false);
    const [showEditGradeModal, setShowEditGradeModal] = useState(false);
    const [showAddRubricModal, setShowAddRubricModal] = useState(false);
    const [showEditRubricModal, setShowEditRubricModal] = useState(false);
    const [editingOutline, setEditingOutline] = useState(null);
    const [editingPublication, setEditingPublication] = useState(null);
    const [editingGrade, setEditingGrade] = useState(null);
    const [editingRubric, setEditingRubric] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [projectLeads, setProjectLeads] = useState([]);
    const [contributorFormData, setContributorFormData] = useState({ userId: '', role: '', name: '', isCollaborator: false });
    const [outlineFormData, setOutlineFormData] = useState({ content: '', order: 1 });
    const [reportFormData, setReportFormData] = useState({ title: '', file: null });
    const [gradeFormData, setGradeFormData] = useState({ studentId: '', rubricId: '', score: '', feedback: '' });
    const [rubricFormData, setRubricFormData] = useState({ title: '', description: '', maxScore: '', criteria: '' });
    const [publicationFormData, setPublicationFormData] = useState({
        title: '',
        type: 'journal-paper',
        status: 'draft',
        authors: '',
        journalVenue: '',
        doiUrl: '',
        submittedDate: '',
        publishedDate: '',
        notes: ''
    });
    const [projectFormData, setProjectFormData] = useState({
        title: '',
        description: '',
        leadId: '',
        startDate: '',
        dueDate: '',
        status: 'planning',
        type: 'project',
        progress: 0,
        githubRepo: '',
        manuscriptUrl: ''
    });
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });
    const [loadingStates, setLoadingStates] = useState({
        addingContributor: false,
        addingOutline: false,
        updatingOutline: false,
        addingReport: false,
        updatingProject: false,
        addingPublication: false,
        updatingPublication: false,
        addingGrade: false,
        updatingGrade: false,
        addingRubric: false,
        updatingRubric: false
    });
    const [outlineSplit, setOutlineSplit] = useState(55);
    const [isDraggingOutlineSplit, setIsDraggingOutlineSplit] = useState(false);
    const outlineGridRef = useRef(null);

    // Helper function to get user data from users or terminated_users
    const getUserData = async (userId) => {
        if (!userId || userId === 'dummy') return null;
        
        try {
            // First try to get from users collection
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                return userSnap.data();
            }
            
            // If not found, try terminated_users collection
            const terminatedUserRef = doc(db, 'terminated_users', userId);
            const terminatedUserSnap = await getDoc(terminatedUserRef);
            if (terminatedUserSnap.exists()) {
                return terminatedUserSnap.data();
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    };

    useEffect(() => {
        if (!user || !userData || !projectId) {
            navigate('/projects');
            return;
        }

        async function loadProject() {
            setLoading(true);
            try {
                // Try to load from user's group first
                let projectRef = doc(db, 'groups', userData.group, 'projects', projectId);
                let projectSnap = await getDoc(projectRef);

                // If not found, search other groups
                if (!projectSnap.exists()) {
                    const groupsRef = collection(db, 'groups');
                    const groupsSnap = await getDocs(groupsRef);
                    
                    for (const groupDoc of groupsSnap.docs) {
                        if (groupDoc.id === userData.group) continue;
                        projectRef = doc(db, 'groups', groupDoc.id, 'projects', projectId);
                        projectSnap = await getDoc(projectRef);
                        if (projectSnap.exists()) {
                            setProjectGroup(groupDoc.id);
                            break;
                        }
                    }
                } else {
                    setProjectGroup(userData.group);
                }

                if (!projectSnap.exists()) {
                    throw new Error('Project not found');
                }

                const projectData = projectSnap.data();
                setProject({ id: projectSnap.id, ...projectData });

                // Load lead data
                if (projectData.leadId) {
                    const leadData = await getUserData(projectData.leadId);
                    if (leadData) {
                        setLeadData(leadData);
                    }
                }

                // Load contributors
                const contributorsRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'contributors');
                const contributorsSnap = await getDocs(contributorsRef);
                
                const contributorsList = await Promise.all(
                    contributorsSnap.docs.map(async (contributorDoc) => {
                        const contributor = contributorDoc.data();
                        const contributorData = await getUserData(contributor.userId);

                        return {
                            id: contributorDoc.id,
                            userId: contributor.userId,
                            name: contributor.name || contributorData?.name,
                            data: contributorData,
                            role: contributor.role,
                            joinedAt: contributor.joinedAt
                        };
                    })
                );

                // Use course roles for courses, project roles for projects
                const roleOrder = projectData.type === 'course' 
                    ? ['Instructor', 'Student']
                    : ['Principal Investigator', 'Co-Investigator', 'Analyst', 'Researcher'];
                contributorsList.sort((a, b) => {
                    const roleComparison = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
                    if (roleComparison === 0) {
                        return new Date(a.joinedAt) - new Date(b.joinedAt);
                    }
                    return roleComparison;
                });
                setContributors(contributorsList);

                // Load outlines
                const outlinesRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'outline');
                const outlinesQuery = query(outlinesRef, orderBy('order', 'asc'));
                const outlinesSnap = await getDocs(outlinesQuery);
                
                const outlinesList = await Promise.all(
                    outlinesSnap.docs.map(async (outlineDoc) => {
                        const outline = outlineDoc.data();
                        const authorData = await getUserData(outline.userId);

                        return {
                            id: outlineDoc.id,
                            ...outline,
                            authorName: authorData?.name || 'Unknown'
                        };
                    })
                );
                setOutlines(outlinesList);

                // Load summaries
                const summariesRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'summaries');
                const summariesQuery = query(summariesRef, orderBy('date', 'desc'));
                const summariesSnap = await getDocs(summariesQuery);
                
                const summariesList = await Promise.all(
                    summariesSnap.docs.map(async (summaryDoc) => {
                        const summary = summaryDoc.data();
                        const authorData = await getUserData(summary.userId);

                        return {
                            id: summaryDoc.id,
                            ...summary,
                            authorName: authorData?.name || 'Unknown'
                        };
                    })
                );
                setSummaries(summariesList);

                // Load publications (only for projects, not courses)
                if (projectData.type === 'project') {
                    const publicationsRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'publications');
                    const publicationsQuery = query(publicationsRef, orderBy('createdAt', 'desc'));
                    const publicationsSnap = await getDocs(publicationsQuery);
                    
                    const publicationsList = await Promise.all(
                        publicationsSnap.docs.map(async (pubDoc) => {
                            const pub = pubDoc.data();
                            const authorData = await getUserData(pub.userId);

                            return {
                                id: pubDoc.id,
                                ...pub,
                                authorName: authorData?.name || 'Unknown'
                            };
                        })
                    );
                    setPublications(publicationsList);
                } else {
                    setPublications([]);
                }

                // Load grades and rubrics (only for courses)
                if (projectData.type === 'course') {
                    await loadGrades();
                    await loadRubrics();
                } else {
                    setGrades([]);
                    setRubrics([]);
                }
            } catch (error) {
                console.error('Error loading project:', error);
                // Set project to null to show "not found" message instead of redirecting
                setProject(null);
            } finally {
                setLoading(false);
            }
        }

        loadProject();
    }, [user, userData, projectId, projectGroup, navigate]);

    const updateOutlineSplit = (clientX) => {
        const grid = outlineGridRef.current;
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const percent = ((clientX - rect.left) / rect.width) * 100;
        const clamped = Math.min(75, Math.max(25, percent));
        setOutlineSplit(clamped);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDraggingOutlineSplit) return;
            e.preventDefault();
            updateOutlineSplit(e.clientX);
        };

        const handleTouchMove = (e) => {
            if (!isDraggingOutlineSplit || !e.touches?.length) return;
            updateOutlineSplit(e.touches[0].clientX);
        };

        const handleUp = () => {
            if (isDraggingOutlineSplit) {
                setIsDraggingOutlineSplit(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDraggingOutlineSplit]);

    const loadAvailableUsers = async () => {
        try {
            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);
            const contributorsRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'contributors');
            const contributorsSnap = await getDocs(contributorsRef);
            const existingContributorIds = contributorsSnap.docs.map(doc => doc.data().userId);
            
            const available = usersSnap.docs
                .filter(doc => !existingContributorIds.includes(doc.id))
                .map(doc => ({ id: doc.id, ...doc.data() }));
            
            setAvailableUsers(available);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const loadContributors = async () => {
        try {
            const contributorsRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'contributors');
            const contributorsSnap = await getDocs(contributorsRef);
            
            const contributorsList = await Promise.all(
                contributorsSnap.docs.map(async (contributorDoc) => {
                    const contributor = contributorDoc.data();
                    const contributorData = await getUserData(contributor.userId);

                    return {
                        id: contributorDoc.id,
                        userId: contributor.userId,
                        name: contributor.name || contributorData?.name,
                        data: contributorData,
                        role: contributor.role,
                        joinedAt: contributor.joinedAt
                    };
                })
            );

            // Use course roles for courses, project roles for projects
            const roleOrder = project?.type === 'course' 
                ? ['Instructor', 'Student']
                : ['Principal Investigator', 'Co-Investigator', 'Analyst', 'Researcher'];
            contributorsList.sort((a, b) => {
                const roleComparison = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
                if (roleComparison === 0) {
                    return new Date(a.joinedAt) - new Date(b.joinedAt);
                }
                return roleComparison;
            });
            setContributors(contributorsList);
        } catch (error) {
            console.error('Error loading contributors:', error);
        }
    };

    const loadOutlines = async () => {
        try {
            const outlinesRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'outline');
            const outlinesQuery = query(outlinesRef, orderBy('order', 'asc'));
            const outlinesSnap = await getDocs(outlinesQuery);
            
            const outlinesList = await Promise.all(
                outlinesSnap.docs.map(async (outlineDoc) => {
                    const outline = outlineDoc.data();
                    const authorData = await getUserData(outline.userId);

                    return {
                        id: outlineDoc.id,
                        ...outline,
                        authorName: authorData?.name || 'Unknown'
                    };
                })
            );
            setOutlines(outlinesList);
        } catch (error) {
            console.error('Error loading outlines:', error);
        }
    };

    const loadSummaries = async () => {
        try {
            const summariesRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'summaries');
            const summariesQuery = query(summariesRef, orderBy('date', 'desc'));
            const summariesSnap = await getDocs(summariesQuery);
            
            const summariesList = await Promise.all(
                summariesSnap.docs.map(async (summaryDoc) => {
                    const summary = summaryDoc.data();
                    const authorData = await getUserData(summary.userId);

                    return {
                        id: summaryDoc.id,
                        ...summary,
                        authorName: authorData?.name || 'Unknown'
                    };
                })
            );
            setSummaries(summariesList);
        } catch (error) {
            console.error('Error loading summaries:', error);
        }
    };

    const loadPublications = async () => {
        try {
            // Only load publications for projects, not courses
            if (project?.type !== 'project') {
                setPublications([]);
                return;
            }

            const publicationsRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'publications');
            const publicationsQuery = query(publicationsRef, orderBy('createdAt', 'desc'));
            const publicationsSnap = await getDocs(publicationsQuery);
            
            const publicationsList = await Promise.all(
                publicationsSnap.docs.map(async (pubDoc) => {
                    const pub = pubDoc.data();
                    const authorData = await getUserData(pub.userId);

                    return {
                        id: pubDoc.id,
                        ...pub,
                        authorName: authorData?.name || 'Unknown'
                    };
                })
            );
            setPublications(publicationsList);
        } catch (error) {
            console.error('Error loading publications:', error);
        }
    };

    const loadGrades = async () => {
        try {
            if (project?.type !== 'course') {
                setGrades([]);
                return;
            }

            const gradesRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'grades');
            const gradesQuery = query(gradesRef, orderBy('createdAt', 'desc'));
            const gradesSnap = await getDocs(gradesQuery);
            
            const gradesList = await Promise.all(
                gradesSnap.docs.map(async (gradeDoc) => {
                    const grade = gradeDoc.data();
                    const studentData = await getUserData(grade.studentId);
                    let rubricTitle = 'N/A';
                    if (grade.rubricId) {
                        try {
                            const rubricDoc = await getDoc(doc(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'rubrics', grade.rubricId));
                            if (rubricDoc.exists()) {
                                rubricTitle = rubricDoc.data().title;
                            }
                        } catch (err) {
                            console.error('Error loading rubric:', err);
                        }
                    }
                    const instructorData = await getUserData(grade.instructorId || grade.userId);

                    return {
                        id: gradeDoc.id,
                        ...grade,
                        studentName: studentData?.name || 'Unknown',
                        rubricTitle: rubricTitle,
                        instructorName: instructorData?.name || 'Unknown'
                    };
                })
            );
            setGrades(gradesList);
        } catch (error) {
            console.error('Error loading grades:', error);
        }
    };

    const loadRubrics = async () => {
        try {
            if (project?.type !== 'course') {
                setRubrics([]);
                return;
            }

            const rubricsRef = collection(db, 'groups', projectGroup || userData.group, 'projects', projectId, 'rubrics');
            const rubricsQuery = query(rubricsRef, orderBy('createdAt', 'desc'));
            const rubricsSnap = await getDocs(rubricsQuery);
            
            const rubricsList = await Promise.all(
                rubricsSnap.docs.map(async (rubricDoc) => {
                    const rubric = rubricDoc.data();
                    const authorData = await getUserData(rubric.userId);

                    return {
                        id: rubricDoc.id,
                        ...rubric,
                        authorName: authorData?.name || 'Unknown'
                    };
                })
            );
            setRubrics(rubricsList);
        } catch (error) {
            console.error('Error loading rubrics:', error);
        }
    };

    const canEdit = userData?.role === 'lead' || userData?.type === 'admin' || userData?.type === 'manager';
    const isContributor = contributors.some(c => c.userId === user?.uid);
    const isIntern = contributors.some(c => c.userId === user?.uid && c.role === 'Intern');

    useEffect(() => {
        async function loadLeads() {
            if (!showEditProjectModal) return;
            try {
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const leads = usersSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setProjectLeads(leads);
            } catch (error) {
                console.error('Error loading project leads:', error);
            }
        }
        loadLeads();
    }, [showEditProjectModal]);

    const updateLead = async (projectId, leadId, groupId, oldLeadId) => {
        try {
            const contributorsRef = collection(db, 'groups', groupId, 'projects', projectId, 'contributors');
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

    const handleEditProject = () => {
        if (!project) return;
        setProjectFormData({
            title: project.title || '',
            description: project.description || '',
            leadId: project.leadId || '',
            startDate: project.startDate || '',
            dueDate: project.dueDate || '',
            status: project.status || 'planning',
            type: project.type || 'project',
            progress: project.progress || 0,
            githubRepo: project.githubRepo || '',
            manuscriptUrl: project.manuscriptUrl || ''
        });
        setShowEditProjectModal(true);
    };

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    if (!project) {
        return (
            <div className="dashboard-container">
                <div className="error-message" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                    <span className="material-icons" style={{ fontSize: '4rem', color: 'var(--text-light)', marginBottom: 'var(--spacing-lg)' }}>error_outline</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--spacing-md)' }}>Project/Course Not Found</h2>
                    <p style={{ fontSize: '1rem', color: 'var(--text-medium)', marginBottom: 'var(--spacing-xl)', maxWidth: '500px', margin: '0 auto var(--spacing-xl)' }}>
                        The project/course ID is not valid or the project/course doesn't exist.
                        <br />
                        Please check the URL or contact the administrator.
                    </p>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/projects')}
                    >
                        <span className="material-icons">arrow_back</span>
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    const filteredSummaries = reportFilter === 'all' 
        ? summaries 
        : summaries.filter(s => s.userId === reportFilter);

    return (
        <div className="project-detail-page">
            {/* Header Section */}
            <div className="project-header-section">
                <div className="project-header-content">
                    <div className="project-title-section">
                        <h1>{project.title}</h1>
                        {canEdit && (
                            <div className="project-title-actions">
                                <button className="btn btn-outline" onClick={handleEditProject}>
                                    <span className="material-icons">edit</span>
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="project-meta-badges">
                        <span className={`project-meta-badge status status-${project.status}`}>
                            {capitalize(project.status)}
                        </span>
                        <span className="project-meta-badge type">
                            {capitalize(project.type)}
                        </span>
                    </div>
                    <div className="project-progress-section">
                        <div className="project-progress-label">
                            <span>Progress</span>
                            <span>{project.progress || 0}%</span>
                        </div>
                        <div className="project-progress-bar-container">
                            <div className="project-progress-bar" style={{ width: `${project.progress || 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="project-tabs">
                <button 
                    className={`project-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <span className="material-icons">dashboard</span>
                    Overview
                </button>
                <button 
                    className={`project-tab ${activeTab === 'contributors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('contributors')}
                >
                    <span className="material-icons">people</span>
                    {project?.type === 'course' ? 'People' : 'Contributors'}
                    <span className="tab-count">({contributors.length})</span>
                </button>
                <button 
                    className={`project-tab ${activeTab === 'outline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('outline')}
                >
                    <span className="material-icons">description</span>
                    Outline
                    <span className="tab-count">({outlines.length})</span>
                </button>
                {(isContributor || canEdit) && (
                    <button 
                        className={`project-tab ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reports')}
                    >
                        <span className="material-icons">article</span>
                        Reports
                        <span className="tab-count">({summaries.length})</span>
                    </button>
                )}
                {project?.type === 'project' && (
                    <button 
                        className={`project-tab ${activeTab === 'publications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('publications')}
                    >
                        <span className="material-icons">menu_book</span>
                        Publications
                        <span className="tab-count">({publications.length})</span>
                    </button>
                )}
                {project?.type === 'course' && (isContributor || canEdit) && (
                    <button 
                        className={`project-tab ${activeTab === 'grades' ? 'active' : ''}`}
                        onClick={() => setActiveTab('grades')}
                    >
                        <span className="material-icons">grade</span>
                        Grades
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="project-tab-content">
                {/* Overview Tab */}
                <div className={`tab-panel ${activeTab === 'overview' ? 'active' : ''}`}>
                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{contributors.length}</div>
                            <div className="stat-label">{project?.type === 'course' ? 'People' : 'Contributors'}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{outlines.length}</div>
                            <div className="stat-label">Outlines</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{summaries.length}</div>
                            <div className="stat-label">Reports</div>
                        </div>
                        {project?.type === 'project' && (
                            <div className="stat-card">
                                <div className="stat-value">{publications.length}</div>
                                <div className="stat-label">Publications</div>
                            </div>
                        )}
                        <div className="stat-card">
                            <div className="stat-value">{project.progress || 0}%</div>
                            <div className="stat-label">Progress</div>
                        </div>
                    </div>

                    {/* Project Information */}
                    <div className="content-section">
                        <div className="section-header">
                            <h2>
                                <span className="material-icons">info</span>
                                {project?.type === 'course' ? 'Course' : 'Project'} Information
                            </h2>
                        </div>
                        <div className="section-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <div className="info-label">{project?.type === 'course' ? 'Instructor' : 'Principal Investigator'}</div>
                                    <div className="info-value lead">{leadData?.name || 'Unknown'}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Start Date</div>
                                    <div className="info-value">{formatDate(project.startDate)}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Due Date</div>
                                    <div className="info-value">{formatDate(project.dueDate)}</div>
                                </div>
                                {project.githubRepo && (
                                <div className="info-item">
                                        <div className="info-label">GitHub Repository</div>
                                        <div className="info-value">
                                            <a 
                                                href={project.githubRepo} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    color: 'var(--primary)', 
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-xs)'
                                                }}
                                            >
                                                <svg 
                                                    width="16" 
                                                    height="16" 
                                                    viewBox="0 0 24 24" 
                                                    fill="currentColor"
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                </svg>
                                                <span>
                                                    {project.githubRepo.replace('https://github.com/', '')}
                                                </span>
                                            </a>
                                </div>
                                </div>
                                )}
                                {project?.type === 'project' && project.manuscriptUrl && (
                                <div className="info-item">
                                        <div className="info-label">Manuscript URL</div>
                                        <div className="info-value">
                                            <a 
                                                href={project.manuscriptUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    color: 'var(--primary)', 
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-xs)'
                                                }}
                                            >
                                                <span className="material-icons" style={{ fontSize: '16px', flexShrink: 0, flexGrow: 0 }}>description</span>
                                                <span>
                                                    Overleaf: {project.manuscriptUrl.replace('https://overleaf.itcpr.org/project/', '')}
                                                </span>
                                            </a>
                                </div>
                                </div>
                                )}
                            </div>
                            <div style={{ marginTop: 'var(--spacing-lg)' }}>
                                <div className="info-label">Description</div>
                                <div className="info-value" style={{ marginTop: 'var(--spacing-xs)', lineHeight: '1.7' }}>{project.description}</div>
                            </div>
                            {project.objectives && (
                                <div style={{ marginTop: 'var(--spacing-lg)' }}>
                                    <div className="info-label">Objectives</div>
                                    <div className="info-value" style={{ marginTop: 'var(--spacing-xs)', lineHeight: '1.7' }}>{project.objectives}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contributors Tab */}
                <div className={`tab-panel ${activeTab === 'contributors' ? 'active' : ''}`}>
                    <div className="content-section">
                        <div className="section-header">
                            <h2>
                                <span className="material-icons">people</span>
                                {project?.type === 'course' ? 'People' : 'Contributors'}
                            </h2>
                            {canEdit && project.status !== 'completed' && (
                                <button className="btn btn-primary" onClick={() => {
                                    loadAvailableUsers();
                                    const defaultRole = project?.type === 'course' ? 'Student' : 'Researcher';
                                    setContributorFormData({ userId: '', role: defaultRole, name: '', isCollaborator: false });
                                    setShowAddContributorModal(true);
                                }}>
                                    <span className="material-icons">person_add</span>
                                    {project?.type === 'course' ? 'Add Person' : 'Add Contributor'}
                                </button>
                            )}
                        </div>
                        <div className="section-body">
                            {contributors.length > 0 ? (
                                <div className="contributors-list">
                                    {contributors.map(contributor => (
                                        <div key={contributor.id} className="contributor-item">
                                            {contributor.data?.photoURL ? (
                                                <img 
                                                    src={contributor.data.photoURL} 
                                                    alt={contributor.data.name} 
                                                    className="contributor-avatar"
                                                />
                                            ) : (
                                                <img src="/assets/einstein.png" alt="Default" className="contributor-avatar" />
                                            )}
                                            <div className="contributor-details">
                                                <div className="contributor-name">{contributor.name || 'Unknown'}</div>
                                                <div className="contributor-role">{contributor.role}</div>
                                                <div className="contributor-date">
                                                    Joined {new Date(contributor.joinedAt).toLocaleDateString('en-US', { 
                                                        year: 'numeric', 
                                                        month: 'long', 
                                                        day: 'numeric' 
                                                    })}
                                                </div>
                                            </div>
                                            {canEdit && (
                                                <div className="contributor-actions">
                                                    <button 
                                                        className="btn btn-icon btn-danger" 
                                                        onClick={() => {
                                                            setConfirmDialog({
                                                                isOpen: true,
                                                                title: project?.type === 'course' ? 'Remove Person' : 'Remove Contributor',
                                                                message: project?.type === 'course' ? 'Are you sure you want to remove this person?' : 'Are you sure you want to remove this contributor?',
                                                            onConfirm: async () => {
                                                                try {
                                                                    const contributorRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'contributors', contributor.id);
                                                                    const contributorSnap = await getDoc(contributorRef);
                                                                    const contributorData = contributorSnap.data();
                                                                    
                                                                    await deleteDoc(contributorRef);

                                                                    // Send email notification to removed contributor
                                                                    if (contributor.userId !== 'dummy' && project) {
                                                                        try {
                                                                            // Only send email if user exists in users collection (not terminated)
                                                                            const userRef = doc(db, 'users', contributor.userId);
                                                                            const userSnap = await getDoc(userRef);
                                                                            if (userSnap.exists()) {
                                                                                const userInfo = userSnap.data();
                                                                                if (userInfo.role !== 'supervisor' && userInfo.email) {
                                                                                    const projectType = project.type === 'course' ? 'course' : 'project';
                                                                                    const projectTypeLabel = project.type === 'course' ? 'course' : 'project';
                                                                                    const roleLabel = contributorData.role || 'contributor';
                                                                                    const message = `
                                                                                        <p>
                                                                                            You have been removed as a ${roleLabel} from a ${projectTypeLabel} of ${projectGroup} group in ITCPR by ${userData.name}${project.status === 'completed' ? ' because the ' + projectTypeLabel + ' has been completed.' : '.'}
                                                                                        </p>
                                                                                        <p><b>Details:</b>
                                                                                            <ul>
                                                                                                <li><b>${project.type === 'course' ? 'Course' : 'Project'} Title:</b> ${project.title}</li>
                                                                                                <li><b>Role:</b> ${contributorData.role}</li>
                                                                                                <li><b>Description:</b> ${project.description}</li>
                                                                                            </ul>
                                                                                        </p>
                                                                                        <p>
                                                                                            You can view ${projectTypeLabel === 'course' ? 'courses' : 'projects'} through <a href="${PORTAL_URL}/projects">ITCPR Portal >> Projects</a>.
                                                                                        </p>
                                                                                        <p>
                                                                                            If you have any questions, please contact the ${project.type === 'course' ? 'course' : 'project'} lead.
                                                                                        </p>
                                                                                    `;
                                                                                    await sendEmail(userInfo.email, `Removed as a ${roleLabel} from an ITCPR ${project.type === 'course' ? 'Course' : 'Project'}`, getEmailTemplate(userInfo.name, message));
                                                                                }
                                                                            }
                                                                        } catch (error) {
                                                                            console.error('Error sending removal email:', error);
                                                                        }
                                                                    }

                                                                    await loadContributors();
                                                                    await loadAvailableUsers();
                                                                    toast.success(project?.type === 'course' ? 'Person removed successfully' : 'Contributor removed successfully');
                                                                } catch (error) {
                                                                    console.error('Error removing contributor:', error);
                                                                    toast.error(project?.type === 'course' ? 'Failed to remove person' : 'Failed to remove contributor');
                                                                }
                                                            }
                                                            });
                                                        }}
                                                    >
                                                        <span className="material-icons">person_remove</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <span className="material-icons">people_outline</span>
                                    <p>No {project?.type === 'course' ? 'people' : 'contributors'} yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Outline Tab */}
                <div className={`tab-panel ${activeTab === 'outline' ? 'active' : ''}`}>
                    <div className="content-section">
                        <div className="section-header">
                            <h2>
                                <span className="material-icons">description</span>
                                {project?.type === 'course' ? 'Course Outline' : 'Project Outline'}
                            </h2>
                            {(project.leadId === user?.uid || !isIntern || canEdit) && project.status !== 'completed' && (
                                <button className="btn btn-primary" onClick={() => {
                                    setOutlineFormData({ content: '', order: outlines.length + 1 });
                                    setShowAddOutlineModal(true);
                                }}>
                                    <span className="material-icons">add</span>
                                    Add Outline
                                </button>
                            )}
                        </div>
                        <div className="section-body">
                            {outlines.length > 0 ? (
                                <div className="items-list">
                                    {outlines.map(outline => (
                                        <div key={outline.id} className="item-card">
                                            <div className="item-header">
                                                <div className="item-meta">
                                                    <span className="item-number">#{outline.order}</span>
                                                    <span className="item-date">{formatDate(outline.date)}</span>
                                                </div>
                                                <span className="item-author">Added by {outline.authorName}</span>
                                            </div>
                                            <div className="item-content" dangerouslySetInnerHTML={{ __html: addTargetBlankToLinksInHtml(renderAndReplaceLatex(formatContent(outline.content))) }} />
                                            {(outline.userId === user?.uid || userData?.type === 'admin') && (
                                                <div className="item-actions">
                                                    <button className="btn btn-outline btn-sm" onClick={() => {
                                                        setEditingOutline(outline);
                                                        setOutlineFormData({ content: outline.content, order: outline.order });
                                                        setShowEditOutlineModal(true);
                                                    }}>
                                                        <span className="material-icons">edit</span>
                                                        Edit
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => {
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: 'Delete Outline',
                                                            message: 'Are you sure you want to delete this outline?',
                                                            onConfirm: async () => {
                                                                try {
                                                                    const outlineRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'outline', outline.id);
                                                                    await deleteDoc(outlineRef);
                                                                    
                                                                    // Send email notification
                                                                    if (project && project.status !== 'completed') {
                                                                        try {
                                                                            const projectType = project.type === 'course' ? 'course' : 'project';
                                                                            const projectTypeLabel = project.type === 'course' ? 'course' : 'project';
                                                                            const subject = `${project.type === 'course' ? 'Course' : 'Project'} Outline Deleted`;
                                                                            const message = `
                                                                                <p>
                                                                                    A ${projectTypeLabel} outline (Outline #${outline.order}) has been deleted from the ${projectTypeLabel} titled <b>${project.title}</b> by ${userData.name}.
                                                                                </p>
                                                                                <p>
                                                                                    You can view the ${projectTypeLabel} details and collaborate with your team members here: <a href="${PORTAL_URL}/${projectType}/${projectId}">${project.title}</a>.
                                                                                </p>
                                                                            `;
                                                                            await sendContributorEmail(projectId, projectGroup, subject, message);
                                                                        } catch (error) {
                                                                            console.error('Error sending outline delete email:', error);
                                                                        }
                                                                    }
                                                                    
                                                                    await loadOutlines();
                                                                    toast.success('Outline deleted successfully');
                                                                } catch (error) {
                                                                    console.error('Error deleting outline:', error);
                                                                    toast.error('Failed to delete outline');
                                                                }
                                                            }
                                                        });
                                                    }}>
                                                        <span className="material-icons">delete</span>
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <span className="material-icons">description</span>
                                    <p>No {project?.type === 'course' ? 'course' : 'project'} outlines yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reports Tab */}
                {(isContributor || canEdit) && (
                    <div className={`tab-panel ${activeTab === 'reports' ? 'active' : ''}`}>
                        <div className="content-section">
                            <div className="section-header">
                                <h2>
                                    <span className="material-icons">article</span>
                                    {project?.type === 'course' ? 'Course' : 'Project'} Reports
                                </h2>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                    <select 
                                        id="reportUserFilter" 
                                        className="form-control" 
                                        value={reportFilter}
                                        onChange={(e) => setReportFilter(e.target.value)}
                                        style={{ minWidth: '180px' }}
                                    >
                                        <option value="all">All {project?.type === 'course' ? 'People' : 'Contributors'}</option>
                                        {[...new Set(summaries.map(s => s.userId))].map(userId => {
                                            const summary = summaries.find(s => s.userId === userId);
                                            return (
                                                <option key={userId} value={userId}>
                                                    {summary?.authorName || 'Unknown'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {project.status !== 'completed' && (
                                        <button className="btn btn-primary" onClick={() => {
                                            setReportFormData({ title: '', file: null });
                                            setShowAddReportModal(true);
                                        }}>
                                            <span className="material-icons">add</span>
                                            Add Report
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="section-body">
                                {filteredSummaries.length > 0 ? (
                                    <div className="items-list">
                                        {filteredSummaries.map(summary => (
                                            <div key={summary.id} className="item-card">
                                                <div className="item-header">
                                                    <div className="item-meta">
                                                        <span className="item-date">{formatDate(summary.date)}</span>
                                                    </div>
                                                    <span className="item-author">Added by {summary.authorName}</span>
                                                </div>
                                                <div className="item-content">
                                                    {summary.title}
                                                </div>
                                                <div className="item-actions">
                                                    <button className="btn btn-outline btn-sm" onClick={() => {
                                                        if (summary.fileUrl) {
                                                            // Use viewProjectReport logic - handle all file types
                                                            const encodedUrl = encodeURIComponent(summary.fileUrl);
                                                            const fileType = summary.filetype || '';
                                                            const fileName = summary.title || '';
                                                            
                                                            // Check if it's a Jupyter notebook
                                                            const isJupyterNotebook = 
                                                                fileType === 'application/x-ipynb+json' || 
                                                                fileType === 'ipynb' || 
                                                                fileName.toLowerCase().endsWith('.ipynb');
                                                            
                                                            if (isJupyterNotebook) {
                                                                // Open Jupyter notebooks in Jupyter viewer
                                                                window.open(`https://jupyter.itcpr.org/file?link=${encodedUrl}`, '_blank');
                                                            } else {
                                                                // Open all other file types (PDF, DOC, DOCX, PPT, PPTX) directly
                                                            window.open(summary.fileUrl, '_blank');
                                                            }
                                                        } else {
                                                            // Use viewReport logic - open in Jupyter viewer using the path
                                                            const reportPath = `groups/${projectGroup}/projects/${projectId}/summaries/${summary.id}`;
                                                            const safePath = encodeURIComponent(reportPath).replace(/%2F/g, '/');
                                                            window.open(`https://jupyter.itcpr.org/view?path=${safePath}`, '_blank');
                                                        }
                                                    }}>
                                                        <span className="material-icons">visibility</span>
                                                        View
                                                    </button>
                                                    {(summary.userId === user?.uid || userData?.type === 'admin') && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => {
                                                            setConfirmDialog({
                                                                isOpen: true,
                                                                title: 'Delete Report',
                                                                message: 'Are you sure you want to delete this report?',
                                                                onConfirm: async () => {
                                                                    try {
                                                                        const reportRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'summaries', summary.id);
                                                                        await deleteDoc(reportRef);
                                                                        
                                                                        // Send email notification
                                                                        if (project && project.status !== 'completed') {
                                                                            try {
                                                                                const projectType = project.type === 'course' ? 'course' : 'project';
                                                                                const projectTypeLabel = project.type === 'course' ? 'course' : 'project';
                                                                                const subject = `${project.type === 'course' ? 'Course' : 'Project'} Report Deleted`;
                                                                                const message = `
                                                                                    <p>
                                                                                        A ${projectTypeLabel} report has been deleted from the ${projectTypeLabel} titled <b>${project.title}</b> by ${userData.name}.
                                                                                    </p>
                                                                                    <p>
                                                                                        You can view the ${projectTypeLabel} details and collaborate with your team members here: <a href="${PORTAL_URL}/${projectType}/${projectId}">${project.title}</a>.
                                                                                    </p>
                                                                                `;
                                                                                await sendContributorEmail(projectId, projectGroup, subject, message);
                                                                            } catch (error) {
                                                                                console.error('Error sending report delete email:', error);
                                                                            }
                                                                        }
                                                                        
                                                                        await loadSummaries();
                                                                        toast.success('Report deleted successfully');
                                                                    } catch (error) {
                                                                        console.error('Error deleting report:', error);
                                                                        toast.error('Failed to delete report');
                                                                    }
                                                                }
                                                            });
                                                        }}>
                                                            <span className="material-icons">delete</span>
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <span className="material-icons">article</span>
                                        <p>No {project?.type === 'course' ? 'course' : 'project'} reports found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Grades Tab */}
                {project?.type === 'course' && (isContributor || canEdit) && (
                    <div className={`tab-panel ${activeTab === 'grades' ? 'active' : ''}`}>
                        <div className="content-section">
                            <div className="section-header">
                                <h2>
                                    <span className="material-icons">grade</span>
                                    Grades
                                </h2>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                    {canEdit && project.status !== 'completed' && (
                                        <>
                                            <button className="btn btn-primary" onClick={() => {
                                                setGradeFormData({ studentId: '', rubricId: '', score: '', feedback: '' });
                                                setShowAddGradeModal(true);
                                            }}>
                                                <span className="material-icons">add</span>
                                                Add Grade
                                            </button>
                                            <button className="btn btn-outline" onClick={() => {
                                                setRubricFormData({ title: '', description: '', maxScore: '', criteria: '' });
                                                setShowAddRubricModal(true);
                                            }}>
                                                <span className="material-icons">rule</span>
                                                Add Rubric
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="section-body">
                                {/* Grades Section */}
                                <div>
                                    <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.2rem', fontWeight: 600 }}>Student Grades</h3>
                                    {grades.length > 0 ? (() => {
                                        // Group grades by student
                                        const gradesByStudent = grades.reduce((acc, grade) => {
                                            const studentId = grade.studentId;
                                            if (!acc[studentId]) {
                                                acc[studentId] = {
                                                    studentId: studentId,
                                                    studentName: grade.studentName,
                                                    grades: []
                                                };
                                            }
                                            acc[studentId].grades.push(grade);
                                            return acc;
                                        }, {});

                                        const students = Object.values(gradesByStudent).map(student => {
                                            // Calculate total score and max score
                                            const totalScore = student.grades.reduce((sum, g) => sum + (parseFloat(g.score) || 0), 0);
                                            const totalMaxScore = student.grades.reduce((sum, g) => sum + (parseFloat(g.maxScore) || 0), 0);
                                            return {
                                                ...student,
                                                totalScore,
                                                totalMaxScore,
                                                percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0
                                            };
                                        });

                                        // Sort students by percentage (highest first), then by total score
                                        students.sort((a, b) => {
                                            if (b.percentage !== a.percentage) {
                                                return b.percentage - a.percentage;
                                            }
                                            return b.totalScore - a.totalScore;
                                        });

                                        return (
                                            <div className="items-list">
                                                {students.map(student => {
                                                    const isExpanded = expandedStudents.has(student.studentId);
                                                    
                                                    return (
                                                        <div key={student.studentId} className="item-card student-grade-card">
                                                            <div 
                                                                className={`item-header student-grade-header ${isExpanded ? 'expanded' : ''}`}
                                                                onClick={() => {
                                                                    setExpandedStudents(prev => {
                                                                        const newSet = new Set(prev);
                                                                        if (newSet.has(student.studentId)) {
                                                                            newSet.delete(student.studentId);
                                                                        } else {
                                                                            newSet.add(student.studentId);
                                                                        }
                                                                        return newSet;
                                                                    });
                                                                }}
                                                            >
                                                                <div className="item-meta student-grade-header-content">
                                                                    <span className={`material-icons student-grade-chevron ${isExpanded ? 'expanded' : ''}`}>
                                                                        chevron_right
                                                                    </span>
                                                                    <h4 className="student-grade-name">{student.studentName}</h4>
                                                                    {student.totalMaxScore > 0 && (
                                                                        <span className="student-grade-total">
                                                                            Total: {student.totalScore}/{student.totalMaxScore} ({student.percentage.toFixed(1)}%)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isExpanded && (
                                                                <div className="item-content">
                                                                {student.grades.length > 0 ? (
                                                                    <div className="student-grades-list">
                                                                        {student.grades.map(grade => (
                                                                            <div key={grade.id} className="student-grade-item">
                                                                                <div className="student-grade-item-header">
                                                                                    <div className="student-grade-item-title">
                                                                                        <strong>{grade.rubricTitle}</strong>
                                                                                        <span className="student-grade-item-score">
                                                                                            Score: {grade.score}/{grade.maxScore || 'N/A'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="student-grade-item-date">
                                                                                        {formatDate(grade.createdAt?.toDate?.() || grade.createdAt || new Date())}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="student-grade-item-instructor">
                                                                                    Graded by {grade.instructorName}
                                                                                </div>
                                                                                {grade.feedback && (
                                                                                    <div className="student-grade-item-feedback">
                                                                                        <strong>Feedback:</strong>
                                                                                        <p>{grade.feedback}</p>
                                                                                    </div>
                                                                                )}
                                                                                {(canEdit || grade.studentId === user?.uid) && (
                                                                                    <div className="student-grade-item-actions">
                                                                                        {canEdit && (
                                                                                            <button className="btn btn-outline btn-sm" onClick={() => {
                                                                                                setEditingGrade(grade);
                                                                                                setGradeFormData({
                                                                                                    studentId: grade.studentId || '',
                                                                                                    rubricId: grade.rubricId || '',
                                                                                                    score: grade.score || '',
                                                                                                    feedback: grade.feedback || ''
                                                                                                });
                                                                                                setShowEditGradeModal(true);
                                                                                            }}>
                                                                                                <span className="material-icons">edit</span>
                                                                                                Edit
                                                                                            </button>
                                                                                        )}
                                                                                        {canEdit && (
                                                                                            <button className="btn btn-danger btn-sm" onClick={() => {
                                                                                                setConfirmDialog({
                                                                                                    isOpen: true,
                                                                                                    title: 'Delete Grade',
                                                                                                    message: 'Are you sure you want to delete this grade?',
                                                                                                    onConfirm: async () => {
                                                                                                        try {
                                                                                                            const gradeRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'grades', grade.id);
                                                                                                            await deleteDoc(gradeRef);
                                                                                                            await loadGrades();
                                                                                                            toast.success('Grade deleted successfully');
                                                                                                        } catch (error) {
                                                                                                            console.error('Error deleting grade:', error);
                                                                                                            toast.error('Failed to delete grade');
                                                                                                        }
                                                                                                    }
                                                                                                });
                                                                                            }}>
                                                                                                <span className="material-icons">delete</span>
                                                                                                Delete
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p style={{ color: 'var(--text-medium)' }}>No grades yet</p>
                                                                )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })() : (
                                        <div className="empty-state">
                                            <span className="material-icons">grade</span>
                                            <p>No grades yet</p>
                                        </div>
                                    )}
                                </div>
                                                                {/* Grading Rubrics Section */}
                                                                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                                    <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.2rem', fontWeight: 600 }}>Grading Rubrics</h3>
                                    {rubrics.length > 0 ? (
                                        <div className="items-list">
                                            {rubrics.map(rubric => (
                                                <div key={rubric.id} className="item-card">
                                                    <div className="item-header">
                                                        <div className="item-meta">
                                                            <span className="item-date">Max Score: {rubric.maxScore}</span>
                                                        </div>
                                                        <span className="item-author">Created by {rubric.authorName}</span>
                                                    </div>
                                                    <div className="item-content">
                                                        <h4>{rubric.title}</h4>
                                                        {rubric.description && (
                                                            <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--text-medium)' }}>{rubric.description}</p>
                                                        )}
                                                        {rubric.criteria && (
                                                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                                                <strong>Criteria:</strong>
                                                                <p style={{ marginTop: 'var(--spacing-xs)', whiteSpace: 'pre-wrap' }}>{rubric.criteria}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {canEdit && (
                                                        <div className="item-actions">
                                                            <button className="btn btn-outline btn-sm" onClick={() => {
                                                                setEditingRubric(rubric);
                                                                setRubricFormData({
                                                                    title: rubric.title || '',
                                                                    description: rubric.description || '',
                                                                    maxScore: rubric.maxScore || '',
                                                                    criteria: rubric.criteria || ''
                                                                });
                                                                setShowEditRubricModal(true);
                                                            }}>
                                                                <span className="material-icons">edit</span>
                                                                Edit
                                                            </button>
                                                            <button className="btn btn-danger btn-sm" onClick={() => {
                                                                setConfirmDialog({
                                                                    isOpen: true,
                                                                    title: 'Delete Rubric',
                                                                    message: 'Are you sure you want to delete this rubric?',
                                                                    onConfirm: async () => {
                                                                        try {
                                                                            const rubricRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'rubrics', rubric.id);
                                                                            await deleteDoc(rubricRef);
                                                                            await loadRubrics();
                                                                            toast.success('Rubric deleted successfully');
                                                                        } catch (error) {
                                                                            console.error('Error deleting rubric:', error);
                                                                            toast.error('Failed to delete rubric');
                                                                        }
                                                                    }
                                                                });
                                                            }}>
                                                                <span className="material-icons">delete</span>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state">
                                            <span className="material-icons">rule</span>
                                            <p>No grading rubrics yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Publications Tab */}
                {project?.type === 'project' && (
                    <div className={`tab-panel ${activeTab === 'publications' ? 'active' : ''}`}>
                        <div className="content-section">
                            <div className="section-header">
                                <h2>
                                    <span className="material-icons">menu_book</span>
                                    Publications
                                </h2>
                                {(isContributor || canEdit) && (
                                    <button className="btn btn-primary" onClick={() => {
                                        setPublicationFormData({
                                            title: '',
                                            type: 'journal-paper',
                                            status: 'draft',
                                            authors: '',
                                            journalVenue: '',
                                            doiUrl: '',
                                            submittedDate: '',
                                            publishedDate: '',
                                            notes: ''
                                        });
                                        setShowAddPublicationModal(true);
                                    }}>
                                        <span className="material-icons">add</span>
                                        Add Publication
                                    </button>
                                )}
                            </div>
                            <div className="section-body">
                                {publications.length > 0 ? (
                                    <div className="items-list">
                                        {publications.map(pub => {
                                            const statusColors = {
                                                'draft': '#9e9e9e',
                                                'submitted': '#ff9800',
                                                'under-review': '#ff5722',
                                                'minor-revision': '#9c27b0',
                                                'major-revision': '#e91e63',
                                                'revision-submitted': '#673ab7',
                                                'accepted': '#4caf50',
                                                'in-press': '#00bcd4',
                                                'published': '#009688'
                                            };
                                            const statusLabels = {
                                                'draft': 'Draft',
                                                'submitted': 'Submitted',
                                                'under-review': 'Under Review',
                                                'minor-revision': 'Minor Revision',
                                                'major-revision': 'Major Revision',
                                                'revision-submitted': 'Revision Submitted',
                                                'accepted': 'Accepted',
                                                'in-press': 'In Press',
                                                'published': 'Published'
                                            };
                                            const typeLabels = {
                                                'journal-paper': 'Journal Paper',
                                                'conference-paper': 'Conference Paper',
                                                'poster': 'Poster',
                                                'talk': 'Talk',
                                                'book': 'Book',
                                                'thesis': 'Thesis',
                                                'other': 'Other'
                                            };
                                            return (
                                                <div key={pub.id} className="item-card">
                                                    <div className="item-header">
                                                        <div className="item-meta">
                                                            <span 
                                                                className="item-status" 
                                                                style={{ '--status-color': statusColors[pub.status] || '#9e9e9e' }}
                                                            >
                                                                {statusLabels[pub.status] || pub.status}
                                                            </span>
                                                            <span className="item-type">
                                                                {typeLabels[pub.type] || pub.type}
                                                            </span>
                                                        </div>
                                                        <span className="item-author">Added by {pub.authorName}</span>
                                                    </div>
                                                    <div className="item-content">
                                                        <h4 className="publication-title">{pub.title}</h4>
                                                        {pub.authors && (
                                                            <p className="publication-text">
                                                                <span className="material-icons">people</span>
                                                                {pub.authors}
                                                            </p>
                                                        )}
                                                        {pub.journalVenue && (
                                                            <p className="publication-text">
                                                                <span className="material-icons">menu_book</span>
                                                                {pub.journalVenue}
                                                            </p>
                                                        )}
                                                        {pub.doiUrl && (
                                                            <p className="publication-text">
                                                                <span className="material-icons">link</span>
                                                                <a href={pub.doiUrl} target="_blank" rel="noopener noreferrer" className="publication-link">
                                                                    {pub.doiUrl.slice(0, 50)}...
                                                                </a>
                                                            </p>
                                                        )}
                                                        {pub.submittedDate && (
                                                            <p className="publication-text-small">
                                                                <span className="material-icons">send</span>
                                                                <strong>Submitted:</strong> {formatDate(pub.submittedDate)}
                                                            </p>
                                                        )}
                                                        {pub.publishedDate && (
                                                            <p className="publication-text-small">
                                                                <span className="material-icons">publish</span>
                                                                <strong>Published:</strong> {formatDate(pub.publishedDate)}
                                                            </p>
                                                        )}
                                                        {pub.notes && (
                                                            <p className="publication-notes">
                                                                {pub.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="item-actions">
                                                        {(pub.userId === user?.uid || userData?.type === 'admin' || canEdit) && (
                                                            <>
                                                                <button className="btn btn-outline btn-sm" onClick={() => {
                                                                    setEditingPublication(pub);
                                                                    setPublicationFormData({
                                                                        title: pub.title || '',
                                                                        type: pub.type || 'journal-paper',
                                                                        status: pub.status || 'draft',
                                                                        authors: pub.authors || '',
                                                                        journalVenue: pub.journalVenue || '',
                                                                        doiUrl: pub.doiUrl || '',
                                                                        submittedDate: pub.submittedDate || '',
                                                                        publishedDate: pub.publishedDate || '',
                                                                        notes: pub.notes || ''
                                                                    });
                                                                    setShowEditPublicationModal(true);
                                                                }}>
                                                                    <span className="material-icons">edit</span>
                                                                    Edit
                                                                </button>
                                                                <button className="btn btn-danger btn-sm" onClick={() => {
                                                                    setConfirmDialog({
                                                                        isOpen: true,
                                                                        title: 'Delete Publication',
                                                                        message: 'Are you sure you want to delete this publication?',
                                                                        onConfirm: async () => {
                                                                            try {
                                                                                const pubRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'publications', pub.id);
                                                                                await deleteDoc(pubRef);
                                                                                await loadPublications();
                                                                                toast.success('Publication deleted successfully');
                                                                            } catch (error) {
                                                                                console.error('Error deleting publication:', error);
                                                                                toast.error('Failed to delete publication');
                                                                            }
                                                                        }
                                                                    });
                                                                }}>
                                                                    <span className="material-icons">delete</span>
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <span className="material-icons">menu_book</span>
                                        <p>No publications yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Contributor Modal */}
            <Modal isOpen={showAddContributorModal} onClose={loadingStates.addingContributor ? undefined : () => setShowAddContributorModal(false)}>
                <ModalHeader onClose={loadingStates.addingContributor ? undefined : () => setShowAddContributorModal(false)}>
                    <h3>{project?.type === 'course' ? 'Add Person' : 'Add Contributor'}</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, addingContributor: true }));
                        try {
                            const userId = contributorFormData.isCollaborator ? 'dummy' : contributorFormData.userId;
                            if (!userId || (userId === 'dummy' && !contributorFormData.name) || !contributorFormData.role) {
                                toast.error('Please fill in all fields');
                                setLoadingStates(prev => ({ ...prev, addingContributor: false }));
                                return;
                            }

                            const contributorsRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'contributors');
                            await addDoc(contributorsRef, {
                                userId: userId,
                                role: contributorFormData.role,
                                name: contributorFormData.isCollaborator ? contributorFormData.name : null,
                                joinedAt: new Date().toISOString()
                            });

                            // Send email notification
                            if (userId !== 'dummy' && project && project.status !== 'completed') {
                                try {
                                    // Only send email if user exists in users collection (not terminated)
                                    const userRef = doc(db, 'users', userId);
                                    const userSnap = await getDoc(userRef);
                                    if (userSnap.exists()) {
                                        const userInfo = userSnap.data();
                                        if (userInfo.role !== 'supervisor' && userInfo.email) {
                                            const projectType = project.type === 'course' ? 'course' : 'project';
                                            const projectTypeLabel = project.type === 'course' ? 'course' : 'project';
                                            const roleLabel = contributorFormData.role || 'contributor';
                                            const message = `
                                                <p>
                                                    You have been added as a ${roleLabel} to a ${projectTypeLabel} of ${projectGroup} group in ITCPR.
                                                </p>
                                                <p><b>Details:</b>
                                                    <ul>
                                                        <li><b>${project.type === 'course' ? 'Course' : 'Project'} Title:</b> ${project.title}</li>
                                                        <li><b>Role:</b> ${contributorFormData.role}</li>
                                                        <li><b>Description:</b> ${project.description}</li>
                                                    </ul>
                                                </p>
                                                <p>
                                                    You can view the ${projectTypeLabel} details and collaborate with your team members here: <a href="${PORTAL_URL}/${projectType}/${projectId}">${project.title}</a>.
                                                </p>
                                            `;
                                            await sendEmail(userInfo.email, `Added as a ${roleLabel} to an ITCPR ${project.type === 'course' ? 'Course' : 'Project'}`, getEmailTemplate(userInfo.name, message));
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error sending contributor email:', error);
                                }
                            }

                            setShowAddContributorModal(false);
                            const defaultRole = project?.type === 'course' ? 'Student' : 'Researcher';
                            setContributorFormData({ userId: '', role: defaultRole, name: '', isCollaborator: false });
                            await loadContributors();
                            await loadAvailableUsers();
                            toast.success(project?.type === 'course' ? 'Person added successfully' : 'Contributor added successfully');
                        } catch (error) {
                            console.error('Error adding contributor:', error);
                            toast.error(project?.type === 'course' ? 'Failed to add person' : 'Failed to add contributor');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, addingContributor: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="contributorId">Select User</label>
                            <select 
                                id="contributorId" 
                                className="form-control"
                                value={contributorFormData.isCollaborator ? 'collaborator' : contributorFormData.userId}
                                onChange={(e) => {
                                    if (e.target.value === 'collaborator') {
                                        setContributorFormData({...contributorFormData, isCollaborator: true, userId: ''});
                                    } else {
                                        setContributorFormData({...contributorFormData, isCollaborator: false, userId: e.target.value});
                                    }
                                }}
                            >
                                <option value="">Select a user...</option>
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.group?.charAt(0).toUpperCase() + user.group?.slice(1)})
                                    </option>
                                ))}
                                <option value="collaborator">Other Collaborator</option>
                            </select>
                        </div>
                        {contributorFormData.isCollaborator && (
                            <div className="form-group">
                                <label htmlFor="collaboratorName">Collaborator Name</label>
                                <input 
                                    type="text" 
                                    id="collaboratorName" 
                                    className="form-control"
                                    value={contributorFormData.name}
                                    onChange={(e) => setContributorFormData({...contributorFormData, name: e.target.value})}
                                    placeholder="Enter name"
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="contributorRole">Role</label>
                            <select 
                                id="contributorRole" 
                                className="form-control"
                                value={contributorFormData.role}
                                onChange={(e) => setContributorFormData({...contributorFormData, role: e.target.value})}
                            >
                                {project?.type === 'course' ? (
                                    <>
                                        <option value="Instructor">Instructor</option>
                                        <option value="Student">Student</option>
                                    </>
                                ) : (
                                    <>
                                <option value="Researcher">Researcher</option>
                                <option value="Analyst">Analyst</option>
                                <option value="Co-Investigator">Co-Investigator</option>
                                <option value="Principal Investigator">Principal Investigator</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.addingContributor}
                        onClick={() => setShowAddContributorModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.addingContributor}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.addingContributor ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Adding...
                            </>
                        ) : (
                            project?.type === 'course' ? 'Add Person' : 'Add Contributor'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Add Outline Modal */}
            <Modal isOpen={showAddOutlineModal} onClose={loadingStates.addingOutline ? undefined : () => setShowAddOutlineModal(false)} size="full">
                <ModalHeader onClose={loadingStates.addingOutline ? undefined : () => setShowAddOutlineModal(false)}>
                    <h3>Add {project?.type === 'course' ? 'Course' : 'Project'} Outline</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, addingOutline: true }));
                        try {
                            if (!outlineFormData.order || !outlineFormData.content) {
                                toast.error('Please fill in all fields');
                                setLoadingStates(prev => ({ ...prev, addingOutline: false }));
                                return;
                            }

                            const outlinesRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'outline');
                            await addDoc(outlinesRef, {
                                order: parseInt(outlineFormData.order, 10),
                                content: outlineFormData.content,
                                date: new Date().toISOString(),
                                userId: user.uid
                            });

                            // Send email notification
                            if (project && project.status !== 'completed') {
                                try {
                                    const projectType = project.type === 'course' ? 'course' : 'project';
                                    const projectTypeLabel = project.type === 'course' ? 'course' : 'project';
                                    const subject = `New ${project.type === 'course' ? 'Course' : 'Project'} Outline Added`;
                                    const message = `
                                        <p>
                                            A new ${projectTypeLabel} outline (Outline #${outlineFormData.order}) has been added to the ${projectTypeLabel} titled <b>${project.title}</b> by ${userData.name}.
                                        </p>
                                        <p>
                                            You can view the ${projectTypeLabel} details and collaborate with your team members here: <a href="${PORTAL_URL}/${projectType}/${projectId}">${project.title}</a>.
                                        </p>
                                    `;
                                    await sendContributorEmail(projectId, projectGroup, subject, message);
                                } catch (error) {
                                    console.error('Error sending outline email:', error);
                                }
                            }

                            setShowAddOutlineModal(false);
                            setOutlineFormData({ content: '', order: outlines.length + 1 });
                            await loadOutlines();
                            toast.success('Outline added successfully');
                        } catch (error) {
                            console.error('Error adding outline:', error);
                            toast.error('Failed to add outline');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, addingOutline: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="outlineOrder">Order</label>
                            <input 
                                type="number" 
                                id="outlineOrder" 
                                className="form-control"
                                value={outlineFormData.order}
                                onChange={(e) => setOutlineFormData({...outlineFormData, order: parseInt(e.target.value, 10)})}
                                min="1"
                                required
                            />
                        </div>
                        <div className="form-group outline-editor">
                            <div className="outline-editor__header">
                            <label htmlFor="outlineContent">Outline</label>
                                <span className="outline-preview-hint">Live markdown preview</span>
                            </div>
                            <div
                                className="outline-editor__grid"
                                ref={outlineGridRef}
                                style={{ '--outline-split': `${outlineSplit}%` }}
                            >
                            <textarea 
                                id="outlineContent" 
                                className="form-control"
                                rows="12" 
                                value={outlineFormData.content}
                                onChange={(e) => setOutlineFormData({...outlineFormData, content: e.target.value})}
                                    placeholder={project?.type === 'course' ? 'Describe the course outline...' : 'Describe the project outline...'}
                                required
                            />
                                <div
                                    className="outline-resize-handle"
                                    role="separator"
                                    aria-orientation="vertical"
                                    aria-label="Resize preview"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsDraggingOutlineSplit(true);
                                        updateOutlineSplit(e.clientX);
                                    }}
                                    onTouchStart={(e) => {
                                        setIsDraggingOutlineSplit(true);
                                        if (e.touches?.length) {
                                            updateOutlineSplit(e.touches[0].clientX);
                                        }
                                    }}
                                >
                                    <span className="outline-resize-grip" />
                                </div>
                                <div className="outline-preview" aria-live="polite">
                                    {outlineFormData.content ? (
                                        <div className="outline-preview-content" dangerouslySetInnerHTML={{ __html: renderAndReplaceLatex(formatContent(outlineFormData.content)) }} />
                                    ) : (
                                        <p className="outline-preview-empty">Start typing to see markdown formatting.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.addingOutline}
                        onClick={() => setShowAddOutlineModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.addingOutline}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.addingOutline ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Adding...
                            </>
                        ) : (
                            'Add Outline'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Outline Modal */}
            <Modal isOpen={showEditOutlineModal} onClose={loadingStates.updatingOutline ? undefined : () => {
                setShowEditOutlineModal(false);
                setEditingOutline(null);
            }} size="full">
                <ModalHeader onClose={loadingStates.updatingOutline ? undefined : () => {
                    setShowEditOutlineModal(false);
                    setEditingOutline(null);
                }}>
                    <h3>Edit {project?.type === 'course' ? 'Course' : 'Project'} Outline</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, updatingOutline: true }));
                        try {
                            if (!outlineFormData.order || !outlineFormData.content) {
                                toast.error('Please fill in all fields');
                                setLoadingStates(prev => ({ ...prev, updatingOutline: false }));
                                return;
                            }

                            const outlineRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'outline', editingOutline.id);
                            await updateDoc(outlineRef, {
                                order: parseInt(outlineFormData.order, 10),
                                content: outlineFormData.content,
                                updatedAt: new Date().toISOString()
                            });

                            // Send email notification
                            if (project && project.status !== 'completed') {
                                try {
                                    const projectType = project.type === 'course' ? 'course' : 'project';
                                    const projectTypeLabel = project.type === 'course' ? 'course' : 'project';
                                    const subject = `${project.type === 'course' ? 'Course' : 'Project'} Outline Updated`;
                                    const message = `
                                        <p>
                                            A ${projectTypeLabel} outline (Outline #${outlineFormData.order}) has been updated in the ${projectTypeLabel} titled <b>${project.title}</b> by ${userData.name}.
                                        </p>
                                        <p>
                                            You can view the ${projectTypeLabel} details and collaborate with your team members here: <a href="${PORTAL_URL}/${projectType}/${projectId}">${project.title}</a>.
                                        </p>
                                    `;
                                    await sendContributorEmail(projectId, projectGroup, subject, message);
                                } catch (error) {
                                    console.error('Error sending outline update email:', error);
                                }
                            }

                            setShowEditOutlineModal(false);
                            setEditingOutline(null);
                            setOutlineFormData({ content: '', order: 1 });
                            await loadOutlines();
                            toast.success('Outline updated successfully');
                        } catch (error) {
                            console.error('Error updating outline:', error);
                            toast.error('Failed to update outline');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, updatingOutline: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="editOutlineOrder">Order</label>
                            <input 
                                type="number" 
                                id="editOutlineOrder" 
                                className="form-control"
                                value={outlineFormData.order}
                                onChange={(e) => setOutlineFormData({...outlineFormData, order: parseInt(e.target.value, 10)})}
                                min="1"
                                required
                            />
                        </div>
                        <div className="form-group outline-editor">
                            <div className="outline-editor__header">
                            <label htmlFor="editOutlineContent">Outline</label>
                                <span className="outline-preview-hint">Live markdown preview</span>
                            </div>
                            <div
                                className="outline-editor__grid"
                                ref={outlineGridRef}
                                style={{ '--outline-split': `${outlineSplit}%` }}
                            >
                            <textarea 
                                id="editOutlineContent" 
                                className="form-control"
                                rows="12" 
                                value={outlineFormData.content}
                                onChange={(e) => setOutlineFormData({...outlineFormData, content: e.target.value})}
                                required
                            />
                                <div
                                    className="outline-resize-handle"
                                    role="separator"
                                    aria-orientation="vertical"
                                    aria-label="Resize preview"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsDraggingOutlineSplit(true);
                                        updateOutlineSplit(e.clientX);
                                    }}
                                    onTouchStart={(e) => {
                                        setIsDraggingOutlineSplit(true);
                                        if (e.touches?.length) {
                                            updateOutlineSplit(e.touches[0].clientX);
                                        }
                                    }}
                                >
                                    <span className="outline-resize-grip" />
                                </div>
                                <div className="outline-preview" aria-live="polite">
                                    {outlineFormData.content ? (
                                        <div className="outline-preview-content" dangerouslySetInnerHTML={{ __html: renderAndReplaceLatex(formatContent(outlineFormData.content)) }} />
                                    ) : (
                                        <p className="outline-preview-empty">Start typing to see markdown formatting.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.updatingOutline}
                        onClick={() => {
                            setShowEditOutlineModal(false);
                            setEditingOutline(null);
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.updatingOutline}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.updatingOutline ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Updating...
                            </>
                        ) : (
                            'Update Outline'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Add Report Modal */}
            <Modal isOpen={showAddReportModal} onClose={loadingStates.addingReport ? undefined : () => setShowAddReportModal(false)}>
                <ModalHeader onClose={loadingStates.addingReport ? undefined : () => setShowAddReportModal(false)}>
                    <h3>Add {project?.type === 'course' ? 'Course' : 'Project'} Report</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, addingReport: true }));
                        try {
                            if (!reportFormData.file || !reportFormData.title) {
                                toast.error('Please fill in all fields');
                                setLoadingStates(prev => ({ ...prev, addingReport: false }));
                                return;
                            }

                            // Validate file type
                            const validTypes = [
                                'application/x-ipynb+json',
                                'application/pdf',
                                'application/msword',
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                'application/vnd.ms-powerpoint',
                                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                            ];
                            const validExtensions = /\.(ipynb|pdf|docx?|pptx?)$/i;
                            
                            if (!validTypes.includes(reportFormData.file.type) && !validExtensions.test(reportFormData.file.name)) {
                                toast.error('Invalid file type. Please upload a .ipynb, .pdf, .doc, .docx, .ppt, or .pptx file.');
                                setLoadingStates(prev => ({ ...prev, addingReport: false }));
                                return;
                            }

                            // Validate file size (10MB max)
                            const fileSizeMB = reportFormData.file.size / 1024 / 1024;
                            if (fileSizeMB > 10) {
                                toast.error('File size exceeds 10MB');
                                setLoadingStates(prev => ({ ...prev, addingReport: false }));
                                return;
                            }

                            // Handle filename with extension
                            let newFileName = reportFormData.title;
                            if (reportFormData.file) {
                                const originalName = reportFormData.file.name;
                                const originalExtension = originalName.split('.').pop();
                                if (!newFileName.includes('.')) {
                                    newFileName = `${newFileName}.${originalExtension}`;
                                } else {
                                    // Replace extension if title already has one
                                    newFileName = `${newFileName.replace(/\.[^/.]+$/, '')}.${originalExtension}`;
                                }
                            }

                            // Upload file to Supabase
                            const { path, url } = await uploadFileToSupabase(reportFormData.file);
                            const fileUrl = url || '';

                            // Save report to Firestore
                            const summariesRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'summaries');
                            await addDoc(summariesRef, {
                                title: newFileName,
                                content: '',
                                fileUrl: fileUrl,
                                filetype: reportFormData.file.type,
                                date: new Date().toISOString(),
                                userId: user.uid
                            });

                            // Send email notification
                            if (project && project.status !== 'completed') {
                                try {
                                    const projectType = project.type === 'course' ? 'course' : 'project';
                                    const subject = `New Weekly Report Added`;
                                    const message = `
                                        <p>
                                            A new ${project.type === 'course' ? 'course' : 'project'} report has been added to the ${project.type === 'course' ? 'course' : 'project'} titled <b>${project.title}</b> by ${userData.name}.
                                        </p>
                                        <p>
                                            You can view the ${project.type === 'course' ? 'course' : 'project'} details and collaborate with your team members here: <a href="${PORTAL_URL}/${projectType}/${projectId}">${project.title}</a>.
                                        </p>
                                    `;
                                    await sendContributorEmail(projectId, projectGroup, subject, message);
                                } catch (error) {
                                    console.error('Error sending report email:', error);
                                }
                            }

                            setShowAddReportModal(false);
                            setReportFormData({ title: '', file: null });
                            await loadSummaries();
                            toast.success('Report added successfully');
                        } catch (error) {
                            console.error('Error adding report:', error);
                            toast.error(error.message || 'Failed to add report');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, addingReport: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="reportName">Report Filename</label>
                            <input 
                                type="text" 
                                id="reportName" 
                                className="form-control"
                                value={reportFormData.title}
                                onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="reportFile">Upload File (Max: 10MB)</label>
                            <input 
                                type="file" 
                                id="reportFile" 
                                accept=".ipynb,.pdf,.doc,.docx,.ppt,.pptx"
                                className="form-control"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setReportFormData({...reportFormData, file: file});
                                        if (!reportFormData.title) {
                                            const name = file.name.replace(/\.[^/.]+$/, '');
                                            setReportFormData({...reportFormData, file: file, title: name});
                                        }
                                    }
                                }}
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.addingReport}
                        onClick={() => setShowAddReportModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.addingReport}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.addingReport ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Adding...
                            </>
                        ) : (
                            'Add Report'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Project Modal */}
            <Modal isOpen={showEditProjectModal} onClose={loadingStates.updatingProject ? undefined : () => {
                setShowEditProjectModal(false);
            }}>
                <ModalHeader onClose={loadingStates.updatingProject ? undefined : () => {
                    setShowEditProjectModal(false);
                }}>
                    <h3>Edit {project?.type === 'course' ? 'Course' : 'Project'}</h3>
                </ModalHeader>
                <ModalBody>
                    <form 
                        id="editProjectForm" 
                        className="form-grid"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            setLoadingStates(prev => ({ ...prev, updatingProject: true }));
                            try {
                                if (!projectFormData.title || !projectFormData.description || !projectFormData.leadId || !projectFormData.startDate || !projectFormData.dueDate) {
                                    toast.error('Please fill in all required fields');
                                    setLoadingStates(prev => ({ ...prev, updatingProject: false }));
                                    return;
                                }

                                const projectData = {
                                    ...projectFormData,
                                    progress: parseInt(projectFormData.progress, 10) || 0,
                                    updatedAt: serverTimestamp()
                                };

                                const projectRef = doc(db, 'groups', projectGroup, 'projects', projectId);
                                const projectSnap = await getDoc(projectRef);
                                const oldProjectData = projectSnap.data();
                                
                                await updateDoc(projectRef, projectData);
                                await updateLead(projectId, projectData.leadId, projectGroup, oldProjectData.leadId);
                                
                                setShowEditProjectModal(false);
                                setProjectFormData({
                                    title: '',
                                    description: '',
                                    leadId: '',
                                    startDate: '',
                                    dueDate: '',
                                    status: 'planning',
                                    type: 'project',
                                    progress: 0,
                                    githubRepo: '',
                                    manuscriptUrl: ''
                                });
                                
                                // Reload project data
                                const updatedProjectRef = doc(db, 'groups', projectGroup, 'projects', projectId);
                                const updatedProjectSnap = await getDoc(updatedProjectRef);
                                if (updatedProjectSnap.exists()) {
                                    const updatedProjectData = updatedProjectSnap.data();
                                    setProject({ id: updatedProjectSnap.id, ...updatedProjectData });
                                    
                                    // Reload lead data if changed
                                    if (updatedProjectData.leadId) {
                                        const newLeadRef = doc(db, 'users', updatedProjectData.leadId);
                                        const newLeadSnap = await getDoc(newLeadRef);
                                        if (newLeadSnap.exists()) {
                                            setLeadData(newLeadSnap.data());
                                        }
                                    }
                                }
                                
                                await loadContributors();
                                toast.success(`${project?.type === 'course' ? 'Course' : 'Project'} updated successfully`);
                            } catch (error) {
                                console.error('Error updating project:', error);
                                toast.error(`Failed to update ${project?.type === 'course' ? 'course' : 'project'}`);
                            } finally {
                                setLoadingStates(prev => ({ ...prev, updatingProject: false }));
                            }
                        }}
                    >
                        <div className="form-group">
                            <label htmlFor="editProjectTitle">{project?.type === 'course' ? 'Course' : 'Project'} Title</label>
                            <input 
                                type="text" 
                                id="editProjectTitle" 
                                className="form-control"
                                value={projectFormData.title}
                                onChange={(e) => setProjectFormData({...projectFormData, title: e.target.value})}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="editProjectDescription">Description</label>
                            <textarea 
                                id="editProjectDescription" 
                                className="form-control"
                                rows="3" 
                                value={projectFormData.description}
                                onChange={(e) => setProjectFormData({...projectFormData, description: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="editProjectLead">{project?.type === 'course' ? 'Course' : 'Project'} Lead</label>
                            <select 
                                id="editProjectLead" 
                                className="form-control"
                                value={projectFormData.leadId}
                                onChange={(e) => setProjectFormData({...projectFormData, leadId: e.target.value})}
                                required
                            >
                                <option value="">Select {project?.type === 'course' ? 'Course' : 'Project'} Lead</option>
                                {projectLeads.map(lead => (
                                    <option key={lead.id} value={lead.id}>
                                        {lead.name} ({lead.group ? lead.group.charAt(0).toUpperCase() + lead.group.slice(1) : 'Unknown'})
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
                                    value={projectFormData.startDate}
                                    onChange={(e) => setProjectFormData({...projectFormData, startDate: e.target.value})}
                                    required 
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="editDueDate">Due Date</label>
                                <input 
                                    type="date" 
                                    id="editDueDate" 
                                    className="form-control"
                                    value={projectFormData.dueDate}
                                    onChange={(e) => setProjectFormData({...projectFormData, dueDate: e.target.value})}
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="editProjectStatus">Status</label>
                                <select 
                                    id="editProjectStatus" 
                                    className="form-control"
                                    value={projectFormData.status}
                                    onChange={(e) => setProjectFormData({...projectFormData, status: e.target.value})}
                                    required
                                >
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="on-hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="editProjectType">Type</label>
                                <select 
                                    id="editProjectType" 
                                    className="form-control"
                                    value={projectFormData.type}
                                    onChange={(e) => setProjectFormData({...projectFormData, type: e.target.value})}
                                    required
                                >
                                    <option value="project">Project</option>
                                    <option value="course">Course</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="editProjectProgress">Progress (%)</label>
                            <input 
                                type="number" 
                                id="editProjectProgress" 
                                className="form-control"
                                max="100" 
                                min="0" 
                                value={projectFormData.progress}
                                onChange={(e) => {
                                    let val = parseInt(e.target.value, 10);
                                    if (val > 100) val = 100;
                                    if (val < 0) val = 0;
                                    setProjectFormData({...projectFormData, progress: val});
                                }}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="editProjectGithubRepo">GitHub Repository (optional)</label>
                            <input 
                                type="url" 
                                id="editProjectGithubRepo" 
                                className="form-control"
                                value={projectFormData.githubRepo}
                                onChange={(e) => setProjectFormData({...projectFormData, githubRepo: e.target.value})}
                                placeholder="https://github.com/ITCPR/repo"
                            />
                        </div>

                        {project?.type === 'project' && (
                            <div className="form-group">
                                <label htmlFor="editProjectManuscriptUrl">Manuscript URL (optional)</label>
                                <input 
                                    type="url" 
                                    id="editProjectManuscriptUrl" 
                                    className="form-control"
                                    value={projectFormData.manuscriptUrl}
                                    onChange={(e) => setProjectFormData({...projectFormData, manuscriptUrl: e.target.value})}
                                    placeholder="https://overleaf.itcpr.org/project/..."
                                />
                            </div>
                        )}
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.updatingProject}
                        onClick={() => {
                            setShowEditProjectModal(false);
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.updatingProject}
                        onClick={() => {
                            const form = document.getElementById('editProjectForm');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.updatingProject ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Updating...
                            </>
                        ) : (
                            `Update ${project?.type === 'course' ? 'Course' : 'Project'}`
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Add Publication Modal */}
            <Modal isOpen={showAddPublicationModal} onClose={loadingStates.addingPublication ? undefined : () => setShowAddPublicationModal(false)}>
                <ModalHeader onClose={loadingStates.addingPublication ? undefined : () => setShowAddPublicationModal(false)}>
                    <h3>Add Publication</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, addingPublication: true }));
                        try {
                            if (!publicationFormData.title || !publicationFormData.type || !publicationFormData.status) {
                                toast.error('Please fill in all required fields');
                                setLoadingStates(prev => ({ ...prev, addingPublication: false }));
                                return;
                            }

                            const publicationsRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'publications');
                            await addDoc(publicationsRef, {
                                ...publicationFormData,
                                createdAt: serverTimestamp(),
                                userId: user.uid
                            });

                            setShowAddPublicationModal(false);
                            setPublicationFormData({
                                title: '',
                                type: 'journal-paper',
                                status: 'draft',
                                authors: '',
                                journalVenue: '',
                                doiUrl: '',
                                submittedDate: '',
                                publishedDate: '',
                                notes: ''
                            });
                            await loadPublications();
                            toast.success('Publication added successfully');
                        } catch (error) {
                            console.error('Error adding publication:', error);
                            toast.error('Failed to add publication');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, addingPublication: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="pubTitle">Title *</label>
                            <input 
                                type="text" 
                                id="pubTitle" 
                                className="form-control"
                                value={publicationFormData.title}
                                onChange={(e) => setPublicationFormData({...publicationFormData, title: e.target.value})}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="pubType">Type *</label>
                                <select 
                                    id="pubType" 
                                    className="form-control"
                                    value={publicationFormData.type}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, type: e.target.value})}
                                    required
                                >
                                    <option value="journal-paper">Journal Paper</option>
                                    <option value="conference-paper">Conference Paper</option>
                                    <option value="poster">Poster</option>
                                    <option value="talk">Talk</option>
                                    <option value="book">Book</option>
                                    <option value="thesis">Thesis</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="pubStatus">Status *</label>
                                <select 
                                    id="pubStatus" 
                                    className="form-control"
                                    value={publicationFormData.status}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, status: e.target.value})}
                                    required
                                >
                                    <option value="draft">Draft</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="under-review">Under Review</option>
                                    <option value="minor-revision">Minor Revision</option>
                                    <option value="major-revision">Major Revision</option>
                                    <option value="revision-submitted">Revision Submitted</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="in-press">In Press</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="pubAuthors">Authors</label>
                            <input 
                                type="text" 
                                id="pubAuthors" 
                                className="form-control"
                                value={publicationFormData.authors}
                                onChange={(e) => setPublicationFormData({...publicationFormData, authors: e.target.value})}
                                placeholder="Author1, Author2, ..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="pubJournalVenue">Journal/Venue</label>
                            <input 
                                type="text" 
                                id="pubJournalVenue" 
                                className="form-control"
                                value={publicationFormData.journalVenue}
                                onChange={(e) => setPublicationFormData({...publicationFormData, journalVenue: e.target.value})}
                                placeholder="Journal or Conference name"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="pubDoiUrl">DOI/URL</label>
                            <input 
                                type="url" 
                                id="pubDoiUrl" 
                                className="form-control"
                                value={publicationFormData.doiUrl}
                                onChange={(e) => setPublicationFormData({...publicationFormData, doiUrl: e.target.value})}
                                placeholder="https://doi.org/10.1234/example"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="pubSubmittedDate">Submitted Date</label>
                                <input 
                                    type="date" 
                                    id="pubSubmittedDate" 
                                    className="form-control"
                                    value={publicationFormData.submittedDate}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, submittedDate: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="pubPublishedDate">Published Date</label>
                                <input 
                                    type="date" 
                                    id="pubPublishedDate" 
                                    className="form-control"
                                    value={publicationFormData.publishedDate}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, publishedDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="pubNotes">Notes</label>
                            <textarea 
                                id="pubNotes" 
                                className="form-control"
                                rows="3" 
                                value={publicationFormData.notes}
                                onChange={(e) => setPublicationFormData({...publicationFormData, notes: e.target.value})}
                                placeholder="Additional notes or comments..."
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.addingPublication}
                        onClick={() => setShowAddPublicationModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.addingPublication}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.addingPublication ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Adding...
                            </>
                        ) : (
                            'Add Publication'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Publication Modal */}
            <Modal isOpen={showEditPublicationModal} onClose={loadingStates.updatingPublication ? undefined : () => {
                setShowEditPublicationModal(false);
                setEditingPublication(null);
            }}>
                <ModalHeader onClose={loadingStates.updatingPublication ? undefined : () => {
                    setShowEditPublicationModal(false);
                    setEditingPublication(null);
                }}>
                    <h3>Edit Publication</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, updatingPublication: true }));
                        try {
                            if (!publicationFormData.title || !publicationFormData.type || !publicationFormData.status) {
                                toast.error('Please fill in all required fields');
                                setLoadingStates(prev => ({ ...prev, updatingPublication: false }));
                                return;
                            }

                            const pubRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'publications', editingPublication.id);
                            await updateDoc(pubRef, {
                                ...publicationFormData,
                                updatedAt: serverTimestamp()
                            });

                            setShowEditPublicationModal(false);
                            setEditingPublication(null);
                            setPublicationFormData({
                                title: '',
                                type: 'journal-paper',
                                status: 'draft',
                                authors: '',
                                journalVenue: '',
                                doiUrl: '',
                                submittedDate: '',
                                publishedDate: '',
                                notes: ''
                            });
                            await loadPublications();
                            toast.success('Publication updated successfully');
                        } catch (error) {
                            console.error('Error updating publication:', error);
                            toast.error('Failed to update publication');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, updatingPublication: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="editPubTitle">Title *</label>
                            <input 
                                type="text" 
                                id="editPubTitle" 
                                className="form-control"
                                value={publicationFormData.title}
                                onChange={(e) => setPublicationFormData({...publicationFormData, title: e.target.value})}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="editPubType">Type *</label>
                                <select 
                                    id="editPubType" 
                                    className="form-control"
                                    value={publicationFormData.type}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, type: e.target.value})}
                                    required
                                >
                                    <option value="journal-paper">Journal Paper</option>
                                    <option value="conference-paper">Conference Paper</option>
                                    <option value="poster">Poster</option>
                                    <option value="talk">Talk</option>
                                    <option value="book">Book</option>
                                    <option value="thesis">Thesis</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="editPubStatus">Status *</label>
                                <select 
                                    id="editPubStatus" 
                                    className="form-control"
                                    value={publicationFormData.status}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, status: e.target.value})}
                                    required
                                >
                                    <option value="draft">Draft</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="under-review">Under Review</option>
                                    <option value="minor-revision">Minor Revision</option>
                                    <option value="major-revision">Major Revision</option>
                                    <option value="revision-submitted">Revision Submitted</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="in-press">In Press</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="editPubAuthors">Authors</label>
                            <input 
                                type="text" 
                                id="editPubAuthors" 
                                className="form-control"
                                value={publicationFormData.authors}
                                onChange={(e) => setPublicationFormData({...publicationFormData, authors: e.target.value})}
                                placeholder="Author1, Author2, ..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="editPubJournalVenue">Journal/Venue</label>
                            <input 
                                type="text" 
                                id="editPubJournalVenue" 
                                className="form-control"
                                value={publicationFormData.journalVenue}
                                onChange={(e) => setPublicationFormData({...publicationFormData, journalVenue: e.target.value})}
                                placeholder="Journal or Conference name"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="editPubDoiUrl">DOI/URL</label>
                            <input 
                                type="url" 
                                id="editPubDoiUrl" 
                                className="form-control"
                                value={publicationFormData.doiUrl}
                                onChange={(e) => setPublicationFormData({...publicationFormData, doiUrl: e.target.value})}
                                placeholder="https://doi.org/10.1234/example"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="editPubSubmittedDate">Submitted Date</label>
                                <input 
                                    type="date" 
                                    id="editPubSubmittedDate" 
                                    className="form-control"
                                    value={publicationFormData.submittedDate}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, submittedDate: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="editPubPublishedDate">Published Date</label>
                                <input 
                                    type="date" 
                                    id="editPubPublishedDate" 
                                    className="form-control"
                                    value={publicationFormData.publishedDate}
                                    onChange={(e) => setPublicationFormData({...publicationFormData, publishedDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="editPubNotes">Notes</label>
                            <textarea 
                                id="editPubNotes" 
                                className="form-control"
                                rows="3" 
                                value={publicationFormData.notes}
                                onChange={(e) => setPublicationFormData({...publicationFormData, notes: e.target.value})}
                                placeholder="Additional notes or comments..."
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.updatingPublication}
                        onClick={() => {
                            setShowEditPublicationModal(false);
                            setEditingPublication(null);
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.updatingPublication}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.updatingPublication ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Updating...
                            </>
                        ) : (
                            'Update Publication'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Add Grade Modal */}
            <Modal isOpen={showAddGradeModal} onClose={loadingStates.addingGrade ? undefined : () => setShowAddGradeModal(false)}>
                <ModalHeader onClose={loadingStates.addingGrade ? undefined : () => setShowAddGradeModal(false)}>
                    <h3>Add Grade</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, addingGrade: true }));
                        try {
                            if (!gradeFormData.studentId || !gradeFormData.rubricId || !gradeFormData.score) {
                                toast.error('Please fill in all required fields');
                                setLoadingStates(prev => ({ ...prev, addingGrade: false }));
                                return;
                            }

                            // Get max score from rubric
                            const rubricDoc = await getDoc(doc(db, 'groups', projectGroup, 'projects', projectId, 'rubrics', gradeFormData.rubricId));
                            const rubricData = rubricDoc.data();
                            const maxScore = rubricData?.maxScore || 100;
                            const score = parseFloat(gradeFormData.score);
                            
                            if (score < 0 || score > maxScore) {
                                toast.error(`Score must be between 0 and ${maxScore}`);
                                setLoadingStates(prev => ({ ...prev, addingGrade: false }));
                                return;
                            }

                            const gradesRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'grades');
                            await addDoc(gradesRef, {
                                studentId: gradeFormData.studentId,
                                rubricId: gradeFormData.rubricId,
                                score: score,
                                maxScore: maxScore,
                                feedback: gradeFormData.feedback || '',
                                instructorId: user.uid,
                                userId: user.uid,
                                createdAt: serverTimestamp()
                            });

                            setShowAddGradeModal(false);
                            setGradeFormData({ studentId: '', rubricId: '', score: '', feedback: '' });
                            await loadGrades();
                            toast.success('Grade added successfully');
                        } catch (error) {
                            console.error('Error adding grade:', error);
                            toast.error('Failed to add grade');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, addingGrade: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="gradeStudent">Student *</label>
                            <select 
                                id="gradeStudent" 
                                className="form-control"
                                value={gradeFormData.studentId}
                                onChange={(e) => setGradeFormData({...gradeFormData, studentId: e.target.value})}
                                required
                            >
                                <option value="">Select a student...</option>
                                {contributors.filter(c => c.role === 'Student').map(student => (
                                    <option key={student.userId} value={student.userId}>
                                        {student.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="gradeRubric">Grading Rubric *</label>
                            <select 
                                id="gradeRubric" 
                                className="form-control"
                                value={gradeFormData.rubricId}
                                onChange={(e) => setGradeFormData({...gradeFormData, rubricId: e.target.value})}
                                required
                            >
                                <option value="">Select a rubric...</option>
                                {rubrics.map(rubric => (
                                    <option key={rubric.id} value={rubric.id}>
                                        {rubric.title} (Max: {rubric.maxScore})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="gradeScore">Score *</label>
                            <input 
                                type="number" 
                                id="gradeScore" 
                                className="form-control"
                                value={gradeFormData.score}
                                onChange={(e) => setGradeFormData({...gradeFormData, score: e.target.value})}
                                step="0.01"
                                min="0"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="gradeFeedback">Feedback</label>
                            <textarea 
                                id="gradeFeedback" 
                                className="form-control"
                                rows="4" 
                                value={gradeFormData.feedback}
                                onChange={(e) => setGradeFormData({...gradeFormData, feedback: e.target.value})}
                                placeholder="Enter feedback for the student..."
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.addingGrade}
                        onClick={() => setShowAddGradeModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.addingGrade}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.addingGrade ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Adding...
                            </>
                        ) : (
                            'Add Grade'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Grade Modal */}
            <Modal isOpen={showEditGradeModal} onClose={loadingStates.updatingGrade ? undefined : () => {
                setShowEditGradeModal(false);
                setEditingGrade(null);
            }}>
                <ModalHeader onClose={loadingStates.updatingGrade ? undefined : () => {
                    setShowEditGradeModal(false);
                    setEditingGrade(null);
                }}>
                    <h3>Edit Grade</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, updatingGrade: true }));
                        try {
                            if (!gradeFormData.studentId || !gradeFormData.rubricId || !gradeFormData.score) {
                                toast.error('Please fill in all required fields');
                                setLoadingStates(prev => ({ ...prev, updatingGrade: false }));
                                return;
                            }

                            // Get max score from rubric
                            const rubricDoc = await getDoc(doc(db, 'groups', projectGroup, 'projects', projectId, 'rubrics', gradeFormData.rubricId));
                            const rubricData = rubricDoc.data();
                            const maxScore = rubricData?.maxScore || 100;
                            const score = parseFloat(gradeFormData.score);
                            
                            if (score < 0 || score > maxScore) {
                                toast.error(`Score must be between 0 and ${maxScore}`);
                                setLoadingStates(prev => ({ ...prev, updatingGrade: false }));
                                return;
                            }

                            const gradeRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'grades', editingGrade.id);
                            await updateDoc(gradeRef, {
                                studentId: gradeFormData.studentId,
                                rubricId: gradeFormData.rubricId,
                                score: score,
                                maxScore: maxScore,
                                feedback: gradeFormData.feedback || '',
                                updatedAt: serverTimestamp()
                            });

                            setShowEditGradeModal(false);
                            setEditingGrade(null);
                            setGradeFormData({ studentId: '', rubricId: '', score: '', feedback: '' });
                            await loadGrades();
                            toast.success('Grade updated successfully');
                        } catch (error) {
                            console.error('Error updating grade:', error);
                            toast.error('Failed to update grade');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, updatingGrade: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="editGradeStudent">Student *</label>
                            <select 
                                id="editGradeStudent" 
                                className="form-control"
                                value={gradeFormData.studentId}
                                onChange={(e) => setGradeFormData({...gradeFormData, studentId: e.target.value})}
                                required
                            >
                                <option value="">Select a student...</option>
                                {contributors.filter(c => c.role === 'Student').map(student => (
                                    <option key={student.userId} value={student.userId}>
                                        {student.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="editGradeRubric">Grading Rubric *</label>
                            <select 
                                id="editGradeRubric" 
                                className="form-control"
                                value={gradeFormData.rubricId}
                                onChange={(e) => setGradeFormData({...gradeFormData, rubricId: e.target.value})}
                                required
                            >
                                <option value="">Select a rubric...</option>
                                {rubrics.map(rubric => (
                                    <option key={rubric.id} value={rubric.id}>
                                        {rubric.title} (Max: {rubric.maxScore})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="editGradeScore">Score *</label>
                            <input 
                                type="number" 
                                id="editGradeScore" 
                                className="form-control"
                                value={gradeFormData.score}
                                onChange={(e) => setGradeFormData({...gradeFormData, score: e.target.value})}
                                step="0.01"
                                min="0"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="editGradeFeedback">Feedback</label>
                            <textarea 
                                id="editGradeFeedback" 
                                className="form-control"
                                rows="4" 
                                value={gradeFormData.feedback}
                                onChange={(e) => setGradeFormData({...gradeFormData, feedback: e.target.value})}
                                placeholder="Enter feedback for the student..."
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.updatingGrade}
                        onClick={() => {
                            setShowEditGradeModal(false);
                            setEditingGrade(null);
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.updatingGrade}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.updatingGrade ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Updating...
                            </>
                        ) : (
                            'Update Grade'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Add Rubric Modal */}
            <Modal isOpen={showAddRubricModal} onClose={loadingStates.addingRubric ? undefined : () => setShowAddRubricModal(false)}>
                <ModalHeader onClose={loadingStates.addingRubric ? undefined : () => setShowAddRubricModal(false)}>
                    <h3>Add Grading Rubric</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, addingRubric: true }));
                        try {
                            if (!rubricFormData.title || !rubricFormData.maxScore) {
                                toast.error('Please fill in all required fields');
                                setLoadingStates(prev => ({ ...prev, addingRubric: false }));
                                return;
                            }

                            const maxScore = parseFloat(rubricFormData.maxScore);
                            if (isNaN(maxScore) || maxScore <= 0) {
                                toast.error('Max score must be a positive number');
                                setLoadingStates(prev => ({ ...prev, addingRubric: false }));
                                return;
                            }

                            const rubricsRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'rubrics');
                            await addDoc(rubricsRef, {
                                title: rubricFormData.title,
                                description: rubricFormData.description || '',
                                maxScore: maxScore,
                                criteria: rubricFormData.criteria || '',
                                userId: user.uid,
                                createdAt: serverTimestamp()
                            });

                            setShowAddRubricModal(false);
                            setRubricFormData({ title: '', description: '', maxScore: '', criteria: '' });
                            await loadRubrics();
                            toast.success('Rubric added successfully');
                        } catch (error) {
                            console.error('Error adding rubric:', error);
                            toast.error('Failed to add rubric');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, addingRubric: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="rubricTitle">Title *</label>
                            <input 
                                type="text" 
                                id="rubricTitle" 
                                className="form-control"
                                value={rubricFormData.title}
                                onChange={(e) => setRubricFormData({...rubricFormData, title: e.target.value})}
                                placeholder="e.g., Assignment 1, Midterm Exam"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="rubricDescription">Description</label>
                            <textarea 
                                id="rubricDescription" 
                                className="form-control"
                                rows="3" 
                                value={rubricFormData.description}
                                onChange={(e) => setRubricFormData({...rubricFormData, description: e.target.value})}
                                placeholder="Brief description of the rubric..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="rubricMaxScore">Maximum Score *</label>
                            <input 
                                type="number" 
                                id="rubricMaxScore" 
                                className="form-control"
                                value={rubricFormData.maxScore}
                                onChange={(e) => setRubricFormData({...rubricFormData, maxScore: e.target.value})}
                                min="1"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="rubricCriteria">Grading Criteria</label>
                            <textarea 
                                id="rubricCriteria" 
                                className="form-control"
                                rows="5" 
                                value={rubricFormData.criteria}
                                onChange={(e) => setRubricFormData({...rubricFormData, criteria: e.target.value})}
                                placeholder="Describe the grading criteria, point breakdown, etc..."
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.addingRubric}
                        onClick={() => setShowAddRubricModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.addingRubric}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.addingRubric ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Adding...
                            </>
                        ) : (
                            'Add Rubric'
                        )}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Rubric Modal */}
            <Modal isOpen={showEditRubricModal} onClose={loadingStates.updatingRubric ? undefined : () => {
                setShowEditRubricModal(false);
                setEditingRubric(null);
            }}>
                <ModalHeader onClose={loadingStates.updatingRubric ? undefined : () => {
                    setShowEditRubricModal(false);
                    setEditingRubric(null);
                }}>
                    <h3>Edit Grading Rubric</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid" onSubmit={async (e) => {
                        e.preventDefault();
                        setLoadingStates(prev => ({ ...prev, updatingRubric: true }));
                        try {
                            if (!rubricFormData.title || !rubricFormData.maxScore) {
                                toast.error('Please fill in all required fields');
                                setLoadingStates(prev => ({ ...prev, updatingRubric: false }));
                                return;
                            }

                            const maxScore = parseFloat(rubricFormData.maxScore);
                            if (isNaN(maxScore) || maxScore <= 0) {
                                toast.error('Max score must be a positive number');
                                setLoadingStates(prev => ({ ...prev, updatingRubric: false }));
                                return;
                            }

                            const rubricRef = doc(db, 'groups', projectGroup, 'projects', projectId, 'rubrics', editingRubric.id);
                            await updateDoc(rubricRef, {
                                title: rubricFormData.title,
                                description: rubricFormData.description || '',
                                maxScore: maxScore,
                                criteria: rubricFormData.criteria || '',
                                updatedAt: serverTimestamp()
                            });

                            setShowEditRubricModal(false);
                            setEditingRubric(null);
                            setRubricFormData({ title: '', description: '', maxScore: '', criteria: '' });
                            await loadRubrics();
                            toast.success('Rubric updated successfully');
                        } catch (error) {
                            console.error('Error updating rubric:', error);
                            toast.error('Failed to update rubric');
                        } finally {
                            setLoadingStates(prev => ({ ...prev, updatingRubric: false }));
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="editRubricTitle">Title *</label>
                            <input 
                                type="text" 
                                id="editRubricTitle" 
                                className="form-control"
                                value={rubricFormData.title}
                                onChange={(e) => setRubricFormData({...rubricFormData, title: e.target.value})}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="editRubricDescription">Description</label>
                            <textarea 
                                id="editRubricDescription" 
                                className="form-control"
                                rows="3" 
                                value={rubricFormData.description}
                                onChange={(e) => setRubricFormData({...rubricFormData, description: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="editRubricMaxScore">Maximum Score *</label>
                            <input 
                                type="number" 
                                id="editRubricMaxScore" 
                                className="form-control"
                                value={rubricFormData.maxScore}
                                onChange={(e) => setRubricFormData({...rubricFormData, maxScore: e.target.value})}
                                min="1"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="editRubricCriteria">Grading Criteria</label>
                            <textarea 
                                id="editRubricCriteria" 
                                className="form-control"
                                rows="5" 
                                value={rubricFormData.criteria}
                                onChange={(e) => setRubricFormData({...rubricFormData, criteria: e.target.value})}
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        disabled={loadingStates.updatingRubric}
                        onClick={() => {
                            setShowEditRubricModal(false);
                            setEditingRubric(null);
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        disabled={loadingStates.updatingRubric}
                        onClick={() => {
                            const form = document.querySelector('.form-grid');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        {loadingStates.updatingRubric ? (
                            <>
                                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                                Updating...
                            </>
                        ) : (
                            'Update Rubric'
                        )}
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

