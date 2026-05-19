import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Divider, Avatar, Badge, Button // Added Button
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, People as PeopleIcon, Business as BusinessIcon, 
  EventNote as EventNoteIcon, CalendarMonth as CalendarMonthIcon, 
  CheckCircle as CheckCircleIcon, AccessTime as AccessTimeIcon, 
  Shield as ShieldIcon, Logout as LogoutIcon // Added Logout Icon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient'; // Import your supabase client

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); // Redirect to login page after logout
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', section: 'Main' },
    { text: 'Staff Directory', icon: <PeopleIcon />, path: '/staff', section: 'Main' },
    { text: 'Care Homes', icon: <BusinessIcon />, path: '/care-homes', section: 'Main' },
    { text: 'Shifts', icon: <EventNoteIcon />, path: '/shifts', section: 'Scheduling', badge: 23 },
    { text: 'Rota Calendar', icon: <CalendarMonthIcon />, path: '/rota', section: 'Scheduling' },
    { text: 'Availability', icon: <CheckCircleIcon />, path: '/availability', section: 'Compliance' },
    { text: 'Timesheets', icon: <AccessTimeIcon />, path: '/timesheets', section: 'Compliance', badge: 8 },
    { text: 'Compliance', icon: <ShieldIcon />, path: '/compliance', section: 'Compliance' },
  ];

  // Group items by section
  const mainItems = menuItems.filter(i => i.section === 'Main');
  const schedulingItems = menuItems.filter(i => i.section === 'Scheduling');
  const complianceItems = menuItems.filter(i => i.section === 'Compliance');

  const renderSection = (title, items) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ px: 3, py: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold', fontSize: 11 }}>
        {title}
      </Typography>
      <List sx={{ py: 0 }}>
        {items.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                minHeight: 40,
                justifyContent: 'initial',
                px: 3,
                mx: 1,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: location.pathname === item.path ? 'primary.main' : 'transparent',
                color: location.pathname === item.path ? 'white' : 'rgba(255,255,255,0.7)',
                '&.Mui-selected': { bgcolor: '#1a5fba' },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center', color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
              {item.badge && (
                <Badge badgeContent={item.badge} color="secondary" sx={{ ml: 'auto' }}>
                  <Box />
                </Badge>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ width: 260, bgcolor: '#0c1f3f', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'serif', fontWeight: 'bold' }}>
          SM Heath
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Staffing Portal
        </Typography>
      </Box>

      {/* Menu Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {renderSection('Main', mainItems)}
        {renderSection('Scheduling', schedulingItems)}
        {renderSection('Compliance', complianceItems)}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#1a5fba', width: 32, height: 32 }}>AU</Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'white', lineHeight: 1.2 }}>Admin User</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Administrator</Typography>
          </Box>
        </Box>
        
        {/* --- ADDED LOGOUT BUTTON --- */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            borderColor: 'rgba(255,255,255,0.3)',
            color: 'rgba(255,255,255,0.8)',
            textTransform: 'none',
            fontSize: '0.875rem',
            '&:hover': {
              borderColor: '#fff',
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );
};

export default Sidebar;