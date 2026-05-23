import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext'; // Import your hook cleanly
import { 
  Box, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Button, Avatar 
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, People as PeopleIcon, Business as BusinessIcon, 
  EventNote as EventNoteIcon, CalendarMonth as CalendarMonthIcon, 
  CheckCircle as CheckCircleIcon, AccessTime as AccessTimeIcon, 
  Shield as ShieldIcon, Logout as LogoutIcon , PersonAdd as PersonAddIcon,
  Settings as SettingsIcon 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient'; 

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Consume your centralized role details
  const { user, userRole } = useRole();
  console.log("userrole",userRole)

  const getDisplayName = () => {
    if (!user) return 'Guest';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.user_metadata?.name) return user.user_metadata.name;
    return user.email;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); 
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', section: 'Main' },
    { text: 'Staff Directory', icon: <PeopleIcon />, path: '/staff', section: 'Main' },
    { text: 'Clients', icon: <BusinessIcon />, path: '/clients', section: 'Main' },
    { text: 'Shifts', icon: <EventNoteIcon />, path: '/shifts', section: 'Scheduling'},
    { text: 'Rota Calendar', icon: <CalendarMonthIcon />, path: '/rota', section: 'Scheduling' },
    { text: 'Availability', icon: <CheckCircleIcon />, path: '/availability', section: 'Compliance' },
    { text: 'Timesheets', icon: <AccessTimeIcon />, path: '/timesheets', section: 'Compliance' },
    { text: 'Compliance', icon: <ShieldIcon />, path: '/compliance', section: 'Compliance' },
    { text: 'Add users', icon: <PersonAddIcon />, path: '/add-staff', section: 'Main' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', section: 'Compliance' }
  ];

  const iconColors = {
    '/': '#60a5fa',
    '/staff': '#34d399',
    '/clients': '#818cf8',
    '/shifts': '#fbbf24',
    '/rota': '#22d3ee',
    '/availability': '#f472b6',
    '/timesheets': '#a3e635',
    '/compliance': '#f87171',
    '/add-staff': '#8b5cf6',
    '/settings': '#94a3b8'
  };

  const mainItems = menuItems.filter(i => i.section === 'Main');
  const schedulingItems = menuItems.filter(i => i.section === 'Scheduling');
  const complianceItems = menuItems.filter(i => i.section === 'Compliance');

  const renderSection = (title, items) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ px: 3, py: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 }}>
        {title}
      </Typography>
      <List sx={{ py: 0 }}>
        {items.map((item) => {
          const isSelected = location.pathname === item.path;
          const iconColor = isSelected ? '#fff' : (iconColors[item.path] || 'rgba(255,255,255,0.7)');
          
          return (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => navigate(item.path)}
                sx={{
                  minHeight: 44,
                  justifyContent: 'initial',
                  px: 2.5,
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 1.5,
                  bgcolor: isSelected ? 'rgba(26, 95, 186, 0.9)' : 'transparent',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s ease-in-out',
                  borderLeft: isSelected ? '4px solid #fff' : '4px solid transparent',
                  '&:hover': { 
                    bgcolor: isSelected ? 'rgba(26, 95, 186, 1)' : 'rgba(255,255,255,0.08)' 
                  },
                  '& .MuiListItemIcon-root': {
                    color: iconColor
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontSize: 14, 
                    fontWeight: isSelected ? 600 : 400
                  }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  const displayName = getDisplayName();

  return (
    <Box sx={{ width: 260, bgcolor: '#0c1f3f', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, boxShadow: '4px 0 24px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <Box sx={{ p: 3.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ 
                width: 32, height: 32, borderRadius: 2, 
                bgcolor: '#1a5fba', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(26,95,186,0.4)'
            }}>
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                    <rect x="9" y="3" width="4" height="16" rx="1.5" fill="#fff"/>
                    <rect x="3" y="9" width="16" height="4" rx="1.5" fill="#fff"/>
                    <circle cx="11" cy="11" r="2.5" fill="rgba(255,255,255,.35)"/>
                </svg>
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'serif', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>
                SM Heath
            </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10, ml: 1 }}>
            Staffing Portal
        </Typography>
      </Box>

      {/* Menu Items */}                
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2, scrollbarWidth: 'thin', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: 4 } }}>
        {renderSection('Main', mainItems)}
        {renderSection('Scheduling', schedulingItems)}
        {renderSection('Compliance', complianceItems)}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          <Avatar sx={{ 
            bgcolor: '#1a5fba', 
            width: 36, height: 36, 
            border: '2px solid rgba(255,255,255,0.2)',
            fontWeight: 'bold', fontSize: 14
          }}>
            {getInitials(displayName)}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
              {/* ✅ Dynamically reads from your Supabase DB tables now! */}
              {userRole || 'Loading...'} 
            </Typography>
          </Box>
        </Box>
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'none',
            fontSize: '0.85rem',
            py: 1,
            borderRadius: 1.5,
            transition: '0.2s',
            '&:hover': {
              borderColor: '#ef4444',
              color: '#ef4444',
              bgcolor: 'rgba(239, 68, 68, 0.05)'
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