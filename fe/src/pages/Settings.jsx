import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, Card, CardContent, Grid, TextField,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Switch, FormControlLabel, Select, MenuItem, InputLabel, 
  FormControl, IconButton, Divider, Checkbox, FormGroup, Alert, Snackbar, CircularProgress
} from '@mui/material';
import {
  Person as UserIcon, Shield as RoleIcon, Badge as CategoryIcon, 
  Business as ClientIcon, AccessTime as ShiftIcon, AddCircle as CustomFieldIcon,
  Notifications as NotificationIcon, Lock as SecurityIcon, AccountCircle as AccountIcon,
  Delete as DeleteIcon, Edit as EditIcon, Save as SaveIcon, Refresh as RefreshIcon, 
  VpnKey
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import TwoFactorAuth from "../auth/TwoFactorAuth";

const Settings = () => {
  // --- UI State ---
  const [activeTab, setActiveTab] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState('Staff'); 
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // --- Database State ---
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [staffCategories, setStaffCategories] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [shiftPatterns, setShiftPatterns] = useState([]);
  const [customFields, setCustomFields] = useState([]); // NEW: State for Custom Fields

  // --- My Account State ---
  const [myProfile, setMyProfile] = useState({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    avatar_url: ''
  });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // --- Input States for Other Tabs ---
  const [newCatName, setNewCatName] = useState('');
  const [newShift, setNewShift] = useState({ name: '', start: '', end: '' });
  
  // NEW: Input State for Custom Fields
  const [newField, setNewField] = useState({ label: '', type: 'text', belongsTo: 'staff' });

  // Helper to trigger toasts
  const triggerToast = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING ENGINE
  // ─────────────────────────────────────────────────────────────
  
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
        fetchCustomFields() // NEW: Fetch custom fields on load
      ]);
      setLoading(false);
    };

    initializeSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      fetchMyProfile();
    }
  }, [activeTab]);

  const fetchUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const role = session?.user?.user_metadata?.role || 'Administrator';
    setCurrentUserRole(role);
  };

  const fetchMyProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        avatar_url,
        role
      `)
      .eq('id', user.id)
      .single();

    if (data) {
      setMyProfile({
        id: data.id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: user.email,
        role: data.role || 'Staff',
        avatar_url: data.avatar_url
      });
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        last_login,
        is_active,
        user_roles (
          app_roles ( name )
        )
      `);

    if (!error && data) {
      const formatted = data.map(u => ({
        id: u.id,
        name: u.email.split('@')[0], 
        email: u.email,
        role: u.user_roles[0]?.app_roles?.name || 'Staff',
        status: u.is_active ? 'Active' : 'Inactive',
        lastLogin: u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'
      }));
      setUsers(formatted);
    }
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('app_roles')
      .select('*')
      .order('id');
    if (!error) setRoles(data);
  };

  const fetchStaffCategories = async () => {
    const { data, error } = await supabase
      .from('staff_role_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error) setStaffCategories(data);
  };

  const fetchCareHomes = async () => {
    const { data, error } = await supabase
      .from('care_homes')
      .select('id, name, active'); 
    if (!error) setCareHomes(data);
  };

  const fetchShiftPatterns = async () => {
    const { data, error } = await supabase
      .from('shift_patterns')
      .select('*')
      .order('id');
    if (!error) setShiftPatterns(data);
  };

  // NEW: Fetch Custom Fields
  const fetchCustomFields = async () => {
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setCustomFields(data);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ACTION HANDLERS (MY ACCOUNT)
  // ─────────────────────────────────────────────────────────────

  const handleUpdateProfile = async () => {
    if (!myProfile.first_name || !myProfile.last_name) {
      triggerToast('First and Last name are required', 'error');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: myProfile.first_name,
        last_name: myProfile.last_name
      })
      .eq('id', myProfile.id);

    if (error) triggerToast(error.message, 'error');
    else triggerToast('Profile updated successfully');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      triggerToast('New passwords do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      triggerToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword
    });

    setLoading(false);

    if (error) triggerToast(error.message, 'error');
    else {
      triggerToast('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ACTION HANDLERS (OTHER TABS)
  // ─────────────────────────────────────────────────────────────

  const handleAddStaffCategory = async () => {
    if (!newCatName) return;
    const maxSort = staffCategories.length > 0 ? Math.max(...staffCategories.map(c => c.sort_order || 0)) : 0;

    const { error } = await supabase
      .from('staff_role_categories')
      .insert([{
        name: newCatName,
        sort_order: maxSort + 1,
        is_active: true
      }]);

    if (error) triggerToast(error.message, 'error');
    else {
      triggerToast('Category added successfully');
      setNewCatName('');
      fetchStaffCategories();
    }
  };

  const handleDeleteStaffCategory = async (id) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from('staff_role_categories').delete().eq('id', id);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Category removed'); fetchStaffCategories(); }
  };

  const handleAddShiftPattern = async () => {
    if (!newShift.name || !newShift.start || !newShift.end) return;

    const { error } = await supabase
      .from('shift_patterns')
      .insert([{
        code: newShift.name.substring(0, 3).toUpperCase(), 
        name: newShift.name,
        start_time: newShift.start,
        end_time: newShift.end,
        total_hours: 8, 
        break_hours: 0.5
      }]);

    if (error) triggerToast(error.message, 'error');
    else {
      triggerToast('Shift pattern saved');
      setNewShift({ name: '', start: '', end: '' });
      fetchShiftPatterns();
    }
  };

  const handleDeleteShiftPattern = async (id) => {
    if (!confirm("Delete this shift pattern?")) return;
    const { error } = await supabase.from('shift_patterns').delete().eq('id', id);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Pattern removed'); fetchShiftPatterns(); }
  };

  // NEW: Handlers for Custom Fields
  const handleAddCustomField = async () => {
    if (!newField.label) {
      triggerToast('Field Label is required', 'error');
      return;
    }

    // Generate a simple key from the label (e.g. "Emergency Contact" -> "emergency_contact")
    const fieldKey = newField.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const { error } = await supabase
      .from('custom_field_definitions')
      .insert([{
        field_label: newField.label,
        field_key: fieldKey,
        field_type: newField.type,
        entity_type: newField.belongsTo,
        is_required: false, // Default for now
        is_active: true
      }]);

    if (error) {
      triggerToast(error.message, 'error');
    } else {
      triggerToast('Custom field added successfully');
      setNewField({ label: '', type: 'text', belongsTo: 'staff' });
      fetchCustomFields();
    }
  };

  const handleDeleteCustomField = async (id) => {
    if (!confirm("Are you sure? This may delete data associated with this field.")) return;
    const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
    if (error) triggerToast(error.message, 'error');
    else { triggerToast('Field removed'); fetchCustomFields(); }
  };

  // ─────────────────────────────────────────────────────────────
  // SUB-PANEL RENDERERS
  // ─────────────────────────────────────────────────────────────

  const isDirector = currentUserRole === 'Director';
  const isAdminOrDirector = currentUserRole === 'Director' || currentUserRole === 'Administrator';

  const renderMyAccount = () => {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>My Account Preferences</Typography>
        
        <Grid container spacing={4}>
          {/* Left Column: Profile Details */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{
                        width: 64, height: 64, borderRadius: '50%', 
                        bgcolor: '#1a5fba', color: 'white', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, fontWeight: 'bold', mr: 2
                    }}>
                        {myProfile.first_name ? myProfile.first_name[0] : 'U'}
                    </Box>
                    <Box>
                        <Typography variant="h6">{myProfile.first_name} {myProfile.last_name}</Typography>
                        <Typography variant="body2" color="textSecondary">{myProfile.email}</Typography>
                        <Chip label={myProfile.role} size="small" sx={{ mt: 1 }} color="primary" variant="outlined" />
                    </Box>
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>Personal Details</Typography>
                
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <TextField 
                            fullWidth size="small" label="First Name" 
                            value={myProfile.first_name} 
                            onChange={(e) => setMyProfile({ ...myProfile, first_name: e.target.value })} 
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField 
                            fullWidth size="small" label="Last Name" 
                            value={myProfile.last_name} 
                            onChange={(e) => setMyProfile({ ...myProfile, last_name: e.target.value })} 
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField 
                            fullWidth size="small" label="Email Address" 
                            value={myProfile.email} 
                            disabled 
                            helperText="Contact admin to change email"
                        />
                    </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleUpdateProfile}>Update Details</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: Security & Password */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2} direction="column">
                {/* Password Change Card */}
                <Grid item>
                    <Card variant="outlined">
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <VpnKey sx={{ mr: 1, color: '#1a5fba' }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Change Password</Typography>
                            </Box>
                            
                            <Box component="form" onSubmit={handlePasswordChange}>
                                <TextField 
                                    fullWidth size="small" type="password" label="New Password" 
                                    sx={{ mb: 2 }}
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    required
                                />
                                <TextField 
                                    fullWidth size="small" type="password" label="Confirm New Password" 
                                    sx={{ mb: 3 }}
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''}
                                    helperText={passwordForm.newPassword !== passwordForm.confirmPassword ? 'Passwords do not match' : ''}
                                    required
                                />
                                <Button 
                                    variant="outlined" color="primary" fullWidth type="submit" 
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : <VpnKey />}
                                >
                                    Update Password
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 2FA Card */}
                <Grid item>
                    <Card variant="outlined">
                        <CardContent>
                            <TwoFactorAuth />
                        </CardContent>
                    </Card>
                </Grid>

            </Grid>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderUsersPanel = () => {
    if (!isDirector) return <Alert severity="error">Access Denied. Director privileges required.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>System User Directory</Typography>
            <IconButton onClick={fetchUsers} size="small"><RefreshIcon /></IconButton>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Chip label={u.role} size="small" color="primary" variant="outlined" /></TableCell>
                  <TableCell><Chip label={u.status} size="small" color={u.status === 'Active' ? 'success' : 'default'} /></TableCell>
                  <TableCell>{u.lastLogin}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="text" onClick={() => triggerToast('Password reset sent')}>Reset</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderRolesPanel = () => {
    if (!isDirector) return <Alert severity="error">Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>System Roles</Typography>
        <Grid container spacing={3}>
          {roles.map((r) => (
            <Grid item xs={12} sm={4} key={r.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{r.name}</Typography>
                    {r.is_system && <Chip label="System" size="small" color="error" variant="filled" />}
                  </Box>
                  <Typography variant="body2" color="textSecondary">{r.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderStaffCategories = () => {
    if (!isAdminOrDirector) return <Alert severity="error">Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Staff Role Categories</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField size="small" label="New Category Title" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          <Button variant="contained" onClick={handleAddStaffCategory}>Add Category</Button>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Sort Order</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffCategories.map((sc) => (
                <TableRow key={sc.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{sc.name}</TableCell>
                  <TableCell>{sc.sort_order}</TableCell>
                  <TableCell><Chip size="small" label={sc.is_active ? "Active" : "Inactive"} color={sc.is_active ? "success" : "default"} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleDeleteStaffCategory(sc.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderClientCategories = () => {
    if (!isAdminOrDirector) return <Alert severity="error">Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Care Homes</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>Manage facilities via the Clients module.</Alert>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell>Facility Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {careHomes.map((ch) => (
                <TableRow key={ch.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{ch.name}</TableCell>
                  <TableCell><Chip size="small" label={ch.active ? "Active" : "Inactive"} color={ch.active ? "success" : "default"} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => triggerToast('Redirecting...')}>View</Button>
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
    if (!isAdminOrDirector) return <Alert severity="error">Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Shift Patterns</Typography>
        <Grid container spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Pattern Name" value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField fullWidth size="small" type="time" label="Start" InputLabelProps={{ shrink: true }} value={newShift.start} onChange={(e) => setNewShift({ ...newShift, start: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField fullWidth size="small" type="time" label="End" InputLabelProps={{ shrink: true }} value={newShift.end} onChange={(e) => setNewShift({ ...newShift, end: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button variant="contained" fullWidth onClick={handleAddShiftPattern}>Save</Button>
          </Grid>
        </Grid>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shiftPatterns.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{sp.name}</TableCell>
                  <TableCell><Chip size="small" label={sp.code} variant="outlined" /></TableCell>
                  <TableCell>{sp.start_time} - {sp.end_time}</TableCell>
                  <TableCell><Chip size="small" label={sp.is_active ? "Active" : "Inactive"} color={sp.is_active ? "success" : "default"} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleDeleteShiftPattern(sp.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // NEW: Real implementation for Custom Fields
  const renderCustomFields = () => {
    if (!isAdminOrDirector) return <Alert severity="error">Access Denied.</Alert>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Manage Extensible Registry Data Fields</Typography>
        
        {/* Add Form */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f9fafb' }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField 
                        fullWidth size="small" 
                        label="Field Label (e.g. Emergency Contact)" 
                        value={newField.label} 
                        onChange={(e) => setNewField({ ...newField, label: e.target.value })} 
                    />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Data Type</InputLabel>
                        <Select 
                            value={newField.type} 
                            label="Data Type" 
                            onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                        >
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
                        <Select 
                            value={newField.belongsTo} 
                            label="Attach To" 
                            onChange={(e) => setNewField({ ...newField, belongsTo: e.target.value })}
                        >
                            <MenuItem value="staff">Staff Records</MenuItem>
                            <MenuItem value="client">Care Homes</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <Button variant="contained" fullWidth onClick={handleAddCustomField}>Add Field</Button>
                </Grid>
            </Grid>
        </Paper>

        {/* List */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell>Label</TableCell>
                <TableCell>Key (System)</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customFields.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No custom fields defined yet.</TableCell></TableRow>
              ) : (
                customFields.map((cf) => (
                  <TableRow key={cf.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{cf.field_label}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8em' }}>{cf.field_key}</TableCell>
                    <TableCell><Chip size="small" label={cf.field_type} variant="outlined" /></TableCell>
                    <TableCell><Chip size="small" label={cf.entity_type} color="secondary" variant="outlined" /></TableCell>
                    <TableCell><Chip size="small" label={cf.is_active ? "Active" : "Inactive"} color={cf.is_active ? "success" : "default"} /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => handleDeleteCustomField(cf.id)}><DeleteIcon fontSize="small" /></IconButton>
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

  const renderSystemNotifications = () => {
    if (!isDirector) return <Alert severity="error">Access Denied.</Alert>;
    return <Box><Alert severity="warning">Requires <code>system_settings</code> table.</Alert></Box>;
  };

  const renderSecurityConfig = () => {
    if (!isDirector) return <Alert severity="error">Access Denied.</Alert>;
    return <Box><Alert severity="warning">Requires <code>system_settings</code> table.</Alert></Box>;
  };

  const displaySubpanelContent = () => {
    switch (activeTab) {
      case 0: return renderMyAccount();
      case 1: return renderUsersPanel();
      case 2: return renderRolesPanel();
      case 3: return renderStaffCategories();
      case 4: return renderClientCategories();
      case 5: return renderShiftPatterns();
      case 6: return renderCustomFields();
      case 7: return renderSystemNotifications();
      case 8: return renderSecurityConfig();
      default: return renderMyAccount();
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0c1f3f' }}>System Settings</Typography>
        <Typography variant="caption" color="textSecondary">
          Logged in as: <strong>{currentUserRole}</strong>
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Tabs
              orientation="vertical"
              value={activeTab}
              onChange={(e, newVal) => setActiveTab(newVal)}
              variant="scrollable"
              sx={{
                borderRight: 1, borderColor: 'divider', bgcolor: 'white',
                '& .MuiTab-root': { alignItems: 'flex-start', textAlign: 'left', px: 3, py: 2, fontSize: '0.85rem' },
                '& .MuiSelected': { color: '#1a5fba', bgcolor: 'rgba(26, 95, 186, 0.05)', fontWeight: 'bold' }
              }}
            >
              <Tab icon={<AccountIcon fontSize="small" />} iconPosition="start" label="My Account" />
              <Tab icon={<UserIcon fontSize="small" />} iconPosition="start" label="Users" disabled={!isDirector} />
              <Tab icon={<RoleIcon fontSize="small" />} iconPosition="start" label="Roles" disabled={!isDirector} />
              <Tab icon={<CategoryIcon fontSize="small" />} iconPosition="start" label="Staff Categories" disabled={!isAdminOrDirector} />
              <Tab icon={<ClientIcon fontSize="small" />} iconPosition="start" label="Client Categories" disabled={!isAdminOrDirector} />
              <Tab icon={<ShiftIcon fontSize="small" />} iconPosition="start" label="Shift Patterns" disabled={!isAdminOrDirector} />
              <Tab icon={<CustomFieldIcon fontSize="small" />} iconPosition="start" label="Custom Fields" disabled={!isAdminOrDirector} />
              <Tab icon={<NotificationIcon fontSize="small" />} iconPosition="start" label="Notifications" disabled={!isDirector} />
              <Tab icon={<SecurityIcon fontSize="small" />} iconPosition="start" label="Security" disabled={!isDirector} />
            </Tabs>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper elevation={1} sx={{ p: 4, borderRadius: 2, minHeight: '60vh', bgcolor: 'white' }}>
            {displaySubpanelContent()}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;