import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Shifts from './pages/Shifts';
import CareHomes from './pages/CareHomes';
import Rota from './pages/Rota';
import Availability from './pages/Availability';
import Timesheets from './pages/Timesheets';
import Compliance from './pages/Compliance';
import Sidebar from './components/Sidebar'; // This line must match your file structure

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/care-homes" element={<CareHomes />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/rota" element={<Rota />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/timesheets" element={<Timesheets />} />
            <Route path="/compliance" element={<Compliance />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;