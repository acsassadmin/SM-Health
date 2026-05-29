import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, Card, CardContent, Grid, TextField,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Divider, Alert, Snackbar, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, Stack,
  alpha, useTheme,
} from '@mui/material';
import {
  Person as UserIcon, Shield as RoleIcon, Shield, Badge as CategoryIcon, 
  Business as ClientIcon, Business, AccessTime as ShiftIcon, AddCircle as CustomFieldIcon,
  Notifications as NotificationIcon, Lock as SecurityIcon, AccountCircle as AccountCircle, 
  Delete as DeleteIcon, Save as SaveIcon, Refresh as RefreshIcon, 
  VpnKey, Add as AddIcon, AdminPanelSettings
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import TwoFactorAuth from "../auth/TwoFactorAuth";

const TAB_CONFIG = [
  { label: 'My Account', icon: <AccountCircle fontSize="small" />, minRole: null },
   { label: 'Users', icon: <UserIcon fontSize="small" />, minRole: 'Administrator' }, 
  { label: 'Roles', icon: <RoleIcon fontSize="small" />, minRole: 'Administrator' }, 
  { label: 'Staff Categories', icon: <CategoryIcon fontSize="small" />, minRole: 'Administrator' },
  { label: 'Client Categories', icon: <ClientIcon fontSize="small" />, minRole: 'Administrator' },
  { label: 'Shift Patterns', icon: <ShiftIcon fontSize="small" />, minRole: 'Administrator' },
  { label: 'Custom Fields', icon: <CustomFieldIcon fontSize="small" />, minRole: 'Administrator' },
  { label: 'Notifications', icon: <NotificationIcon fontSize="small" />, minRole: 'Director' },
];

const roleHierarchy = { 'Staff': 0, 'Administrator': 1, 'Director': 2 };

const Settings = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState('Staff');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '', email: '', roleId: '', temporaryPassword: ''
  });

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [staffCategories, setStaffCategories] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [shiftPatterns, setShiftPatterns] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState([]);
  const [clientCategories, setClientCategories] = useState([]);

  const [myProfile, setMyProfile] = useState({
    id: '', first_name: '', last_name: '', email: '', role: '', avatar_url: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [newCatName, setNewCatName] = useState('');
  const [newShift, setNewShift] = useState({ name: '', start: '', end: '' });
  const [newField, setNewField] = useState({ label: '', type: 'text', belongsTo: 'staff' });

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
        fetchCustomFields(),
        fetchNotificationSettings()
      ]);
      setLoading(false);
    };
    initializeSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 0) fetchMyProfile();
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
    
    // UPDATED: Takes display_name directly from auth.users metadata
    setMyProfile({ 
      id: user.id, 
      first_name: user.user_metadata?.full_name || '', // Mapped to first_name for UI compatibility
      last_name: '', // No longer needed
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
      console.error("Fetch Users Error:", error);
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
      if (error) throw error;
      setNotificationSettings(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err.message);
    }
  };

  const fetchShiftPatterns = async () => {
    const { data, error } = await supabase.from('shift_patterns').select('*').order('id');
    if (!error) setShiftPatterns(data);
  };

  const fetchCustomFields = async () => {
    const { data, error } = await supabase.from('custom_field_definitions').select('*').order('created_at', { ascending: false });
    if (!error && data) setCustomFields(data);
  };

  // ─── EVENT HANDLERS ──────────────────────────────────────────
  const handleOpenAddUserModal = () => {
    setNewUserForm({ name: '', email: '', roleId: '', temporaryPassword: '' });
    setOpenAddUserModal(true);
  };
  const handleCloseAddUserModal = () => setOpenAddUserModal(false);

   const handleCreateUser = async () => {
    const { name, email, roleId, temporaryPassword } = newUserForm;
    
    // 1. Client-side Validation
    if (!name || !email || !roleId || !temporaryPassword) { 
      triggerToast("All fields are required", "error"); 
      return; 
    }

    // Basic Password strength check
    if (temporaryPassword.length < 6) {
      triggerToast("Password must be at least 6 characters", "error");
      return;
    }
    
    setLoading(true);
    try {
      // 2. Create User in Supabase Auth
      // We use the admin client (service role) logic via standard client if possible, 
      // OR standard client. Note: Standard client requires user to be logged in.
      // Assuming this is an admin action.
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: temporaryPassword,
        options: {
          data: {
            display_name: name, // Store name in metadata
            full_name: name
          }
        }
      });

      if (authError) {
        // If the user already exists
        if (authError.message.includes('User already registered')) {
           throw new Error("A user with this email already exists.");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account.");
      }

      // 3. Assign Role in 'user_roles' table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role_id: parseInt(roleId) // Ensure roleId is a number if your DB expects it
        }]);

      if (roleError) {
        console.error("Role assignment failed:", roleError);
        // Rollback: Ideally we delete the auth user here, but for now we warn the admin
        throw new Error(`User created, but failed to assign role: ${roleError.message}`);
      }

      // Success!
      triggerToast("User created and role assigned successfully!");
      setOpenAddUserModal(false);
      fetchUsers(); // Refresh table
      
    } catch (error) {
      console.error("Create User Error:", error);
      triggerToast(error.message || "An unexpected error occurred", "error");
    } finally { 
      setLoading(false); 
    }
  };
  const handleUpdateProfile = async () => {
    if (!myProfile.first_name) { triggerToast('Name is required', 'error'); return; }
    
    // UPDATED: Updates auth.users metadata instead of profiles table
    const { error } = await supabase.auth.updateUser({ 
      data: { full_name: myProfile.first_name } 
    });
    
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
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from('staff_role_categories').delete().eq('id', id);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Category removed'); fetchStaffCategories(); }
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
    if (!confirm("Delete this shift pattern?")) return;
    const { error } = await supabase.from('shift_patterns').delete().eq('id', id);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Pattern removed'); fetchShiftPatterns(); }
  };

  const handleAddCustomField = async () => {
    if (!newField.label) return triggerToast('Label required', 'error');
    const fieldKey = newField.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const { error } = await supabase.from('custom_field_definitions').insert([{
      field_label: newField.label, field_key: fieldKey, field_type: newField.type,
      entity_type: newField.belongsTo, is_required: false, is_active: true
    }]);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Field added'); setNewField({ label: '', type: 'text', belongsTo: 'staff' }); fetchCustomFields(); }
  };

  const handleDeleteCustomField = async (id) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Field removed'); fetchCustomFields(); }
  };

  // ─── COLORFUL TABLE HEAD COMPONENT ───────────────────────────
 const ColorfulTableHead = ({ children, gradient }) => {
  return (
    <TableHead
      sx={{
        background: gradient,
        // Target all header cells inside this specific head row
        '& .MuiTableCell-head': {
          color: 'white !important',
          fontWeight: 800,
          fontSize: '0.87rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderBottom: 'none',
          backgroundColor: 'transparent !important', // Prevents theme fallback overrides
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
    // Determine if the user has permission to edit their email
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
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied. Director privileges required.</Alert>;
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
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </ColorfulTableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No users found.</TableCell></TableRow>
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
                  <TableCell><StatusDot active={u.status === 'Active'} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="text" sx={{ color: '#4F46E5', fontWeight: 600 }}
                      onClick={() => triggerToast('Password reset requires server-side implementation')}>Reset</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openAddUserModal} onClose={handleCloseAddUserModal} maxWidth="sm" fullWidth
          PaperProps={{
            sx: {
              position: 'fixed', bottom: 0, m: 0, borderRadius: '20px 20px 0 0',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)'
            }
          }}
          BackdropProps={{ style: { backgroundColor: 'rgba(0, 0, 0, 0.3)' } }}>
          <Box sx={{ height: 5, background: 'linear-gradient(90deg, #4F46E5, #EC4899)', borderRadius: '20px 20px 0 0' }} />
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              background: 'linear-gradient(135deg, #4F46E5, #EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
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
              sx={{
                borderRadius: 2, fontWeight: 600, px: 4,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                boxShadow: '0 4px 15px rgba(79,70,229,0.4)'
              }}>
              {loading ? <CircularProgress size={24} /> : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };
  const renderRolesPanel = () => {
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    const roleColors = ['#FF6B00', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#DB2777'];
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
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
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{r.name}</Typography>
                    </Box>
                    {r.is_system && (
                      <Chip label="System" size="small" sx={{
                        fontWeight: 700, fontSize: '0.65rem',
                        bgcolor: alpha('#EF4444', 0.1), color: '#EF4444',
                        border: '1.5px solid rgba(239,68,68,0.3)'
                      }} />
                    )}
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
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied.</Alert>;
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
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied.</Alert>;
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
              <TableRow><TableCell>Facility & Address</TableCell><TableCell>Contact Person</TableCell><TableCell>Phone</TableCell><TableCell>Capacity</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow>
            </ColorfulTableHead>
            <TableBody>
              {careHomes.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No care homes found.</TableCell></TableRow>
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
                  <TableCell><StatusDot active={ch.active} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" sx={{ color: '#DC2626', fontWeight: 600, borderRadius: 2 }}
                      onClick={() => triggerToast('Opening Details...')}>View</Button>
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
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied.</Alert>;
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
              <TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Time</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow>
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
                  <TableCell><StatusDot active={sp.is_active} /></TableCell>
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

  const renderCustomFields = () => {
    if (!isAdminOrDirector) return <Alert severity="error" sx={{ borderRadius: 3 }}>Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    const typeColors = { text: '#2563EB', number: '#7C3AED', date: '#059669', boolean: '#D97706' };
    const entityColors = { staff: '#EC4899', client: '#0891B2' };
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(236,72,153,0.4)'
          }}><CustomFieldIcon /></Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Custom Data Fields</Typography>
            <Typography variant="body2" color="text.secondary">{customFields.length} fields defined</Typography>
          </Box>
        </Box>
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: alpha('#EC4899', 0.03), border: `1.5px dashed ${alpha('#EC4899', 0.3)}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Field Label" value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={newField.type} label="Type" onChange={(e) => setNewField({ ...newField, type: e.target.value })} sx={{ borderRadius: 2 }}>
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="boolean">Yes/No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Attach To</InputLabel>
                <Select value={newField.belongsTo} label="Attach To" onChange={(e) => setNewField({ ...newField, belongsTo: e.target.value })} sx={{ borderRadius: 2 }}>
                  <MenuItem value="staff">Staff Records</MenuItem>
                  <MenuItem value="client">Care Homes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button variant="contained" fullWidth onClick={handleAddCustomField} startIcon={<AddIcon />}
                sx={{
                  borderRadius: 2, fontWeight: 600,
                  background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                  boxShadow: '0 4px 15px rgba(236,72,153,0.4)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(236,72,153,0.6)', transform: 'translateY(-1px)' },
                  transition: 'all 0.2s'
                }}>
                Add Field
              </Button>
            </Grid>
          </Grid>
        </Paper>
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Table>
            <ColorfulTableHead gradient="linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)">
              <TableRow><TableCell>Label</TableCell><TableCell>Key</TableCell><TableCell>Type</TableCell><TableCell>Entity</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow>
            </ColorfulTableHead>
            <TableBody>
              {customFields.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No custom fields defined yet.</TableCell></TableRow>
              ) : customFields.map((cf, idx) => (
                <TableRow key={cf.id} hover sx={{ background: getRowGradient(idx), transition: 'all 0.2s' }}>
                  <TableCell><Typography sx={{ fontWeight: 700 }}>{cf.field_label}</Typography></TableCell>
                  <TableCell>
                    <Typography sx={{
                      fontFamily: 'DM sans', fontSize: '0.8rem', fontWeight: 600,
                      color: '#6B7280', bgcolor: alpha('#000', 0.04), px: 1.5, py: 0.5, borderRadius: 1.5,
                      display: 'inline-block'
                    }}>
                      {cf.field_key}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={cf.field_type} size="small" sx={{
                      fontWeight: 700, fontSize: '0.72rem',
                      bgcolor: alpha(typeColors[cf.field_type] || '#6B7280', 0.1),
                      color: typeColors[cf.field_type] || '#6B7280',
                      border: `1.5px solid ${alpha(typeColors[cf.field_type] || '#6B7280', 0.3)}`,
                      borderRadius: 2
                    }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={cf.entity_type} size="small" sx={{
                      fontWeight: 700, fontSize: '0.72rem',
                      bgcolor: alpha(entityColors[cf.entity_type] || '#6B7280', 0.1),
                      color: entityColors[cf.entity_type] || '#6B7280',
                      border: `1.5px solid ${alpha(entityColors[cf.entity_type] || '#6B7280', 0.3)}`,
                      borderRadius: 2
                    }} />
                  </TableCell>
                  <TableCell><StatusDot active={cf.is_active} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDeleteCustomField(cf.id)}
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
          <Box sx={{
            width: 48, height: 48, borderRadius: 3,
            background: 'linear-gradient(135deg, #0891B2, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 15px rgba(8,145,178,0.4)'
          }}><NotificationIcon /></Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1E293B, #0891B2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Notification Settings</Typography>
            <Typography variant="body2" color="text.secondary">{notificationSettings.length} events configured</Typography>
          </Box>
        </Box>
        {notificationSettings.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>No notification settings found in database.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
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
      case 6: return renderCustomFields();
      case 7: return renderSystemNotifications();
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