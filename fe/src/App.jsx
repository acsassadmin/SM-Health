import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { RoleProvider } from './context/RoleContext'; // <--- 1. Import

// Imports...
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Shifts from './pages/Shifts';
import Clients from './pages/Clients';
import Rota from './pages/Rota';
import Availability from './pages/Availability';
import Timesheets from './pages/Timesheets';
import Compliance from './pages/Compliance';
import Settings from './pages/Settings';
import LoginForm from './auth/login';
import Sidebar from './components/Sidebar'; 
import ProtectedRoute from "./components/ProtectedRoute";
import AddStaff from './pages/AddStaff';

function App() {
  return (
    // <--- 2. WRAP EVERYTHING --->
    <RoleProvider>
      <Router>
        <Routes>
          
          <Route path="/login" element={<LoginForm />} />
          
          <Route
            path="/*" 
            element={
              <ProtectedRoute>
                <Box sx={{ display: 'flex', height: '100vh' }}>
                  <Sidebar />
                  <Box component="main" sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#f7f9fc' }}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/staff" element={<Staff />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/shifts" element={<Shifts />} />
                      <Route path="/rota" element={<Rota />} />
                      <Route path="/availability" element={<Availability />} />
                      <Route path="/timesheets" element={<Timesheets />} />
                      <Route path="/compliance" element={<Compliance />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/add-staff" element={<AddStaff />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Box>
                </Box>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </RoleProvider>
  );
}

export default App;