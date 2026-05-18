import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Shifts from './pages/Shifts';
import Login from './pages/Login';
import Sidebar from './components/Sidebar'; // We will create this shared component

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar is always visible on the left */}
        <Sidebar />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/shifts" element={<Shifts />} />
            {/* Add other routes here like Clients, Rota, etc. */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;