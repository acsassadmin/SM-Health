import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// --- PAGES ---
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Shifts from './pages/Shifts';
import CareHomes from './pages/CareHomes';
import Rota from './pages/Rota';
import Availability from './pages/Availability';
import Timesheets from './pages/Timesheets';
import Compliance from './pages/Compliance';
import Settings from './pages/Settings';
import LoginForm from './auth/login';
import Sidebar from './components/Sidebar'; 
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
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
                    <Route path="/care-homes" element={<CareHomes />} />
                    <Route path="/shifts" element={<Shifts />} />
                    <Route path="/rota" element={<Rota />} />
                    <Route path="/availability" element={<Availability />} />
                    <Route path="/timesheets" element={<Timesheets />} />
                    <Route path="/compliance" element={<Compliance />} />
                    <Route path="/settings" element={<Settings />} />
                    
                    {/* Catch any unknown internal route and redirect to dashboard */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Box>
              </Box>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;