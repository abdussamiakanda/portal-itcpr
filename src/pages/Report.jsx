import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, getDoc, where, serverTimestamp } from 'firebase/firestore';
import { capitalize } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import '../css/guides.css';
import '../css/dashboard.css';
import '../css/projects.css';
import '../css/modal.css';

function getInternshipPeriod() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const periods = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    return `${periods[month]}, ${year}`;
}

export default function Report() {
    const { userData } = useAuth();
    const toast = useToast();
    
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allowReport, setAllowReport] = useState(false);
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [viewingReport, setViewingReport] = useState(null);
    const [deletingReport, setDeletingReport] = useState(null);
    
    // Form states
    const [reportFormData, setReportFormData] = useState({
        workSummary: '',
        tasksCompleted: '',
        skillsTools: '',
        challenges: '',
        nextMonthPlan: '',
        timeCommitment: '',
        selfAssessment: '',
        additionalComments: ''
    });
    
    // Loading states
    const [loadingStates, setLoadingStates] = useState({
        submitting: false,
        deleting: false
    });

    const getAllReports = async () => {
        try {
            const reportsRef = collection(db, 'evaluations');
            let q;
            if (userData?.position === 'staff') {
                q = query(reportsRef, orderBy('createdAt', 'desc'));
            } else {
                q = query(reportsRef, orderBy('createdAt', 'desc'), where('uid', '==', auth.currentUser.uid));
            }
            const reportsSnap = await getDocs(q);
            return reportsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting reports:', error);
            return [];
        }
    };

    const getAllUsers = async () => {
        try {
            const allUsersRef = collection(db, 'users');
            let allUsersQuery;
            if (userData?.position === 'staff') {
                allUsersQuery = query(allUsersRef, orderBy('name'));
            } else {
                allUsersQuery = query(allUsersRef, where('uid', '==', auth.currentUser.uid), orderBy('name'));
            }
            const allUsersSnap = await getDocs(allUsersQuery);
            return allUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    };

    const checkReportStatus = async () => {
        const reports = await getAllReports();
        const now = new Date();
        const day = now.getDate();

        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        if (day < 21 || day > lastDay) {
            return false;
        }

        const currentPeriod = getInternshipPeriod();

        const alreadySubmitted = reports.some(r => 
            typeof r.title === 'string' && r.title.includes(currentPeriod) && r.uid === auth.currentUser.uid
        );

        return !alreadySubmitted;
    };

    const loadReports = async () => {
        setLoading(true);
        try {
            const [reportsList, usersList, allowRep] = await Promise.all([
                getAllReports(),
                getAllUsers(),
                checkReportStatus()
            ]);
            
            setReports(reportsList);
            setAllUsers(usersList);
            setAllowReport(allowRep);
        } catch (error) {
            console.error('Error loading reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, [userData]);

    const handleCreateReport = () => {
        setReportFormData({
            workSummary: '',
            tasksCompleted: '',
            skillsTools: '',
            challenges: '',
            nextMonthPlan: '',
            timeCommitment: '',
            selfAssessment: '',
            additionalComments: ''
        });
        setShowCreateModal(true);
    };

    const handleSubmitReport = async () => {
        // Validate required fields
        const requiredFields = ['workSummary', 'tasksCompleted', 'timeCommitment', 'selfAssessment'];
        for (const field of requiredFields) {
            if (!reportFormData[field]) {
                toast.error(`Please fill out the ${field} field.`);
                return;
            }
        }

        setLoadingStates(prev => ({ ...prev, submitting: true }));

        try {
            const period = getInternshipPeriod();

            const reportData = {
                uid: auth.currentUser.uid,
                name: userData.name,
                group: userData.group,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                title: `Monthly Report (${period})`,

                workSummary: reportFormData.workSummary,
                tasksCompleted: reportFormData.tasksCompleted,
                skillsTools: reportFormData.skillsTools,
                challenges: reportFormData.challenges,
                nextMonthPlan: reportFormData.nextMonthPlan,
                timeCommitment: reportFormData.timeCommitment,
                selfAssessment: reportFormData.selfAssessment,
                additionalComments: reportFormData.additionalComments
            };

            const reportsRef = collection(db, 'evaluations');
            const reportDoc = await addDoc(reportsRef, reportData);

            // Track gamification
            try {
                const { trackEvaluationSubmit } = await import('../utils/gamification');
                await trackEvaluationSubmit(reportDoc.id);
            } catch (error) {
                console.error('Error tracking report submission:', error);
            }

            toast.success('Report submitted successfully');
            setShowCreateModal(false);
            await loadReports();
        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error('Failed to submit report');
        } finally {
            setLoadingStates(prev => ({ ...prev, submitting: false }));
        }
    };

    const handleViewReport = async (reportId) => {
        try {
            const reportRef = doc(db, 'evaluations', reportId);
            const reportSnap = await getDoc(reportRef);

            if (!reportSnap.exists()) {
                toast.error('Report not found');
                return;
            }

            setViewingReport({
                id: reportSnap.id,
                ...reportSnap.data()
            });
            setShowViewModal(true);
        } catch (error) {
            console.error('Error viewing report:', error);
            toast.error('Failed to load report');
        }
    };

    const handleDeleteReport = (reportId) => {
        setDeletingReport(reportId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteReport = async () => {
        if (!deletingReport) return;

        setLoadingStates(prev => ({ ...prev, deleting: true }));

        try {
            const reportRef = doc(db, 'evaluations', deletingReport);
            await deleteDoc(reportRef);

            toast.success('Report deleted successfully');
            setShowDeleteConfirm(false);
            setDeletingReport(null);
            await loadReports();
        } catch (error) {
            console.error('Error deleting report:', error);
            toast.error('Failed to delete report');
        } finally {
            setLoadingStates(prev => ({ ...prev, deleting: false }));
        }
    };

    // Group reports by user
    const usersWithReports = allUsers
        .filter(user => user.role === 'intern')
        .map(user => {
            const userReports = reports.filter(report => report.uid === user.id);
            return {
                user,
                reports: userReports.sort((a, b) => {
                    // Sort by createdAt descending (newest first)
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return bTime - aTime;
                })
            };
        })
        .filter(item => item.reports.length > 0);

    const isLoading = Object.values(loadingStates).some(state => state);

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Reports</h2>
                    <p className="text-medium">Submit and review your monthly reports.</p>
                </div>
                {allowReport && userData?.role === 'intern' && (
                    <button 
                        className="btn btn-primary" 
                        onClick={handleCreateReport}
                        disabled={isLoading}
                    >
                        <span className="material-icons">add</span>
                        Submit Report
                    </button>
                )}
                {allowReport && userData?.position === 'staff' && (
                    <div className="reports-status" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 'var(--spacing-xs)',
                        color: 'var(--success)',
                        fontWeight: 500
                    }}>
                        <span className="material-icons">check_circle</span>
                        Accepting Reports
                    </div>
                )}
                {!allowReport && (
                    <div className="report-text-danger" style={{ 
                        color: 'var(--error)',
                        fontWeight: 500
                    }}>
                        Submit: 21st - end of month
                    </div>
                )}
            </div>

            {/* Reports Grid */}
            <div className="guides-grid">
                {usersWithReports.length > 0 ? (
                    usersWithReports.map(({ user, reports: userReports }) => (
                        <div key={user.id} className="guide-card report-card">
                            <div className="guide-header">
                                <h3>
                                    <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '8px' }}>person</span>
                                    {user.name} {userData?.position === 'staff' ? `(${capitalize(user.group)})` : ''}
                                </h3>
                            </div>
                            <div className="report-list">
                                {userReports.map(report => (
                                    <div key={report.id} className="report-item">
                                        <div className="report-item-header">
                                            <div className="report-item-title">
                                                {(() => {
                                                    if (!report.title) return 'Monthly Report';
                                                    // Extract date from title like "Internship Evaluation (July, 2025)" -> "July, 2025"
                                                    const match = report.title.match(/\(([^)]+)\)/);
                                                    return match ? match[1] : report.title;
                                                })()}
                                            </div>
                                            <div className="guide-actions">
                                                <button 
                                                    className="btn btn-outline btn-sm view-guide" 
                                                    onClick={() => handleViewReport(report.id)}
                                                    disabled={isLoading}
                                                    title="View"
                                                >
                                                    <span className="material-icons">visibility</span>
                                                </button>
                                                {userData?.type === 'admin' && (
                                                    <button 
                                                        className="btn btn-outline btn-sm btn-danger" 
                                                        onClick={() => handleDeleteReport(report.id)}
                                                        disabled={isLoading}
                                                        title="Delete"
                                                    >
                                                        <span className="material-icons">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <span className="material-icons">article</span>
                        <p>No reports found</p>
                    </div>
                )}
            </div>

            {/* Create Report Modal */}
            <Modal 
                isOpen={showCreateModal}
                onClose={() => !loadingStates.submitting && setShowCreateModal(false)}
                size="full"
            >
                <ModalHeader onClose={() => !loadingStates.submitting && setShowCreateModal(false)}>
                    <h3>Monthly Report Form</h3>
                </ModalHeader>
                <ModalBody>
                    <form className="form-grid">
                        <div className="form-group">
                            <label htmlFor="workSummary">
                                1. Work Summary (3–5 lines)
                                <span className="text-medium" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'normal', marginTop: '4px' }}>
                                    Briefly describe what you worked on this month.
                                </span>
                            </label>
                            <textarea 
                                id="workSummary" 
                                rows="5"
                                value={reportFormData.workSummary}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, workSummary: e.target.value }))}
                                disabled={loadingStates.submitting}
                                required
                                placeholder="Describe your work this month..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="tasksCompleted">2. Tasks Completed</label>
                            <textarea 
                                id="tasksCompleted" 
                                rows="4"
                                value={reportFormData.tasksCompleted}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, tasksCompleted: e.target.value }))}
                                disabled={loadingStates.submitting}
                                required
                                placeholder="List the tasks you completed..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="skillsTools">
                                3. Skills / Tools Used or Learned
                                <span className="text-medium" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'normal', marginTop: '4px' }}>
                                    (e.g., LaTeX, Python, simulation, literature review)
                                </span>
                            </label>
                            <textarea 
                                id="skillsTools" 
                                rows="3"
                                value={reportFormData.skillsTools}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, skillsTools: e.target.value }))}
                                disabled={loadingStates.submitting}
                                placeholder="List skills or tools you used or learned..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="challenges">
                                4. Challenges Faced (1–2 lines)
                                <span className="text-medium" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'normal', marginTop: '4px' }}>
                                    Mention any difficulties or blockers.
                                </span>
                            </label>
                            <textarea 
                                id="challenges" 
                                rows="2"
                                value={reportFormData.challenges}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, challenges: e.target.value }))}
                                disabled={loadingStates.submitting}
                                placeholder="Describe any challenges you faced..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="nextMonthPlan">
                                5. Next Month Plan (2–3 points)
                            </label>
                            <textarea 
                                id="nextMonthPlan" 
                                rows="3"
                                value={reportFormData.nextMonthPlan}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, nextMonthPlan: e.target.value }))}
                                disabled={loadingStates.submitting}
                                placeholder="Outline your plans for next month..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="timeCommitment">
                                6. Time Commitment
                                <span className="text-medium" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'normal', marginTop: '4px' }}>
                                    Average hours per week: ___
                                </span>
                            </label>
                            <input 
                                type="number" 
                                id="timeCommitment" 
                                min="0"
                                step="0.5"
                                value={reportFormData.timeCommitment}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, timeCommitment: e.target.value }))}
                                disabled={loadingStates.submitting}
                                required
                                placeholder="Enter average hours per week"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="selfAssessment">
                                7. Self-Assessment
                            </label>
                            <select 
                                id="selfAssessment" 
                                value={reportFormData.selfAssessment}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, selfAssessment: e.target.value }))}
                                disabled={loadingStates.submitting}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Very Active">Very Active</option>
                                <option value="Active">Active</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="additionalComments">
                                Additional Comments (optional)
                            </label>
                            <textarea 
                                id="additionalComments" 
                                rows="3"
                                value={reportFormData.additionalComments}
                                onChange={(e) => setReportFormData(prev => ({ ...prev, additionalComments: e.target.value }))}
                                disabled={loadingStates.submitting}
                                placeholder="Any additional comments..."
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => setShowCreateModal(false)}
                        disabled={loadingStates.submitting}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSubmitReport}
                        disabled={loadingStates.submitting}
                    >
                        {loadingStates.submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </ModalFooter>
            </Modal>

            {/* View Report Modal */}
            {viewingReport && (
                <Modal 
                    isOpen={showViewModal}
                    onClose={() => setShowViewModal(false)}
                >
                    <ModalHeader onClose={() => setShowViewModal(false)}>
                        <h3>{viewingReport.title}</h3>
                    </ModalHeader>
                    <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <h4>Personal Info</h4>
                        <p><strong>Name:</strong> {viewingReport.name || '-'}</p>
                        <p><strong>Group:</strong> {capitalize(viewingReport.group) || '-'}</p>
                        {viewingReport.createdAt && (
                            <p>
                                <strong>Submitted:</strong> {viewingReport.createdAt?.toDate 
                                    ? new Date(viewingReport.createdAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                    : new Date(viewingReport.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                }
                            </p>
                        )}

                        <h4>Report Details</h4>
                        <p><strong>1. Work Summary:</strong><br/>{viewingReport.workSummary || '-'}</p>
                        <p><strong>2. Tasks Completed:</strong><br/>{viewingReport.tasksCompleted || '-'}</p>
                        <p><strong>3. Skills / Tools Used or Learned:</strong><br/>{viewingReport.skillsTools || '-'}</p>
                        <p><strong>4. Challenges Faced:</strong><br/>{viewingReport.challenges || '-'}</p>
                        <p><strong>5. Next Month Plan:</strong><br/>{viewingReport.nextMonthPlan || '-'}</p>
                        <p><strong>6. Time Commitment:</strong> {viewingReport.timeCommitment ? `${viewingReport.timeCommitment} hours/week` : '-'}</p>
                        <p><strong>7. Self-Assessment:</strong> {viewingReport.selfAssessment || '-'}</p>
                        {viewingReport.additionalComments && (
                            <p><strong>Additional Comments:</strong><br/>{viewingReport.additionalComments}</p>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => setShowViewModal(false)}
                        >
                            Close
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeletingReport(null);
                }}
                title="Delete Report"
                message="Are you sure you want to delete this report?"
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDeleteReport}
                variant="danger"
            />
        </div>
    );
}
