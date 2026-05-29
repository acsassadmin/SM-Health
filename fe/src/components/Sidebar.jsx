import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext'; 
import { 
  Box, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Button, Avatar, InputBase
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, People as PeopleIcon, Business as BusinessIcon, 
  EventNote as EventNoteIcon, CalendarMonth as CalendarMonthIcon, 
  CheckCircle as CheckCircleIcon, AccessTime as AccessTimeIcon, 
  Shield as ShieldIcon, Logout as LogoutIcon,
  Settings as SettingsIcon, Edit as EditIcon, Save as SaveIcon 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient'; 

// Constant ID for tenant settings row
const SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  const { user, userRole } = useRole();
  const isDirector = userRole?.toLowerCase() === 'director';

  // --- Branding States ---
  const [brandName, setBrandName] = useState('SM Health');
  const [portalSubtitle, setPortalSubtitle] = useState('Staffing Portal');
  const [brandIcon, setBrandIcon] = useState(null);
  const [isEditing, setIsEditing] = useState(false); 

  // --- 1. Fetch saved configurations on mount ---
  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('brand_name, portal_subtitle, brand_logo_url')
        .eq('id', SETTINGS_ID) 
        .single();

      if (data && !error) {
        setBrandName(data.brand_name || 'SM Health');
        setPortalSubtitle(data.portal_subtitle || 'Staffing Portal');
        setBrandIcon(data.brand_logo_url);
      } else if (error) {
        console.error("Error fetching settings:", error.message);
      }
    } catch (err) {
      console.error("Fetch exception:", err);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // --- 2. Save configurations and HIDE button on success ---
  const handleSaveBranding = async () => {
    if (!isDirector) return;
    
    console.log("SENDING CLEAN PAYLOAD TO DB...");
    const { data, error } = await supabase
      .from('tenant_settings')
      .update({
        brand_name: brandName,
        portal_subtitle: portalSubtitle,
        brand_logo_url: brandIcon 
      })
      .eq('id', SETTINGS_ID)
      .select();

    if (!error && data && data.length > 0) {
      console.log("DB UPDATE SUCCESSFUL. LOCKED IN:", data);
      setIsEditing(false); // Hides the save button immediately
    } else {
      console.error("Error committing changes to database:", error?.message || "No rows matching ID found");
      alert("Failed to save changes. Verify your internet connection or Row Level Security (RLS) rules.");
    }
  };

  // --- 3. Dynamic Image Compression Component ---
  const handleIconUpload = (event) => {
    const file = event.target.files[0];
    if (file && isDirector) {
      console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          // Create an HTML Canvas element to scale down the image
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 128; // 128px is more than enough for a tiny sidebar logo icon
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert canvas back to lightweight WebP data URL string (Compressed!)
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.7); 
          console.log("Compressed Image Base64 String Ready.");
          
          setBrandIcon(compressedDataUrl);
          setIsEditing(true); 
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = '/login'; 
    }
  };

  const getDisplayName = () => user?.user_metadata?.full_name || user?.email || 'Guest';

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', section: 'Compliance' }
  ];

  const iconColors = {
    '/': '#60a5fa', '/staff': '#34d399', '/clients': '#818cf8', '/shifts': '#fbbf24',
    '/rota': '#22d3ee', '/availability': '#f472b6', '/timesheets': '#a3e635',
    '/compliance': '#f87171', '/settings': '#94a3b8'
  };

  const renderSection = (title, items) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ px: 3, py: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 }}>
        {title}
      </Typography>
      <List sx={{ py: 0 }}>
        {items.map((item) => {
          const isSelected = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => navigate(item.path)}
                sx={{
                  minHeight: 44, px: 2.5, mx: 1, mb: 0.5, borderRadius: 1.5,
                  bgcolor: isSelected ? 'rgba(26, 95, 186, 0.9)' : 'transparent',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                  borderLeft: isSelected ? '4px solid #fff' : '4px solid transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  '& .MuiListItemIcon-root': { color: isSelected ? '#fff' : (iconColors[item.path] || 'rgba(255,255,255,0.7)') }
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14, fontWeight: isSelected ? 600 : 400 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ width: 260, bgcolor: '#0c1f3f', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, boxShadow: '4px 0 24px rgba(0,0,0,0.1)' }}>
      
      {/* Header Panel */}
      <Box sx={{ p: 3.5, borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
        
        {/* Save Button: Only visible to Director when changes are detected */}
        {isDirector && isEditing && (
          <Button 
            size="small"
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            onClick={handleSaveBranding}
            sx={{ 
              position: 'absolute', top: 12, right: 12, fontSize: 11, 
              textTransform: 'none', px: 1.5, py: 0.2, fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(46, 125, 50, 0.3)'
            }}
          >
            Save
          </Button>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, mt: (isDirector && isEditing) ? 2 : 0 }}>
            {/* Editable Logo Unit */}
            <Box 
              onClick={() => isDirector && fileInputRef.current.click()}
              sx={{ 
                width: 32, height: 32, borderRadius: 2, bgcolor: '#1a5fba', 
                cursor: isDirector ? 'pointer' : 'default', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(26,95,186,0.4)', position: 'relative',
                border: (isDirector && !brandIcon) ? '1px dashed rgba(255,255,255,0.4)' : 'none',
                '&:hover .edit-overlay': { opacity: isDirector ? 1 : 0 }
              }}
            >
                {brandIcon ? (
                  <img src={brandIcon} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                      <rect x="9" y="3" width="4" height="16" rx="1.5" fill="#fff"/>
                      <rect x="3" y="9" width="16" height="4" rx="1.5" fill="#fff"/>
                      <circle cx="11" cy="11" r="2.5" fill="rgba(255,255,255,.35)"/>
                  </svg>
                )}
                {isDirector && (
                  <Box className="edit-overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }}>
                    <EditIcon sx={{ fontSize: 14, color: '#fff' }} />
                  </Box>
                )}
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleIconUpload} />
            </Box>

            {/* Editable Brand Title */}
            <InputBase
              value={brandName}
              readOnly={!isDirector}
              onFocus={() => isDirector && setIsEditing(true)}
              onChange={(e) => setBrandName(e.target.value)}
              sx={{ 
                color: 'white', fontFamily:'DM Sans', fontWeight: 700, fontSize: 18, width: '100%',
                '& .MuiInputBase-input': { p: 0, cursor: isDirector ? 'text' : 'default' }
              }}
            />
        </Box>

        {/* Editable Subtitle */}
        <InputBase
          value={portalSubtitle}
          readOnly={!isDirector}
          onFocus={() => isDirector && setIsEditing(true)}
          onChange={(e) => setPortalSubtitle(e.target.value)}
          sx={{ 
            color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10, ml: 1, width: 'calc(100% - 8px)',
            '& .MuiInputBase-input': { p: 0, cursor: isDirector ? 'text' : 'default' }
          }}
        />
      </Box>

      {/* Nav Content sections */}                
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {renderSection('Main', menuItems.filter(i => i.section === 'Main'))}
        {renderSection('Scheduling', menuItems.filter(i => i.section === 'Scheduling'))}
        {renderSection('Compliance', menuItems.filter(i => i.section === 'Compliance'))}
      </Box>

      {/* Footer Profile Unit */}
      <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          <Avatar sx={{ bgcolor: '#1a5fba', width: 36, height: 36, border: '2px solid rgba(255,255,255,0.2)', fontWeight: 'bold', fontSize: 14 }}>
            {getInitials(getDisplayName())}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
              {getDisplayName()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
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
            borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', textTransform: 'none', fontSize: '0.85rem', py: 1, borderRadius: 1.5,
            '&:hover': { borderColor: '#ef4444', color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.05)' }
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );
};

export default Sidebar;