import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import LoadingOverlay from './components/LoadingOverlay';
import Layout from './components/Layout';
import './css/style.css';

// Page imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Group from './pages/Group';
import Projects from './pages/Projects';
import Courses from './pages/Courses';
import Project from './pages/Project';
import Meetings from './pages/Meetings';
import People from './pages/People';
import Profile from './pages/Profile';
import Guides from './pages/Guides';
import Guide from './pages/Guide';
import Report from './pages/Report';
import Tools from './pages/Tools';
import Discord from './pages/Discord';
import Privacy from './pages/Privacy';
import Activity from './pages/Activity';
import Calendar from './pages/Calendar';
import NotFound from './pages/NotFound';

// Placeholder components for future implementation
const Meeting = () => <div>Meeting Detail Page</div>;
const Application = () => <div>Application Page</div>;
const Admin = () => <div>Admin Page</div>;
const Manager = () => <div>Manager Page</div>;
const Server = () => <div>Server Page</div>;
const Course = () => <div>Course Page</div>;
const Filter = () => <div>Filter Page</div>;
// Redirect components for query parameter to path parameter conversion
function QueryRedirect({ toPath }) {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    
    if (id) {
        return <Navigate to={`/${toPath}/${id}`} replace />;
    }
    
    // If no id parameter, redirect to the listing page
    const listingPath = toPath === 'course' ? '/courses' : `/${toPath}s`;
    return <Navigate to={listingPath} replace />;
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return <Layout>{children}</Layout>;
}

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <Routes>
            <Route 
                path="/" 
                element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
            />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/group"
                element={
                    <ProtectedRoute>
                        <Group />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects"
                element={
                    <ProtectedRoute>
                        <Projects />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/courses"
                element={
                    <ProtectedRoute>
                        <Courses />
                    </ProtectedRoute>
                }
            />
            {/* Redirect from query parameter to path parameter */}
            <Route
                path="/project"
                element={
                    <ProtectedRoute>
                        <QueryRedirect toPath="project" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/project/:id"
                element={
                    <ProtectedRoute>
                        <Project />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/meetings"
                element={
                    <ProtectedRoute>
                        <Meetings />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/meeting"
                element={
                    <ProtectedRoute>
                        <Meeting />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/people"
                element={
                    <ProtectedRoute>
                        <People />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/guides"
                element={
                    <ProtectedRoute>
                        <Guides />
                    </ProtectedRoute>
                }
            />
            {/* Redirect from query parameter to path parameter */}
            <Route
                path="/guide"
                element={
                    <ProtectedRoute>
                        <QueryRedirect toPath="guide" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/guide/:id"
                element={
                    <ProtectedRoute>
                        <Guide />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/tools"
                element={
                    <ProtectedRoute>
                        <Tools />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/calendar"
                element={
                    <ProtectedRoute>
                        <Calendar />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/report"
                element={
                    <ProtectedRoute>
                        <Report />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/activity"
                element={
                    <ProtectedRoute>
                        <Activity />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/application"
                element={
                    <ProtectedRoute>
                        <Application />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute>
                        <Admin />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager"
                element={
                    <ProtectedRoute>
                        <Manager />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/server"
                element={
                    <ProtectedRoute>
                        <Server />
                    </ProtectedRoute>
                }
            />
            {/* Redirect from query parameter to path parameter */}
            <Route
                path="/course"
                element={
                    <ProtectedRoute>
                        <QueryRedirect toPath="course" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/course/:id"
                element={
                    <ProtectedRoute>
                        <Project />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/discord"
                element={
                    <ProtectedRoute>
                        <Discord />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/privacy"
                element={<Privacy />}
            />
            <Route
                path="/filter"
                element={
                    <ProtectedRoute>
                        <Filter />
                    </ProtectedRoute>
                }
            />
            <Route
                path="*"
                element={
                    <ProtectedRoute>
                        <NotFound />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function App() {
  return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <AppRoutes />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
