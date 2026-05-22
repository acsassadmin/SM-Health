import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { 
  Box, AppBar, Toolbar, IconButton, Typography, Drawer, CssBaseline
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { RoleProvider } from './context/RoleContext'; 

// Pages
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
import AddStaff from './pages/AddStaff';

// Components
import Sidebar from './components/Sidebar'; 
import ProtectedRoute from "./components/ProtectedRoute";

const drawerWidth = 260;

function LayoutContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Helper to get page title
  const getPageTitle = (path) => {
    switch(path) {
      case '/dashboard': return 'Dashboard';
      case '/staff': return 'Staff Directory';
      case '/clients': return 'Care Homes';
      case '/shifts': return 'Shifts';
      case '/rota': return 'Rota Calendar';
      case '/availability': return 'Availability';
      case '/timesheets': return 'Timesheets';
      case '/compliance': return 'Compliance';
      case '/settings': return 'Settings';
      case '/add-staff': return 'Add Staff';
      default: return 'SM Heath';
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* --- TOP BAR (APP BAR) --- */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: '#0c1f3f',
          boxShadow: 3
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }} // Hide on Desktop
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontFamily: 'serif' }}>
            {getPageTitle(location.pathname)}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* --- SIDEBAR DRAWER --- */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile Drawer (Temporary) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          <Sidebar onClose={handleDrawerToggle} />
        </Drawer>

        {/* Desktop Drawer (Permanent) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
          open
        >
          <Sidebar />
        </Drawer>
      </Box>

      {/* --- MAIN CONTENT AREA --- */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8, 
          bgcolor: '#f7f9fc',
          minHeight: '100vh'
        }}
      >
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
  );
}

function App() {
  return (
    <RoleProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          
          <Route
            path="/*" 
            element={
              <ProtectedRoute>
                <LayoutContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </RoleProvider>
  );
}

export default App;