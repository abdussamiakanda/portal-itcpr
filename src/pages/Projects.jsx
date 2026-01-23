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

export default function Projects() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [projectLeads, setProjectLeads] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        githubRepo: '',
        manuscriptUrl: '',
        leadId: '',
        startDate: '',
        dueDate: '',
        status: 'planning',
        type: 'project',
        progress: 0
    });
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const loadProjects = async () => {
        if (!user || !userData) return;
        
        setLoading(true);
        try {
            const groupsRef = collection(db, 'groups');
            const groupsSnap = await getDocs(groupsRef);
            
            let allProjects = [];
            
            for (const groupDoc of groupsSnap.docs) {
                const projectsRef = collection(db, 'groups', groupDoc.id, 'projects');
                const projectsSnap = await getDocs(projectsRef);
                
                // Filter to only include projects (not courses)
                const groupProjects = projectsSnap.docs
                    .filter(doc => doc.data().type !== 'course')
                    .map(doc => ({
                        id: doc.id,
                        groupId: groupDoc.id,
                        groupName: groupDoc.id, // Store group name (groupId is the group name)
                        ...doc.data()
                    }));
                
                allProjects = allProjects.concat(groupProjects);
            }

            // Check which projects user is contributor to
            const projectsWithContributorStatus = await Promise.all(
                allProjects.map(async (project) => {
                    const contributorsRef = collection(db, 'groups', project.groupId, 'projects', project.id, 'contributors');
                    const contributorsSnap = await getDocs(contributorsRef);
                    const isContributor = contributorsSnap.docs.some(doc => doc.data().userId === user.uid);
                    const contributorCount = contributorsSnap.docs.length;
                    
                    // Get publications count (only for projects, not courses)
                    let publicationCount = 0;
                    if (project.type === 'project') {
                        try {
                            const publicationsRef = collection(db, 'groups', project.groupId, 'projects', project.id, 'publications');
                            const publicationsSnap = await getDocs(publicationsRef);
                            publicationCount = publicationsSnap.docs.length;
                        } catch (err) {
                            console.error('Error fetching publications:', err);
                        }
                    }
                    
                    // Get lead data
                    let leadData = { name: 'Unknown' };
                    if (project.leadId) {
                        try {
                            const leadRef = doc(db, 'users', project.leadId);
                            const leadSnap = await getDoc(leadRef);
                            if (leadSnap.exists()) {
                                leadData = leadSnap.data();
                            }
                        } catch (err) {
                            console.error('Error fetching lead user:', err);
                        }
                    }

                    return {
                        ...project,
                        isContributor,
                        contributorCount,
                        publicationCount,
                        leadData,
                        canView: isContributor || 
                                userData.role === 'lead' || 
                                userData.type === 'admin' || 
                                userData.type === 'manager' || 
                                project.status !== 'planning' ||
                                userData.position === 'staff'
                    };
                })
            );

            // Sort projects: status first, then isContributor within each status, then date
            const statusOrder = {
                'active': 1,
                'planning': 2,
                'on-hold': 3,
                'completed': 4
            };
            
            projectsWithContributorStatus.sort((a, b) => {
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
                    console.error('Error sorting projects:', error);
                    return 0;
                }
            });

            setProjects(projectsWithContributorStatus);
            setFilteredProjects(projectsWithContributorStatus);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, [user, userData]);

    useEffect(() => {
        async function loadLeads() {
            if (!showNewProjectModal && !showEditProjectModal) return;
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
    }, [showNewProjectModal, showEditProjectModal]);

    const handleEditProject = async (projectId, groupId) => {
        try {
            const projectRef = doc(db, 'groups', groupId, 'projects', projectId);
            const projectSnap = await getDoc(projectRef);
            if (projectSnap.exists()) {
                const projectData = projectSnap.data();
                setEditingProject({ id: projectId, groupId, ...projectData });
                setFormData({
                    title: projectData.title || '',
                    description: projectData.description || '',
                    githubRepo: projectData.githubRepo || '',
                    manuscriptUrl: projectData.manuscriptUrl || '',
                    leadId: projectData.leadId || '',
                    startDate: projectData.startDate || '',
                    dueDate: projectData.dueDate || '',
                    status: projectData.status || 'planning',
                    type: projectData.type || 'project',
                    progress: projectData.progress || 0
                });
                setShowEditProjectModal(true);
            }
        } catch (error) {
            console.error('Error loading project:', error);
            toast.error('Failed to load project details');
        }
    };

    const handleDeleteProject = async (projectId, groupId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Project',
            message: 'Are you sure you want to delete this project?',
            onConfirm: async () => {
                try {
                    const projectRef = doc(db, 'groups', groupId, 'projects', projectId);
                    await deleteDoc(projectRef);
                    
                    // Remove project from state instead of reloading
                    setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
                    setFilteredProjects(prevFiltered => prevFiltered.filter(p => p.id !== projectId));
                    
                    toast.success('Project deleted successfully');
                } catch (error) {
                    console.error('Error deleting project:', error);
                    toast.error('Failed to delete project');
                }
            }
        });
    };

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

    useEffect(() => {
        let filtered = projects;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(project => 
                project.title?.toLowerCase().includes(term) ||
                project.description?.toLowerCase().includes(term) ||
                project.leadData?.name?.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        filtered = filtered.filter(project => project.status === statusFilter);

        setFilteredProjects(filtered);
    }, [projects, searchTerm, statusFilter]);

    const canCreateProject = userData?.role === 'lead' || userData?.type === 'admin' || userData?.type === 'manager';

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Research Projects</h2>
                    <p className="text-medium">Manage and track research projects</p>
                </div>
                {canCreateProject && (
                    <button className="btn btn-primary" onClick={() => {
                        setFormData({
                            title: '',
                            description: '',
                            githubRepo: '',
                            manuscriptUrl: '',
                            leadId: '',
                            startDate: '',
                            dueDate: '',
                            status: 'planning',
                            type: 'project',
                            progress: 0
                        });
                        setShowNewProjectModal(true);
                    }}>
                        <span className="material-icons">add</span>
                        New Project
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filters-container">
                <div className="search-bar">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        id="projectSearch" 
                        placeholder="Search projects..."
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
                    {canCreateProject && (
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

            {/* Projects Grid */}
            <div className="projects-page projects-grid">
                {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                            userData={userData}
                            navigate={navigate}
                            onEdit={handleEditProject}
                            onDelete={handleDeleteProject}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <span className="material-icons">science</span>
                        <p>No projects found</p>
                    </div>
                )}
            </div>

            {/* New Project Modal */}
            <Modal isOpen={showNewProjectModal} onClose={() => {
                setFormData({
                    title: '',
                    description: '',
                    githubRepo: '',
                    manuscriptUrl: '',
                    leadId: '',
                    startDate: '',
                    dueDate: '',
                    status: 'planning',
                    type: 'project',
                    progress: 0
                });
                setShowNewProjectModal(false);
            }}>
                <ModalHeader onClose={() => setShowNewProjectModal(false)}>
                    <h3>Add New Project</h3>
                </ModalHeader>
                <ModalBody>
                    <form 
                        id="projectForm" 
                        className="form-grid"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!formData.title || !formData.description || !formData.leadId || !formData.startDate || !formData.dueDate) {
                                toast.error('Please fill in all required fields');
                                return;
                            }

                            try {
                                const projectData = {
                                    ...formData,
                                    progress: parseInt(formData.progress, 10) || 0,
                                    createdAt: serverTimestamp(),
                                    createdBy: user.uid
                                };

                                const projectsRef = collection(db, 'groups', userData.group, 'projects');
                                const projectDoc = await addDoc(projectsRef, projectData);
                                
                                // Track gamification
                                try {
                                    const { trackProjectCreate } = await import('../utils/gamification');
                                    await trackProjectCreate(projectDoc.id);
                                } catch (error) {
                                    console.error('Error tracking project creation:', error);
                                }
                                
                                setShowNewProjectModal(false);
                                setFormData({
                                    title: '',
                                    description: '',
                                    githubRepo: '',
                                    manuscriptUrl: '',
                                    leadId: '',
                                    startDate: '',
                                    dueDate: '',
                                    status: 'planning',
                                    type: 'project',
                                    progress: 0
                                });
                                
                                toast.success('Project created successfully');
                                // Reload projects
                                await loadProjects();
                            } catch (error) {
                                console.error('Error creating project:', error);
                                toast.error('Failed to create project');
                            }
                        }}
                    >
                        <div className="form-group">
                            <label htmlFor="projectTitle">Project Title</label>
                            <input 
                                type="text" 
                                id="projectTitle" 
                                className="form-control"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="projectDescription">Description</label>
                            <textarea 
                                id="projectDescription" 
                                className="form-control"
                                rows="3" 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="projectLead">Project Lead</label>
                            <select 
                                id="projectLead" 
                                className="form-control"
                                value={formData.leadId}
                                onChange={(e) => setFormData({...formData, leadId: e.target.value})}
                                required
                            >
                                <option value="">Select Project Lead</option>
                                {projectLeads.map(lead => (
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
                                <label htmlFor="projectStatus">Status</label>
                                <select 
                                    id="projectStatus" 
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
                                <label htmlFor="projectType">Type</label>
                                <select 
                                    id="projectType" 
                                    className="form-control"
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    required
                                >
                                    <option value="project">Project</option>
                                    <option value="course">Course</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="projectProgress">Progress (%)</label>
                            <input 
                                type="number" 
                                id="projectProgress" 
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

                        <div className="form-group">
                            <label htmlFor="projectGithub">GitHub Repo (optional)</label>
                            <input
                                type="url"
                                id="projectGithub"
                                className="form-control"
                                placeholder="https://github.com/ITCPR/repo"
                                value={formData.githubRepo}
                                onChange={(e) => setFormData({...formData, githubRepo: e.target.value})}
                            />
                        </div>

                        {formData.type === 'project' && (
                            <div className="form-group">
                                <label htmlFor="projectManuscriptUrl">Manuscript URL (optional)</label>
                                <input
                                    type="url"
                                    id="projectManuscriptUrl"
                                    className="form-control"
                                    placeholder="https://overleaf.itcpr.org/project/..."
                                    value={formData.manuscriptUrl}
                                    onChange={(e) => setFormData({...formData, manuscriptUrl: e.target.value})}
                                />
                            </div>
                        )}
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-outline" onClick={() => {
                        setFormData({
                            title: '',
                            description: '',
                            githubRepo: '',
                            manuscriptUrl: '',
                            leadId: '',
                            startDate: '',
                            dueDate: '',
                            status: 'planning',
                            type: 'project',
                            progress: 0
                        });
                        setShowNewProjectModal(false);
                    }}>
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            const form = document.getElementById('projectForm');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        Create Project
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Project Modal */}
            <Modal isOpen={showEditProjectModal} onClose={() => {
                setShowEditProjectModal(false);
                setEditingProject(null);
            }}>
                <ModalHeader onClose={() => {
                    setShowEditProjectModal(false);
                    setEditingProject(null);
                }}>
                    <h3>Edit Project</h3>
                </ModalHeader>
                <ModalBody>
                    <form 
                        id="editProjectForm" 
                        className="form-grid"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!formData.title || !formData.description || !formData.leadId || !formData.startDate || !formData.dueDate) {
                                toast.error('Please fill in all required fields');
                                return;
                            }

                            try {
                                const projectData = {
                                    ...formData,
                                    progress: parseInt(formData.progress, 10) || 0,
                                    updatedAt: serverTimestamp()
                                };

                                const projectRef = doc(db, 'groups', editingProject.groupId, 'projects', editingProject.id);
                                const projectSnap = await getDoc(projectRef);
                                const oldProjectData = projectSnap.data();
                                
                                await updateDoc(projectRef, projectData);
                                await updateLead(editingProject.id, projectData.leadId, editingProject.groupId, oldProjectData.leadId);
                                
                                // Track gamification
                                try {
                                    const { trackProjectUpdate } = await import('../utils/gamification');
                                    await trackProjectUpdate(editingProject.id);
                                } catch (error) {
                                    console.error('Error tracking project update:', error);
                                }
                                
                                setShowEditProjectModal(false);
                                setEditingProject(null);
                                setFormData({
                                    title: '',
                                    description: '',
                                    githubRepo: '',
                                    manuscriptUrl: '',
                                    leadId: '',
                                    startDate: '',
                                    dueDate: '',
                                    status: 'planning',
                                    type: 'project',
                                    progress: 0
                                });
                                
                                toast.success('Project updated successfully');
                                // Reload projects
                                await loadProjects();
                            } catch (error) {
                                console.error('Error updating project:', error);
                                toast.error('Failed to update project');
                            }
                        }}
                    >
                        <div className="form-group">
                            <label htmlFor="editProjectTitle">Project Title</label>
                            <input 
                                type="text" 
                                id="editProjectTitle" 
                                className="form-control"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="editProjectDescription">Description</label>
                            <textarea 
                                id="editProjectDescription" 
                                className="form-control"
                                rows="3" 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="editProjectLead">Project Lead</label>
                            <select 
                                id="editProjectLead" 
                                className="form-control"
                                value={formData.leadId}
                                onChange={(e) => setFormData({...formData, leadId: e.target.value})}
                                required
                            >
                                <option value="">Select Project Lead</option>
                                {projectLeads.map(lead => (
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
                                <label htmlFor="editProjectStatus">Status</label>
                                <select 
                                    id="editProjectStatus" 
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
                                <label htmlFor="editProjectType">Type</label>
                                <select 
                                    id="editProjectType" 
                                    className="form-control"
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
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

                        <div className="form-group">
                            <label htmlFor="editProjectGithub">GitHub Repo (optional)</label>
                            <input
                                type="url"
                                id="editProjectGithub"
                                className="form-control"
                                placeholder="https://github.com/ITCPR/repo"
                                value={formData.githubRepo}
                                onChange={(e) => setFormData({...formData, githubRepo: e.target.value})}
                            />
                        </div>

                        {formData.type === 'project' && (
                            <div className="form-group">
                                <label htmlFor="editProjectManuscriptUrl">Manuscript URL (optional)</label>
                                <input
                                    type="url"
                                    id="editProjectManuscriptUrl"
                                    className="form-control"
                                    placeholder="https://overleaf.itcpr.org/project/..."
                                    value={formData.manuscriptUrl}
                                    onChange={(e) => setFormData({...formData, manuscriptUrl: e.target.value})}
                                />
                            </div>
                        )}
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-outline" onClick={() => {
                        setShowEditProjectModal(false);
                        setEditingProject(null);
                    }}>
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            const form = document.getElementById('editProjectForm');
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                    >
                        Update Project
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
                    {project.type === 'project' && project.publicationCount !== undefined && project.publicationCount > 0 && (
                        <span className="publication-count-badge">
                            <span className="material-icons" style={{ fontSize: '0.875rem', verticalAlign: 'middle', marginRight: '2px' }}>menu_book</span>
                            {project.publicationCount}
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

