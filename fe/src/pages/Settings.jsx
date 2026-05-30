import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, Card, CardContent, Grid, TextField,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Divider, Alert, Snackbar, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, Stack,
  alpha, useTheme, List, ListItem, ListItemText, Checkbox, Avatar, styled
} from '@mui/material';
import {
  Person as UserIcon, Shield as RoleIcon, Shield, Badge as CategoryIcon,
  Business as ClientIcon, Business, AccessTime as ShiftIcon, AddCircle as CustomFieldIcon,
  Notifications as NotificationIcon, Lock as SecurityIcon, AccountCircle as AccountCircle,
  Delete as DeleteIcon, Save as SaveIcon, Refresh as RefreshIcon,
  VpnKey, Add as AddIcon, AdminPanelSettings,
  CheckCircle, Cancel, History, Error, WarningAmber // Added icons for modal
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import TwoFactorAuth from "../auth/TwoFactorAuth";

// ─── CUSTOM GRADIENT BUTTON (From Clients.jsx) ───
const GradientButton = styled(Button)(({ theme, colorType = 'success' }) => ({
  background: colorType === 'success'
    ? 'linear-gradient(45deg, #6366f1 30%, #a855f7 90%)'
    : colorType === 'error'
      ? 'linear-gradient(45deg, #ef4444 30%, #b91c1c 90%)'
      : 'linear-gradient(45deg, #f59e0b 30%, #d97706 90%)',
  border: 0,
  borderRadius: 12,
  color: 'white',
  height: 48,
  padding: '0 30px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  fontSize: '16px',
  fontWeight: 600,
  textTransform: 'none',
  '&:hover': {
    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    opacity: 0.95,
  },
}));

const TAB_CONFIG = [
  { label: 'My Account', icon: <AccountCircle fontSize="small" />, minRole: null },
  { label: 'Users', icon: <UserIcon fontSize="small" />, minRole: 'Administrator' }, // Restricted to Admin & Director
  { label: 'Roles', icon: <RoleIcon fontSize="small" />, minRole: 'Administrator' },    // Restricted to Admin & Director
  { label: 'Staff Categories', icon: <CategoryIcon fontSize="small" />, minRole: 'Administrator' },
  { label: 'Client Categories', icon: <ClientIcon fontSize="small" />, minRole: 'Administrator' },
  { label: 'Shift Patterns', icon: <ShiftIcon fontSize="small" />, minRole: 'Administrator' },
  { label: 'Notifications', icon: <NotificationIcon fontSize="small" />, minRole: 'Director' },
];

const roleHierarchy = { 'Staff': 0, 'Administrator': 1, 'Director': 2 };

const Settings = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState('Staff');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // --- MODAL STATES ---
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  
  const [openEditUserModal, setOpenEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '', email: '', roleId: '', temporaryPassword: ''
  });
  
  const [newUserForm, setNewUserForm] = useState({
    name: '', email: '', roleId: '', temporaryPassword: ''
  });

  // --- DATA STATES ---
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [staffCategories, setStaffCategories] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [shiftPatterns, setShiftPatterns] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState([]);
  const [clientCategories, setClientCategories] = useState([]);
  
  // STATE FOR ACTIVITY LOGS
  const [activityLogs, setActivityLogs] = useState([]);

  const [myProfile, setMyProfile] = useState({
    id: '', first_name: '', last_name: '', email: '', role: '', avatar_url: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [newCatName, setNewCatName] = useState('');
  const [newShift, setNewShift] = useState({ name: '', start: '', end: '' });
  const [newField, setNewField] = useState({ label: '', type: 'text', belongsTo: 'staff' });

  // New Role Management State
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: '',
    modules: []
  });

  // --- ATTRACTIVE INFO MODAL STATE (From Clients.jsx) ---
  const [infoModal, setInfoModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'success' // 'success' | 'error' | 'warning'
  });

  const availableModules = [
    { id: 'staff', label: 'Staff' },
    { id: 'clients', label: 'Clients' },
    { id: 'shifts', label: 'Shifts' },
    { id: 'rota', label: 'Rota' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'availability', label: 'Availability' },
    { id: 'timesheets', label: 'Timesheets' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'settings', label: 'Settings' }
  ];

  const triggerToast = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const isDirector = currentUserRole === 'Director';
  const isAdminOrDirector = roleHierarchy[currentUserRole] >= roleHierarchy['Administrator'];

  // ─── COLOR HELPERS ───────────────────────────────────────────
  const getRoleColor = (roleName) => {
    const colors = {
      'Director': '#FF6B00',
      'Administrator': '#7C3AED',
      'Manager': '#2563EB',
      'Staff': '#059669',
      'Supervisor': '#D97706',
    };
    return colors[roleName] || '#6B7280';
  };

  const getRowGradient = (index) => {
    const palettes = [
      'linear-gradient(90deg, rgba(99,102,241,0.04) 0%, rgba(168,85,247,0.04) 100%)',
      'linear-gradient(90deg, rgba(16,185,129,0.04) 0%, rgba(59,130,246,0.04) 100%)',
      'linear-gradient(90deg, rgba(245,158,11,0.04) 0%, rgba(239,68,68,0.04) 100%)',
      'linear-gradient(90deg, rgba(236,72,153,0.04) 0%, rgba(99,102,241,0.04) 100%)',
    ];
    return palettes[index % palettes.length];
  };

  // ─── DATA FETCHING ───────────────────────────────────────────
  useEffect(() => {
    const initializeSettings = async () => {
      setLoading(true);
      await fetchUserRole();
      await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchStaffCategories(),
        fetchCareHomes(),
        fetchShiftPatterns(),
        fetchNotificationSettings(),
        fetchActivityLogs() // Fetch logs on load
      ]);
      setLoading(false);
    };
    initializeSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 0) fetchMyProfile();
    if (activeTab === 6) fetchActivityLogs(); // Refresh logs when tab is opened
  }, [activeTab]);

  const fetchUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let role = 'Staff';
    if (session?.user) {
      const { data: isDir, error: dirError } = await supabase.rpc('is_director');
      if (!dirError && isDir) { role = 'Director'; }
      else {
        const { data } = await supabase.from('user_roles').select('role_id').eq('user_id', session.user.id).single();
        if (data?.role_id) {
          const { data: roleData } = await supabase.from('app_roles').select('name').eq('id', data.role_id).single();
          if (roleData) role = roleData.name;
        }
      }
    }
    setCurrentUserRole(role);
  };

  const fetchMyProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let roleName = currentUserRole;
    const { data: roleData } = await supabase.from('user_roles').select('role_id').eq('user_id', user.id).single();
    if (roleData?.role_id) {
      const { data: nameData } = await supabase.from('app_roles').select('name').eq('id', roleData.role_id).single();
      if (nameData) roleName = nameData.name;
    }

    setMyProfile({
      id: user.id,
      first_name: user.user_metadata?.full_name || '',
      last_name: '',
      email: user.email,
      role: roleName,
      avatar_url: user.user_metadata?.avatar_url || ''
    });
  };
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: authUsers, error: authError } = await supabase.rpc("get_auth_users");
      if (authError) throw authError;

      const formatted = authUsers.map((user) => ({
        id: user.id,
        name: user.display_name || "No Name Set",
        email: user.email || "No email",
        role: user.role_name,
        status: "Active"
      }));

      setUsers(formatted);
    } catch (error) {
      triggerToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase.from('app_roles').select('*').order('id');
    if (!error) setRoles(data);
  };

  const fetchStaffCategories = async () => {
    const { data, error } = await supabase.from('staff_role_categories').select('*').order('sort_order', { ascending: true });
    if (!error) setStaffCategories(data);
  };

  const fetchCareHomes = async () => {
    const { data, error } = await supabase.from('care_homes').select('*');
    if (error) { console.error("Error fetching care homes:", error); return; }
    setCareHomes(data || []);
  };

    const fetchNotificationSettings = async () => {
    try {
      const { data, error } = await supabase.from("notification_settings").select("*").order("id");
      
      if (error && error.code === '404') {
        console.warn("Notification settings table not found. Skipping.");
        setNotificationSettings([]); 
        return;
      }
      
      if (error) throw error;
      setNotificationSettings(data || []);
    } catch (err) {
      setNotificationSettings([]); 
    }
  };
  const fetchShiftPatterns = async () => {
    const { data, error } = await supabase.from('shift_patterns').select('*').order('id');
    if (!error) setShiftPatterns(data);
  };

  // LOGIC TO FETCH ACTIVITY LOGS
  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20); // Limit to last 20 actions

      if (error) {
        console.warn("Activity logs table not found or error:", error.message);
        setActivityLogs([]); 
        return;
      }
      
      setActivityLogs(data || []);
    } catch (err) {
    }
  };

  // ─── EVENT HANDLERS ──────────────────────────────────────────
  const handleOpenAddUserModal = () => {
    setNewUserForm({ name: '', email: '', roleId: '', temporaryPassword: '' });
    setOpenAddUserModal(true);
  };
  const handleCloseAddUserModal = () => setOpenAddUserModal(false);

  const handleCreateUser = async () => {
    const { name, email, roleId, temporaryPassword } = newUserForm;
    
    if (!name || !email || !roleId || !temporaryPassword) { 
      setInfoModal({
        open: true,
        title: "Missing Information",
        message: "All fields are required.",
        type: 'error'
      });
      return;
    }
    if (temporaryPassword.length < 6) {
      setInfoModal({
        open: true,
        title: "Invalid Password",
        message: "Password must be at least 6 characters.",
        type: 'error'
      });
      return;
    }
    
    setLoading(true);
    try {
      const { data: authUsers, error: checkError } = await supabase.rpc("get_auth_users");
      if (checkError) throw checkError;

      const emailExists = authUsers.find(u => u.email === email);
      if (emailExists) {
        throw new Error("A user with this email already exists.");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: temporaryPassword,
        options: { data: { display_name: name, full_name: name } }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
           throw new Error("A user with this email already exists.");
        }
        throw authError;
      }

      if (!authData.user) throw new Error("Failed to create user account.");

      

      if (roleError) {
        throw new Error(`User created, but failed to assign role: ${roleError.message}`);
      }

      setInfoModal({
        open: true,
        title: "User Created!",
        message: `${name} has been added to the system.`,
        type: 'success'
      });
      setOpenAddUserModal(false);
      fetchUsers();
      
    } catch (error) {
      setInfoModal({
        open: true,
        title: "Creation Failed",
        message: error.message || "An unexpected error occurred",
        type: 'error'
      });
    } finally { 
      setLoading(false); 
    }
  };

  const handleOpenEditModal = (user) => {
    const roleId = roles.find(r => r.name === user.role)?.id || '';
    
    setEditingUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      roleId: roleId,
      temporaryPassword: '' 
    });
    setOpenEditUserModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditUserModal(false);
    setEditingUser(null);
  };

      const handleUpdateUser = async () => {
    const { name, email, roleId, temporaryPassword } = editUserForm;
    
    if (!name || !email || !roleId) { 
      setInfoModal({
        open: true,
        title: "Missing Fields",
        message: "Name, Email, and Role are required",
        type: 'error'
      });
      return; 
    }

    setLoading(true);
    try {
      const { data: authUsers } = await supabase.rpc("get_auth_users");
      const emailExists = authUsers.find(u => u.email === email && u.id !== editingUser.id);
      
      if (emailExists) {
        throw new Error("This email is already in use by another user.");
      }

      const { error: updateError } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'updateUser',
          userId: editingUser.id,
          email: email,
          userMetadata: { display_name: name, full_name: name }
        }
      });

      if (updateError) throw updateError;

      // --- FIX START: REMOVED parseInt ---
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role_id: roleId }) // Use ID directly (String)
        .eq('user_id', editingUser.id);
      // --- FIX END ---

      if (roleError) throw roleError;

      // ... rest of your password logic ...
      
      setInfoModal({
        open: true,
        title: "User Updated",
        message: "Details updated successfully.",
        type: 'success'
      });

      setOpenEditUserModal(false);
      fetchUsers();

    } catch (error) {
      console.error("Update Error:", error);
      setInfoModal({
        open: true,
        title: "Update Failed",
        message: error.message || "Update failed",
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!myProfile.first_name) { triggerToast('Name is required', 'error'); return; }
    const { error } = await supabase.auth.updateUser({ data: { full_name: myProfile.first_name } });
    if (error) triggerToast(error.message, 'error');
    else triggerToast('Profile updated successfully');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { triggerToast('New passwords do not match', 'error'); return; }
    if (passwordForm.newPassword.length < 6) { triggerToast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    setLoading(false);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Password changed successfully'); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
  };

  const handleAddStaffCategory = async () => {
    if (!newCatName) return;
    const maxSort = staffCategories.length > 0 ? Math.max(...staffCategories.map(c => c.sort_order || 0)) : 0;
    const { error } = await supabase.from('staff_role_categories').insert([{ name: newCatName, sort_order: maxSort + 1, is_active: true }]);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Category added'); setNewCatName(''); fetchStaffCategories(); }
  };

    const handleDeleteStaffCategory = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    setLoading(true); // Start loading
    try {
      // 1. DELETE FROM DATABASE
      const { error } = await supabase
        .from('staff_role_categories')
        .delete()
        .eq('id', id);

      // 2. CHECK FOR ERRORS
      if (error) {
        throw error; // This jumps to the 'catch' block
      }

      // 3. UPDATE FRONTEND
      setStaffCategories(prev => prev.filter(cat => cat.id !== id));
      
      // 4. SHOW SUCCESS MESSAGE
      setInfoModal({
        open: true,
        title: "Deleted Successfully",
        message: "The category has been permanently removed from the database.",
        type: 'success'
      });

    } catch (error) {
      setInfoModal({
        open: true,
        title: "Delete Failed",
        message: "Could not delete category. Check console for details.",
        type: 'error'
      });
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleAddShiftPattern = async () => {
    if (!newShift.name || !newShift.start || !newShift.end) return;
    const { error } = await supabase.from('shift_patterns').insert([{
      code: newShift.name.substring(0, 3).toUpperCase(), name: newShift.name,
      start_time: newShift.start, end_time: newShift.end, total_hours: 8, break_hours: 0.5
    }]);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Shift saved'); setNewShift({ name: '', start: '', end: '' }); fetchShiftPatterns(); }
  };

  const handleDeleteShiftPattern = async (id) => {
    if (!confirm("Are you sure you want to delete this shift pattern?")) return;

    setLoading(true); // Start loading
    try {
      // 1. DELETE FROM DATABASE
      const { error } = await supabase
        .from('shift_patterns')
        .delete()
        .eq('id', id);

      // 2. CHECK FOR ERRORS
      if (error) {
        throw error; // This jumps to the 'catch' block
      }

      // 3. UPDATE FRONTEND (Only if database delete worked)
      setShiftPatterns(prev => prev.filter(shift => shift.id !== id));
      
      // 4. SHOW SUCCESS MESSAGE
      setInfoModal({
        open: true,
        title: "Deleted Successfully",
        message: "The shift pattern has been permanently removed from the database.",
        type: 'success'
      });

    } catch (error) {
      setInfoModal({
        open: true,
        title: "Delete Failed",
        message: "Could not delete shift pattern. Check console for details.",
        type: 'error'
      });
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleOpenRoleModal = () => {
    setRoleForm({ name: '', modules: [] });
    setOpenRoleModal(true);
  };

  const handleCloseRoleModal = () => {
    setOpenRoleModal(false);
  };

  const handleModuleToggle = (moduleId) => {
    setRoleForm(prev => {
      const currentModules = prev.modules || [];
      if (currentModules.includes(moduleId)) {
        return { ...prev, modules: currentModules.filter(m => m !== moduleId) };
      } else {
        return { ...prev, modules: [...currentModules, moduleId] };
      }
    });
  };

     const handleSaveRole = async () => {
    if (!roleForm.name) {
      triggerToast("Role name is required", "error");
      return;
    }

    const slug = roleForm.name.toLowerCase().replace(/\s+/g, '-');
    const moduleList = roleForm.modules.length > 0 
      ? `Modules: ${roleForm.modules.join(', ')}` 
      : 'No specific modules assigned';
    
    const description = `${moduleList} (Created via Settings)`;

    const { error } = await supabase.from('app_roles').insert([{
      name: roleForm.name,
      slug: slug,
      description: description,
      level: 10 
    }]);

    if (error) {
      triggerToast(error.message, 'error');
    } else {
      triggerToast('Role saved successfully');
      handleCloseRoleModal();
      fetchRoles();
    }
  };

  // ─── COLORFUL TABLE HEAD COMPONENT ───────────────────────────
  const ColorfulTableHead = ({ children, gradient }) => {
    return (
      <TableHead
        sx={{
          background: gradient,
          '& .MuiTableCell-head': {
            color: 'white !important',
            fontWeight: 800,
            fontSize: '0.87rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: 'none',
            backgroundColor: 'transparent !important',
            py: 2
          }
        }}
      >
        {children}
      </TableHead>
    );
  };

  // ─── STATUS CHIP ─────────────────────────────────────────────
  const StatusDot = ({ active, label }) => (
    <Chip
      icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: active ? '#22C55E' : '#9CA3AF', ml: 0.5 }} />}
      label={label || (active ? 'Active' : 'Inactive')}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.72rem',
        bgcolor: active ? alpha('#22C55E', 0.1) : alpha('#9CA3AF', 0.1),
        color: active ? '#16A34A' : '#6B7280',
        border: `1px solid ${active ? alpha('#22C55E', 0.3) : alpha('#9CA3AF', 0.3)}`,
        '& .MuiChip-icon': { mr: 0.5 }
      }}
    />
  );

  // ─── PANEL RENDERERS ─────────────────────────────────────────
  const renderMyAccount = () => {
    const canEditEmail = isDirector || isAdminOrDirector;

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
          }}>
            <AccountCircle />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #4F46E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>My Account Preferences</Typography>
            <Typography variant="body2" color="text.secondary">Manage your profile, security, and preferences</Typography>
          </Box>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card sx={{
              height: '100%', borderRadius: 4, overflow: 'visible',
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid', borderColor: 'divider',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
            }}>
              <Box sx={{
                height: 6, background: 'linear-gradient(90deg, #6366F1, #EC4899, #F59E0B)'
              }} />
              <CardContent sx={{ pt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${getRoleColor(myProfile.role)}, ${getRoleColor(myProfile.role)}dd)`,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 800, mr: 3,
                    boxShadow: `0 8px 25px ${getRoleColor(myProfile.role)}40`
                  }}>
                    {myProfile.first_name ? myProfile.first_name[0] : 'U'}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{myProfile.first_name} {myProfile.last_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{myProfile.email}</Typography>
                    <Chip
                      label={myProfile.role}
                      size="small"
                      sx={{
                        mt: 1, fontWeight: 700, fontSize: '0.7rem',
                        bgcolor: alpha(getRoleColor(myProfile.role), 0.1),
                        color: getRoleColor(myProfile.role),
                        border: `1.5px solid ${getRoleColor(myProfile.role)}40`
                      }}
                    />
                  </Box>
                </Box>
                <Divider sx={{ my: 3, borderStyle: 'dashed' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#4F46E5' }}>Personal Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField fullWidth size="small" label="First Name" value={myProfile.first_name}
                      onChange={(e) => setMyProfile({ ...myProfile, first_name: e.target.value })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth size="small" label="Last Name" value={myProfile.last_name}
                      onChange={(e) => setMyProfile({ ...myProfile, last_name: e.target.value })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Email Address"
                      value={myProfile.email}
                      onChange={(e) => setMyProfile({ ...myProfile, email: e.target.value })}
                      disabled={!canEditEmail}
                      helperText={canEditEmail ? "Update your email address" : "Contact admin to change email"}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: canEditEmail ? 'transparent' : alpha('#000', 0.02) } }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={handleUpdateProfile}
                    sx={{
                      borderRadius: 2, fontWeight: 600, px: 4,
                      background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      boxShadow: '0 4px 15px rgba(79,70,229,0.4)',
                      '&:hover': { boxShadow: '0 6px 20px rgba(79,70,229,0.6)', transform: 'translateY(-1px)' },
                      transition: 'all 0.2s'
                    }}>
                    Update Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Card sx={{
                borderRadius: 4, overflow: 'visible',
                border: '1px solid', borderColor: 'divider',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
              }}>
                <Box sx={{ height: 6, background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }} />
                <CardContent sx={{ pt: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 2,
                      background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', boxShadow: '0 4px 12px rgba(245,158,11,0.4)'
                    }}>
                      <VpnKey sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Change Password</Typography>
                  </Box>
                  <Box component="form" onSubmit={handlePasswordChange}>
                    <TextField fullWidth size="small" type="password" label="New Password" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
                    <TextField fullWidth size="small" type="password" label="Confirm New Password" sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''}
                      helperText={passwordForm.newPassword !== passwordForm.confirmPassword ? 'Passwords do not match' : ''} required />
                    <Button variant="outlined" color="primary" fullWidth type="submit" disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <VpnKey />}
                      sx={{ borderRadius: 2, fontWeight: 600, borderWidth: 2, '&:hover': { borderWidth: 2 } }}>
                      Update Password
                    </Button>
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{
                borderRadius: 4, overflow: 'visible',
                border: '1px solid', borderColor: 'divider',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
              }}>
                <Box sx={{ height: 6, background: 'linear-gradient(90deg, #059669, #0891B2)' }} />
                <CardContent sx={{ pt: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 2,
                      background: 'linear-gradient(135deg, #059669, #0891B2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', boxShadow: '0 4px 12px rgba(5,150,105,0.4)'
                    }}>
                      <SecurityIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Two-Factor Authentication</Typography>
                  </Box>
                  <TwoFactorAuth />
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    );
  };

   const renderUsersPanel = () => {
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied. Administrator privileges required.</Alert>;
    
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3,
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: '0 4px 15px rgba(37,99,235,0.4)'
            }}>
              <UserIcon />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #4F46E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>System User Directory</Typography>
              <Typography variant="body2" color="text.secondary">{users.length} total users in the system</Typography>
            </Box>
          </Box>
          <Box>
            <IconButton onClick={fetchUsers} sx={{
              bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', mr: 1, '&:hover': { bgcolor: alpha('#4F46E5', 0.2) }
            }}><RefreshIcon /></IconButton>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddUserModal}
              sx={{
                borderRadius: 2, fontWeight: 600,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                boxShadow: '0 4px 15px rgba(79,70,229,0.4)',
                '&:hover': { boxShadow: '0 6px 20px rgba(79,70,229,0.6)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s'
              }}>
              Add User
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Table>
            <ColorfulTableHead gradient="linear-gradient(135deg, #2563EB 0%, #7C3AED 60%, #EC4899 100%)">
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </ColorfulTableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>No users found.</TableCell></TableRow>
              ) : users.map((u, idx) => (
                <TableRow key={u.id} hover sx={{
                  background: getRowGradient(idx),
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.001)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }
                }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getRoleColor(u.role)}, ${getRoleColor(u.role)}bb)`,
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, flexShrink: 0,
                        boxShadow: `0 4px 10px ${getRoleColor(u.role)}30`
                      }}>
                        {u.name?.[0] || '?'}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {u.role === 'Unassigned' ? (
                      <Chip label="Unassigned" size="small" sx={{
                        fontWeight: 700, fontSize: '0.72rem',
                        bgcolor: alpha('#9CA3AF', 0.1),
                        color: '#6B7280',
                        border: `1.5px solid ${alpha('#9CA3AF', 0.4)}`
                      }} />
                    ) : (
                      <Chip label={u.role} size="small" sx={{
                        fontWeight: 700, fontSize: '0.72rem',
                        bgcolor: alpha(getRoleColor(u.role), 0.1),
                        color: getRoleColor(u.role),
                        border: `1.5px solid ${getRoleColor(u.role)}40`
                      }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                       <Button 
                         size="small" 
                         variant="text" 
                         sx={{ color: '#4F46E5', fontWeight: 600 }}
                         onClick={() => handleOpenEditModal(u)}
                       >
                         Edit
                       </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openAddUserModal} onClose={handleCloseAddUserModal} maxWidth="sm" fullWidth
          PaperProps={{ sx: { position: 'fixed', bottom: 0, m: 0, borderRadius: '20px 20px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' } }}
          BackdropProps={{ style: { backgroundColor: 'rgba(0, 0, 0, 0.3)' } }}>
          <Box sx={{ height: 5, background: 'linear-gradient(90deg, #4F46E5, #EC4899)', borderRadius: '20px 20px 0 0' }} />
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
             <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #4F46E5, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </Box>
            Create New System User
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField autoFocus margin="dense" label="Full Name" fullWidth variant="outlined" size="small"
              value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField margin="dense" label="Email Address" type="email" fullWidth variant="outlined" size="small"
              value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Assign Role</InputLabel>
              <Select value={newUserForm.roleId} label="Assign Role"
                onChange={(e) => setNewUserForm({ ...newUserForm, roleId: e.target.value })}
                sx={{ borderRadius: 2 }}>
                {roles.map((role) => (<MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>))}
              </Select>
            </FormControl>
            <TextField margin="dense" label="Temporary Password" type="password" fullWidth variant="outlined" size="small"
              value={newUserForm.temporaryPassword} onChange={(e) => setNewUserForm({ ...newUserForm, temporaryPassword: e.target.value })}
              helperText="User will be required to change this on first login."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseAddUserModal} disabled={loading} sx={{ borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
            <Button onClick={handleCreateUser} variant="contained" disabled={loading}
              sx={{ borderRadius: 2, fontWeight: 600, px: 4, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 15px rgba(79,70,229,0.4)' }}>
              {loading ? <CircularProgress size={24} /> : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEditUserModal} onClose={handleCloseEditModal} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}>
          <Box sx={{ height: 6, background: 'linear-gradient(90deg, #4F46E5, #EC4899)', borderRadius: '12px 12px 0 0' }} />
          <DialogTitle sx={{ fontWeight: 700 }}>Edit User</DialogTitle>
          <DialogContent>
            <TextField margin="dense" label="Full Name" fullWidth variant="outlined" size="small"
              value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            
            <TextField margin="dense" label="Email Address" type="email" fullWidth variant="outlined" size="small"
              value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Change Role</InputLabel>
              <Select value={editUserForm.roleId} label="Change Role"
                onChange={(e) => setEditUserForm({ ...editUserForm, roleId: e.target.value })}
                sx={{ borderRadius: 2 }}>
                {roles.map((role) => (<MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" display="block" gutterBottom sx={{ fontWeight: 700, color: '#4F46E5' }}>
              RESET PASSWORD (OPTIONAL)
            </Typography>
            <TextField 
              margin="dense" 
              label="New Temporary Password" 
              type="password" 
              fullWidth 
              variant="outlined" 
              size="small"
              value={editUserForm.temporaryPassword} 
              onChange={(e) => setEditUserForm({ ...editUserForm, temporaryPassword: e.target.value })}
              helperText="Leave blank to keep current password."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} 
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseEditModal} disabled={loading} sx={{ borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
            <Button onClick={handleUpdateUser} variant="contained" disabled={loading}
              sx={{ borderRadius: 2, fontWeight: 600, px: 4, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 15px rgba(79,70,229,0.4)' }}>
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    );
  };
  const renderRolesPanel = () => {
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied. Administrator privileges required.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    const roleColors = ['#FF6B00', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#DB2777'];
    
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(124,58,237,0.4)'
          }}><Shield /></Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>System Roles</Typography>
            <Typography variant="body2" color="text.secondary">{roles.length} roles configured</Typography>
          </Box>
        </Box>

        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: alpha('#7C3AED', 0.03), border: `1.5px dashed ${alpha('#7C3AED', 0.3)}` }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
               Create new system roles and assign module permissions (Saved to Description).
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleOpenRoleModal} 
              startIcon={<AddIcon />}
              sx={{
                borderRadius: 2, fontWeight: 600, px: 4,
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
                '&:hover': { boxShadow: '0 6px 20px rgba(124,58,237,0.6)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s'
              }}
            >
              Create New Role
            </Button>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {roles.map((r, idx) => (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <Card sx={{
                borderRadius: 4, overflow: 'hidden', position: 'relative',
                border: '1px solid', borderColor: 'divider',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }
              }}>
                <Box sx={{ height: 6, background: `linear-gradient(90deg, ${roleColors[idx % roleColors.length]}, ${roleColors[(idx + 2) % roleColors.length]})` }} />
                <CardContent sx={{ pt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2,
                        background: `linear-gradient(135deg, ${roleColors[idx % roleColors.length]}, ${roleColors[(idx + 1) % roleColors.length]})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', boxShadow: `0 4px 12px ${roleColors[idx % roleColors.length]}40`
                      }}>
                        <Shield sx={{ fontSize: 18 }} />
                      </Box>
                      <Box>
                         <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{r.name}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 6.5 }}>{r.description || 'No description'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderStaffCategories = () => {
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied. Administrator privileges required.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #059669, #0891B2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(5,150,105,0.4)'
          }}><CategoryIcon /></Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Staff Role Categories</Typography>
            <Typography variant="body2" color="text.secondary">{staffCategories.length} categories defined</Typography>
          </Box>
        </Box>
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: alpha('#059669', 0.03), border: `1.5px dashed ${alpha('#059669', 0.3)}` }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField size="small" label="New Category Title" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Button variant="contained" onClick={handleAddStaffCategory} startIcon={<AddIcon />}
              sx={{
                borderRadius: 2, fontWeight: 600, px: 4,
                background: 'linear-gradient(135deg, #059669, #0891B2)',
                boxShadow: '0 4px 15px rgba(5,150,105,0.4)',
                '&:hover': { boxShadow: '0 6px 20px rgba(5,150,105,0.6)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s'
              }}>
              Add Category
            </Button>
          </Box>
        </Paper>
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Table>
            <ColorfulTableHead gradient="linear-gradient(135deg, #059669 0%, #0891B2 100%)">
              <TableRow><TableCell>Name</TableCell><TableCell>Sort Order</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow>
            </ColorfulTableHead>
            <TableBody>
              {staffCategories.map((sc, idx) => (
                <TableRow key={sc.id} hover sx={{ background: getRowGradient(idx), transition: 'all 0.2s', '&:hover': { bgcolor: alpha('#059669', 0.04) } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: `linear-gradient(135deg, #059669, #0891B2)`,
                        boxShadow: '0 0 8px rgba(5,150,105,0.5)'
                      }} />
                      <Typography sx={{ fontWeight: 700 }}>{sc.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={`#${sc.sort_order}`} size="small" variant="outlined"
                      sx={{ fontWeight: 600, borderColor: alpha('#059669', 0.4), color: '#059669', borderRadius: 2 }} />
                  </TableCell>
                  <TableCell><StatusDot active={sc.is_active} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDeleteStaffCategory(sc.id)}
                      sx={{ color: '#EF4444', bgcolor: alpha('#EF4444', 0.08), '&:hover': { bgcolor: alpha('#EF4444', 0.15) }, borderRadius: 2 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderCareHomes = () => {
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied. Administrator privileges required.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #DC2626, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(220,38,38,0.4)'
          }}><ClientIcon /></Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #DC2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Care Home Registry</Typography>
            <Typography variant="body2" color="text.secondary">{careHomes.length} facilities registered</Typography>
          </Box>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Table>
            <ColorfulTableHead gradient="linear-gradient(135deg, #DC2626 0%, #F59E0B 100%)">
              <TableRow><TableCell>Facility & Address</TableCell><TableCell>Contact Person</TableCell><TableCell>Phone</TableCell><TableCell>Capacity</TableCell></TableRow>
            </ColorfulTableHead>
            <TableBody>
              {careHomes.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No care homes found.</TableCell></TableRow>
              ) : careHomes.map((ch, idx) => (
                <TableRow key={ch.id} hover sx={{ background: getRowGradient(idx), transition: 'all 0.2s' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        width: 42, height: 42, borderRadius: 2,
                        background: 'linear-gradient(135deg, #DC2626, #F59E0B)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', flexShrink: 0, boxShadow: '0 4px 10px rgba(220,38,38,0.3)'
                      }}>
                        <Business sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight="700">{ch.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{ch.address || 'No address set'}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{ch.contact_name || '—'}</TableCell>
                  <TableCell>{ch.phone || '—'}</TableCell>
                  <TableCell>
                    {ch.beds ? (
                      <Chip label={`${ch.beds} Beds`} size="small" sx={{
                        fontWeight: 700, bgcolor: alpha('#F59E0B', 0.1), color: '#D97706',
                        border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: 2
                      }} />
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderShiftPatterns = () => {
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied. Administrator privileges required.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #D97706, #EA580C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(217,119,6,0.4)'
          }}><ShiftIcon /></Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #D97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Shift Patterns</Typography>
            <Typography variant="body2" color="text.secondary">{shiftPatterns.length} patterns configured</Typography>
          </Box>
        </Box>
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: alpha('#D97706', 0.03), border: `1.5px dashed ${alpha('#D97706', 0.3)}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="Pattern Name" value={newShift.name}
                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth size="small" type="time" label="Start" InputLabelProps={{ shrink: true }}
                value={newShift.start} onChange={(e) => setNewShift({ ...newShift, start: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth size="small" type="time" label="End" InputLabelProps={{ shrink: true }}
                value={newShift.end} onChange={(e) => setNewShift({ ...newShift, end: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button variant="contained" fullWidth onClick={handleAddShiftPattern} startIcon={<AddIcon />}
                sx={{
                  borderRadius: 2, fontWeight: 600,
                  background: 'linear-gradient(135deg, #D97706, #EA580C)',
                  boxShadow: '0 4px 15px rgba(217,119,6,0.4)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(217,119,6,0.6)', transform: 'translateY(-1px)' },
                  transition: 'all 0.2s'
                }}>
                Save
              </Button>
            </Grid>
          </Grid>
        </Paper>
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Table>
            <ColorfulTableHead gradient="linear-gradient(135deg, #D97706 0%, #EA580C 100%)">
              <TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Time</TableCell><TableCell align="right">Actions</TableCell></TableRow>
            </ColorfulTableHead>
            <TableBody>
              {shiftPatterns.map((sp, idx) => (
                <TableRow key={sp.id} hover sx={{ background: getRowGradient(idx), transition: 'all 0.2s' }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{sp.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={sp.code} size="small" sx={{
                      fontWeight: 800, fontFamily: 'DM sans', fontSize: '0.75rem', letterSpacing: 1,
                      bgcolor: alpha('#D97706', 0.1), color: '#D97706',
                      border: '1.5px solid rgba(217,119,6,0.3)', borderRadius: 2
                    }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
                      <Typography sx={{ fontWeight: 600, fontFamily: 'DM sans', fontSize: '0.85rem' }}>
                        {sp.start_time} — {sp.end_time}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDeleteShiftPattern(sp.id)}
                      sx={{ color: '#EF4444', bgcolor: alpha('#EF4444', 0.08), '&:hover': { bgcolor: alpha('#EF4444', 0.15) }, borderRadius: 2 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };



  const renderSystemNotifications = () => {
    if (!isDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>;
    
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          
          
        </Box>

        {/* SECTION 1: NOTIFICATION SETTINGS */}
        {notificationSettings.length > 0 && (
          <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', mb: 4 }}>
            <Table>
              <ColorfulTableHead gradient="linear-gradient(135deg, #0891B2 0%, #2563EB 100%)">
                <TableRow><TableCell>Event</TableCell><TableCell>Email</TableCell><TableCell>SMS</TableCell><TableCell>WhatsApp</TableCell><TableCell>Status</TableCell></TableRow>
              </ColorfulTableHead>
              <TableBody>
                {notificationSettings.map((n, idx) => (
                  <TableRow key={n.id} hover sx={{ background: getRowGradient(idx), transition: 'all 0.2s' }}>
                    <TableCell><Typography sx={{ fontWeight: 700 }}>{n.event_key}</Typography></TableCell>
                    <TableCell>{n.email_enabled ? <CheckCircle sx={{ color: '#22C55E' }} /> : <Cancel sx={{ color: '#D1D5DB' }} />}</TableCell>
                    <TableCell>{n.sms_enabled ? <CheckCircle sx={{ color: '#22C55E' }} /> : <Cancel sx={{ color: '#D1D5DB' }} />}</TableCell>
                    <TableCell>{n.whatsapp_enabled ? <CheckCircle sx={{ color: '#22C55E' }} /> : <Cancel sx={{ color: '#D1D5DB' }} />}</TableCell>
                    <TableCell><StatusDot active={n.is_active} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Divider sx={{ my: 4 }} />

        {/* SECTION 2: RECENT ACTIVITIES */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, mt: 2 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
          }}><History /></Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Recent System Activities</Typography>
            <Typography variant="body2" color="text.secondary">Latest actions performed by users</Typography>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Table>
            <ColorfulTableHead gradient="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)">
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </ColorfulTableHead>
            <TableBody>
              {activityLogs.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No recent activity found.</TableCell></TableRow>
              ) : (
                activityLogs.map((log, idx) => (
                  <TableRow key={log.id} hover sx={{ background: getRowGradient(idx), transition: 'all 0.2s' }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {log.user_email || log.user_name || 'System'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={log.action} 
                        size="small" 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: alpha('#6366F1', 0.1), 
                          color: '#4F46E5',
                          border: '1px solid rgba(99,102,241,0.2)' 
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {log.details || 'No additional details'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const displaySubpanelContent = () => {
    switch (activeTab) {
      case 0: return renderMyAccount();
      case 1: return renderUsersPanel();
      case 2: return renderRolesPanel();
      case 3: return renderStaffCategories();
      case 4: return renderCareHomes();
      case 5: return renderShiftPatterns();
      // FIXED INDEX FROM 7 TO 6
      case 6: return renderSystemNotifications();
      default: return renderMyAccount();
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* HEADER */}
      <Box sx={{
        mb: 4, p: 4, borderRadius: 4,
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #312E81 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <Box sx={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)'
        }} />
        <Box sx={{
          position: 'absolute', bottom: -40, left: '30%', width: 150, height: 150, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)'
        }} />
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 3,
            background: 'linear-gradient(135deg, #6366F1, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 8px 25px rgba(99,102,241,0.5)'
          }}>
            <AdminPanelSettings sx={{ fontSize: 30 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
              System Settings
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#ffffff', 0.6) }}>
              Configure users, roles, categories, and system preferences
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              px: 2.5, py: 1, borderRadius: 2,
              background: alpha('#ffffff', 0.1), backdropFilter: 'blur(10px)',
              border: '1px solid', borderColor: alpha('#ffffff', 0.15)
            }}>
              <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.5) }}>Logged in as</Typography>
              <Chip
                label={currentUserRole}
                size="small"
                sx={{
                  ml: 1, fontWeight: 700, fontSize: '0.72rem',
                  bgcolor: alpha(getRoleColor(currentUserRole), 0.2),
                  color: getRoleColor(currentUserRole),
                  border: `1.5px solid ${alpha(getRoleColor(currentUserRole), 0.4)}`
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* NAVBAR TABS */}
      <Paper elevation={0} sx={{
        borderRadius: 4, mb: 3, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        <Tabs
          value={activeTab}
          onChange={(e, newVal) => setActiveTab(newVal)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1, py: 0.5,
            '& .MuiTab-root': {
              minHeight: 56, borderRadius: 3, mx: 0.5, my: 0.5,
              textTransform: 'none', fontWeight: 600, fontSize: '0.85rem',
              color: '#64748B',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-selected': {
                color: '#4F46E5',
                bgcolor: alpha('#4F46E5', 0.08),
                boxShadow: '0 2px 8px rgba(79,70,229,0.15)'
              },
              '&:hover:not(.Mui-selected)': {
                bgcolor: alpha('#000', 0.04),
                color: '#334155'
              },
              '&.Mui-disabled': {
                color: '#CBD5E1',
                opacity: 0.5
              }
            },
            '& .MuiTabs-indicator': {
              height: 3, borderRadius: 3,
              background: 'linear-gradient(90deg, #4F46E5, #EC4899)',
              transition: 'all 0.3s'
            },
            '& .MuiTabScrollButton-root': {
              color: '#4F46E5', borderRadius: 2
            }
          }}
        >
          {TAB_CONFIG.map((tab, idx) => {
            const hasAccess = !tab.minRole || roleHierarchy[currentUserRole] >= roleHierarchy[tab.minRole];
            return (
              <Tab
                key={idx}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
                disabled={!hasAccess}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* MAIN CONTENT */}
      <Paper elevation={0} sx={{
        p: 4, borderRadius: 4, minHeight: '60vh', bgcolor: 'white',
        border: '1px solid', borderColor: 'divider',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        position: 'relative', overflow: 'hidden'
      }}>
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #4F46E5, #7C3AED, #EC4899, #F59E0B)',
          opacity: 0.7
        }} />
        {displaySubpanelContent()}
      </Paper>

      {/* ADD ROLE & PERMISSIONS MODAL */}
      <Dialog 
        open={openRoleModal} 
        onClose={handleCloseRoleModal} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }
        }}
      >
        <Box sx={{ height: 6, background: 'linear-gradient(90deg, #7C3AED, #EC4899)' }} />
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <Shield sx={{ fontSize: 18 }} />
          </Box>
          Create New Role
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField 
            autoFocus 
            margin="dense" 
            label="Role Name" 
            fullWidth 
            variant="outlined" 
            size="small"
            value={roleForm.name} 
            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} 
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748B' }}>
            Select Accessible Modules:
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              maxHeight: 300, 
              overflow: 'auto', 
              borderRadius: 2, 
              borderColor: alpha('#7C3AED, 0.2'),
              bgcolor: alpha('#7C3AED, 0.02')
            }}
          >
            <List dense>
              {availableModules.map((mod) => (
                <ListItem 
                  key={mod.id} 
                  button 
                  onClick={() => handleModuleToggle(mod.id)}
                  sx={{ borderRadius: 1, mx: 1, my: 0.5 }}
                >
                  <Checkbox 
                    checked={roleForm.modules.includes(mod.id)}
                    sx={{
                      color: '#7C3AED',
                      '&.Mui-checked': { color: '#7C3AED' }
                    }}
                  />
                  <ListItemText primary={mod.label} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleCloseRoleModal} sx={{ borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
          <Button 
            onClick={handleSaveRole} 
            variant="contained" 
            disabled={loading}
            sx={{
              borderRadius: 2, fontWeight: 600, px: 4,
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
              '&:hover': { boxShadow: '0 6px 20px rgba(124,58,237,0.6)' }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- ATTRACTIVE SUCCESS/ERROR MODAL (From Clients.jsx) --- */}
      <Dialog open={infoModal.open} onClose={() => setInfoModal({ ...infoModal, open: false })} PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', maxWidth: 400 } }}>
        <Box sx={{ 
            textAlign: 'center', 
            background: infoModal.type === 'success' 
              ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
              : infoModal.type === 'error'
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff', 
            py: 4, 
            px: 2,
            position: 'relative'
          }}>
          <Avatar sx={{ 
              width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', 
              margin: '0 auto 16px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
            {infoModal.type === 'success' ? <CheckCircle sx={{ fontSize: 40, color: '#fff' }} /> : 
             infoModal.type === 'error' ? <Error sx={{ fontSize: 40, color: '#fff' }} /> : 
             <WarningAmber sx={{ fontSize: 40, color: '#fff' }} />}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{infoModal.title}</Typography>
        </Box>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            {infoModal.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 0 }}>
          <GradientButton 
            onClick={() => setInfoModal({ ...infoModal, open: false })} 
            colorType={infoModal.type}
            autoFocus
          >
            Okay
          </GradientButton>
        </DialogActions>
      </Dialog>

      {/* LEGACY SNACKBAR (Keep for minor toasts if needed) */}
      <Snackbar open={notification.open} autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert
          severity={notification.severity}
          onClose={() => setNotification({ ...notification, open: false })}
          sx={{
            width: '100%', borderRadius: 3, fontWeight: 600,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            ...(notification.severity === 'success' && {
              background: 'linear-gradient(135deg, #059669, #10B981)',
              color: 'white', '& .MuiAlert-icon': { color: 'white' }
            }),
            ...(notification.severity === 'error' && {
              background: 'linear-gradient(135deg, #DC2626, #EF4444)',
              color: 'white', '& .MuiAlert-icon': { color: 'white' }
            })
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;