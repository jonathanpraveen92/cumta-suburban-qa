import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Context Providers
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeModeProvider } from './context/ThemeContext';

// Layout component
import Layout from './components/Layout';

// Page Views
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ObservationList from './pages/ObservationList';
import ObservationForm from './pages/ObservationForm';
import StationsManager from './pages/StationsManager';
import CategoriesManager from './pages/CategoriesManager';
import UsersManager from './pages/UsersManager';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

// Route Guard for logged in users
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Route Guard for administrator only views
const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default function App() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login */}
            <Route path="/login" element={<Login />} />

            {/* Protected General Portal */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/observations" element={<ProtectedRoute><ObservationList /></ProtectedRoute>} />
            <Route path="/submit-observation" element={<ProtectedRoute><ObservationForm /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Protected Admin Console */}
            <Route path="/stations" element={<ProtectedRoute><AdminRoute><StationsManager /></AdminRoute></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><AdminRoute><CategoriesManager /></AdminRoute></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><AdminRoute><UsersManager /></AdminRoute></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><AdminRoute><AuditLogs /></AdminRoute></ProtectedRoute>} />

            {/* Default Route redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeModeProvider>
  );
}
