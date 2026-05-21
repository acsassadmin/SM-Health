import React, { useState, useEffect } from 'react'; // 1. Import useState and useEffect
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Divider, Avatar, Badge, Button 
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, People as PeopleIcon, Business as BusinessIcon, 
  EventNote as EventNoteIcon, CalendarMonth as CalendarMonthIcon, 
  CheckCircle as CheckCircleIcon, AccessTime as AccessTimeIcon, 
  Shield as ShieldIcon, Logout as LogoutIcon , PersonAdd as PersonAddIcon 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient'; 

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 2. State to hold the current user object
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 3. Function to get the initial session
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    getUser();

    // 4. Listen for auth changes (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // 5. Helper to get display name (Check metadata, fallback to email)
  const getDisplayName = () => {
    if (!user) return 'Guest';
    
    // Check if full name exists in user_metadata (set during signup)
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.user_metadata?.name) return user.user_metadata.name;
    
    // Fallback to email address if no name is found
    return user.email;
  };

  // 6. Helper to generate initials for the Avatar
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
    { text: 'Add users', icon: <PersonAddIcon />, path: '/add-staff', section: 'Main' }
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

  const displayName = getDisplayName();

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
          {/* 7. Updated Avatar and Typography to use dynamic data */}
          <Avatar sx={{ bgcolor: '#1a5fba', width: 32, height: 32 }}>
            {getInitials(displayName)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'white', lineHeight: 1.2 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {user?.user_metadata?.role || 'Staff'} {/* Optional: Display role if stored in metadata */}
            </Typography>
          </Box>
        </Box>
        
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