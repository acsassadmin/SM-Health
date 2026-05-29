import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, InputLabel, FormControl, IconButton, TablePagination, Snackbar, Alert,
  Stepper, Step, StepLabel, Checkbox, FormControlLabel, Divider, Grid, Card, CardContent,
  useTheme, useMediaQuery, Stack, List, ListItem, ListItemText, ListItemIcon, Link
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack,
  ArrowForward,
  ContactPage,
  AdminPanelSettings,
  Description,
  CloudUpload,
  AttachFile,
  FolderOpen
} from '@mui/icons-material';


const datePickerStyles = `
  input[type="date"] {
    color: #2c3e50 !important;
    font-family: 'DM sans';
  }
  input[type="date"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.7;
  }
  input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }
`;

// List of columns that are part of the standard system (hardcoded)
const SYSTEM_COLUMNS = [
  'id', 'created_at', 'updated_at', 
  'first_name', 'last_name', 'dob', 'email', 'phone', 'ni_number', 'joined_date', 
  'role', 'contracted_hours', 'right_to_work_expiry', 
  'dbs_checked', 'dbs_expiry', 'custom_data', 'title'
];

const Staff = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- Core List State ---
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // --- Dynamic Roles ---
  const [roles, setRoles] = useState([]);
  const [newRoleInput, setNewRoleInput] = useState('');

  // --- Dynamic Columns (Detected from DB Schema) ---
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [columnLabels, setColumnLabels] = useState({}); // NEW: Stores pretty names

  // --- Pagination State ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [count, setCount] = useState(0);

  // --- Modal State ---
  const [modalOpen, setModalOpen] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // --- Wizard State ---
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Mandatory Details', 'Additional Details', 'Documents'];

  // --- Form State ---
  const [formData, setFormData] = useState({
    title: 'Mr.', // ADDED: Default Title
    first_name: '', last_name: '', dob: '', email: '', phone: '', ni_number: '', joined_date: '',
    contracted_hours: '', right_to_work_expiry: '', dbs_checked: false, dbs_expiry: '', role: '', temp_password: '',
    documents: []
  });

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [errors, setErrors] = useState({});

  // Inject Styles
  useEffect(() => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = datePickerStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [page, rowsPerPage, searchTerm]);

  useEffect(() => {
    fetchRoleCategories();
    fetchDynamicSchema(); // Fetch schema on load
  }, []);

  // Helper to extract documents
  const getDocuments = (staffMember) => {
    if (!staffMember.custom_data) return [];
    return staffMember.custom_data.uploaded_documents || [];
  };

  const fetchStaff = async () => {
    setLoading(true);
    let query = supabase
      .from('staff')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true });

    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`);
    }

    const from = page * rowsPerPage;
    const to = from + rowsPerPage - 1;

    const { data, error, count: totalCount } = await query.range(from, to);

    if (error) {
      console.error('Error fetching staff:', error);
      setNotification({ open: true, message: 'Failed to load staff', severity: 'error' });
    } else {
      setStaff(data || []);
      setCount(totalCount || 0);
    }
    setLoading(false);
  };

  const fetchRoleCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_role_categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      if (data) {
        setRoles(data.map(r => r.name).filter(Boolean));
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  // --- Fetch Dynamic Schema from DB ---
  const fetchDynamicSchema = async () => {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'staff')
        .eq('table_schema', 'public');

      if (error) throw error;
      if (data) {
        const customCols = data
          .map(col => col.column_name)
          .filter(name => !SYSTEM_COLUMNS.includes(name));
        
        setDynamicColumns(customCols);
      }
    } catch (err) {
      console.error("Error fetching schema:", err);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return '—';
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const calculateYearsService = (joined) => {
    if (!joined) return '0';
    const joinDate = new Date(joined);
    const diffTime = Math.abs(Date.now() - joinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return (diffDays / 365.25).toFixed(1);
  };

  const getDbsStatus = (expiry) => {
    if (!expiry) return { label: 'No DBS', color: 'default' };
    const today = new Date();
    const exp = new Date(expiry);
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: 'error' };
    if (diffDays <= 30) return { label: `${diffDays} Days Left`, color: 'warning' };
    return { label: 'Valid', color: 'success' };
  };

  const handleAddClick = () => {
    resetForm();
    setActiveStep(0);
    setIsViewing(false);
    setModalOpen(true);
  };

  const handleViewClick = (staffMember) => {
    populateForm(staffMember);
    setIsViewing(true);
    setActiveStep(0);
    setModalOpen(true);
  };

  const handleEditClick = (staffMember) => {
    populateForm(staffMember);
    setIsViewing(false);
    setActiveStep(0);
    setModalOpen(true);
  };

  const handleDeleteClick = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) {
        setNotification({ open: true, message: 'Failed to delete staff member', severity: 'error' });
      } else {
        setNotification({ open: true, message: 'Staff member deleted successfully', severity: 'success' });
        fetchStaff();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: 'Mr.', // ADDED: Reset Title
      first_name: '', last_name: '', dob: '', email: '', phone: '', ni_number: '', joined_date: new Date().toISOString().split('T')[0],
      contracted_hours: '', right_to_work_expiry: '', dbs_checked: false, dbs_expiry: '', role: '', temp_password: '',
      documents: []
    });
    setErrors({});
    setCurrentId(null);
  };

  // Helper to format label: snake_case -> Title Case
  const formatLabel = (str) => {
    if (!str) return '';
    
    // Check custom labels first
    if (columnLabels[str]) {
      return columnLabels[str];
    }

    // Fallback to automatic formatting
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const populateForm = (staffMember) => {
    const systemDocs = staffMember.custom_data?.uploaded_documents || [];
    
    const initialState = {
      title: staffMember.title || 'Mr.', // ADDED: Load Title from DB
      first_name: staffMember.first_name || '',
      last_name: staffMember.last_name || '',
      dob: staffMember.dob || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      ni_number: staffMember.ni_number || '',
      joined_date: staffMember.joined_date || '',
      contracted_hours: staffMember.contracted_hours || '',
      right_to_work_expiry: staffMember.right_to_work_expiry || '',
      dbs_checked: staffMember.dbs_checked || false,
      dbs_expiry: staffMember.dbs_expiry || '',
      role: staffMember.role || '',
      temp_password: '',
      documents: systemDocs
    };

    // Inject values for dynamic columns
    dynamicColumns.forEach(colName => {
      initialState[colName] = staffMember[colName] || '';
    });

    setFormData(initialState);
    setErrors({});
    setCurrentId(staffMember.id);
  };

  const validateStep1 = () => {
    const newErrors = {};
    const { first_name, last_name, dob, email, phone, ni_number } = formData;

    if (!first_name) newErrors.first_name = "Required";
    if (!last_name) newErrors.last_name = "Required";
    if (!phone) newErrors.phone = "Required";
    if (!ni_number) newErrors.ni_number = "Required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = "Required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Invalid email format";
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dob) {
      newErrors.dob = "Required";
    } else if (!dateRegex.test(dob)) {
      newErrors.dob = "Invalid date format (YYYY-MM-DD)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const { 
      title, first_name, last_name, dob, email, phone, ni_number, 
      joined_date, contracted_hours, right_to_work_expiry,
      dbs_checked, dbs_expiry, documents, role 
    } = formData;

    if (!validateStep1()) {
      setNotification({ open: true, message: "Please fix validation errors.", severity: 'warning' });
      setActiveStep(0);
      return;
    }

    const payload = {
      title, // ADDED: Include title in payload
      first_name,
      last_name,
      dob,
      email,
      phone,
      ni_number,
      role,
      joined_date: joined_date || null,
      contracted_hours: contracted_hours ? parseFloat(contracted_hours) : null,
      right_to_work_expiry: right_to_work_expiry || null,
      dbs_checked: !!dbs_checked,
      dbs_expiry: dbs_checked ? dbs_expiry : null,
    };

    // Add dynamic fields to payload
    dynamicColumns.forEach(colName => {
      payload[colName] = formData[colName] || null;
    });

    // Handle documents
    let existingCustomData = {};
    if (currentId) {
      const { data: existingStaff } = await supabase.from('staff').select('custom_data').eq('id', currentId).single();
      existingCustomData = existingStaff?.custom_data || {};
    }

    payload.custom_data = {
      ...existingCustomData,
      uploaded_documents: documents
    };

    if (formData.temp_password) {
      payload.temp_password = formData.temp_password;
    }

    let error;
    if (currentId) {
      const { error: updateError } = await supabase
        .from('staff')
        .update(payload)
        .eq('id', currentId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('staff')
        .insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Save Error:", error);
      setNotification({ open: true, message: `Save failed: ${error.message}`, severity: 'error' });
    } else {
      setModalOpen(false);
      setNotification({ 
        open: true, 
        message: currentId ? 'Profile updated' : 'Staff onboarded successfully', 
        severity: 'success' 
      });
      fetchStaff(); 
    }
  };

  const handleAddRole = async () => {
    if (newRoleInput && !roles.includes(newRoleInput)) {
      try {
        const nextOrder = roles.length + 1;
        const { error } = await supabase
          .from('staff_role_categories')
          .insert([{ name: newRoleInput, sort_order: nextOrder, is_active: true }]);

        if (error) throw error;
        await fetchRoleCategories();
        setNewRoleInput('');
        setNotification({ open: true, message: 'New role category added to system', severity: 'success' });
      } catch (err) {
        console.error(err);
        setNotification({ open: true, message: 'Failed to save new role category', severity: 'error' });
      }
    }
  };

  // --- Handle Add Custom Field (Schema Driven) ---
  const handleAddCustomField = async () => {
    const label = prompt("Enter field label (e.g. 'Emergency Contact'):");
    if (label) {
      // 1. Generate a safe database column name
      const columnName = label
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      
      if (!columnName) {
        setNotification({ open: true, message: 'Invalid field name generated.', severity: 'error' });
        return;
      }

      // 2. Execute SQL via RPC
      const { error: rpcError } = await supabase.rpc('add_column_to_staff', { 
        p_column_name: columnName, 
        p_column_label: label 
      });

      if (rpcError) {
        console.error("Error adding field:", rpcError);
        setNotification({ open: true, message: `Failed: ${rpcError.message}`, severity: 'error' });
        return;
      }

      // 3. OPTIMISTIC UPDATE: Update local state immediately
      setDynamicColumns(prev => [...prev, columnName]);
      setColumnLabels(prev => ({ ...prev, [columnName]: label }));
      
      // 4. Initialize the form data for this new field
      setFormData(prev => ({ ...prev, [columnName]: '' }));

      // 5. Show success
      setNotification({ open: true, message: 'Field added successfully', severity: 'success' });
      
      // 6. (Optional) Fetch schema in background to ensure sync eventually
      fetchDynamicSchema(); 
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const newDocs = [...formData.documents];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
        const filePath = `staff-docs/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('staff-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setNotification({ open: true, message: `Upload failed: ${file.name}`, severity: 'error' });
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('staff-documents')
          .getPublicUrl(filePath);

        newDocs.push({
          name: file.name,
          url: publicUrlData.publicUrl,
          path: filePath,
          uploaded_at: new Date().toISOString()
        });
      }

      setFormData({ ...formData, documents: newDocs });
      setNotification({ open: true, message: 'Documents attached successfully', severity: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ open: true, message: 'An unexpected error occurred during upload.', severity: 'error' });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveDoc = (indexToRemove) => {
    const newDocs = formData.documents.filter((_, index) => index !== indexToRemove);
    setFormData({ ...formData, documents: newDocs });
  };

  const StaffMobileCard = ({ s }) => {
    const dbs = getDbsStatus(s.dbs_expiry);
    const rtwValid = s.right_to_work_expiry ? new Date(s.right_to_work_expiry) > new Date() : null;
    const docs = getDocuments(s);

    return (
      <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 2 }} onClick={() => handleViewClick(s)}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1a5fba', width: 40, height: 40 }}>
              {s.first_name?.[0] || ''}{s.last_name?.[0] || ''}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#0c1f3f' }}>
                {s.title} {s.first_name} {s.last_name}
              </Typography>
              <Typography variant="caption" color="textSecondary">{s.ni_number || 'No NI'}</Typography>
            </Box>
            <Chip label={s.role || 'Unassigned'} size="small" color="primary" variant="outlined" />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Grid container spacing={1} sx={{ mb: 2, mt: 0.5 }}>
            <Grid xs={6}>
              <Typography variant="caption" color="textSecondary">Email</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{s.email || '—'}</Typography>
            </Grid>
            <Grid xs={6}>
              <Typography variant="caption" color="textSecondary">Phone</Typography>
              <Typography variant="body2">{s.phone || '—'}</Typography>
            </Grid>
            <Grid xs={6}>
              <Typography variant="caption" color="textSecondary">DBS Status</Typography>
              <Box sx={{ mt: 0.5 }}><Chip label={dbs.label} color={dbs.color} size="small" /></Box>
            </Grid>
            <Grid xs={6}>
              <Typography variant="caption" color="textSecondary">Right to Work</Typography>
              <Box sx={{ mt: 0.5 }}>
                {rtwValid === true && <Chip label="Valid" color="success" size="small" />}
                {rtwValid === false && <Chip label="Expired" color="error" size="small" />}
                {rtwValid === null && <Chip label="Not Set" color="default" size="small" />}
              </Box>
            </Grid>
            
            <Grid xs={12}>
              <Typography variant="caption" color="textSecondary">Documents</Typography>
              {docs.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <Chip 
                    icon={<FolderOpen fontSize="small" />} 
                    label={`${docs.length} File${docs.length > 1 ? 's' : ''}`} 
                    size="small" 
                    color="info" 
                    variant="outlined"
                    sx={{ width: 'fit-content' }}
                    onClick={(e) => { 
                       e.stopPropagation();
                       if(docs[0]?.url) window.open(docs[0].url, '_blank');
                    }}
                  />
                  {docs.slice(0, 2).map((doc, idx) => (
                    <Link 
                      key={idx} 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener"
                      onClick={e => e.stopPropagation()}
                      sx={{ fontSize: '0.75rem', color: '#1a5fba', display: 'block', textDecoration: 'none', pl: 0.5 }}
                    >
                      • {doc.name}
                    </Link>
                  ))}
                  {docs.length > 2 && (
                    <Typography variant="caption" sx={{ pl: 1, color: 'text.secondary' }}>
                      +{docs.length - 2} more
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>No files</Typography>
              )}
            </Grid>

          </Grid>

          <Stack direction="row" spacing={1} justifyContent="flex-end" onClick={e => e.stopPropagation()}>
            <IconButton color="primary" size="small" onClick={() => handleViewClick(s)}>
              <ViewIcon fontSize="small" />
            </IconButton>
            <IconButton color="info" size="small" onClick={() => handleEditClick(s)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton color="error" size="small" onClick={() => handleDeleteClick(s.id, s.first_name)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <style>{datePickerStyles}</style>
      <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>

        {/* --- Header Panel --- */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 500, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
            Staff Directory
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              size="small"
              placeholder="Search name, role, email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              fullWidth={isMobile}
              InputProps={{
                startAdornment: (
                  <IconButton disabled sx={{ p: 0, mr: 1 }}>
                    <SearchIcon fontSize="small" />
                  </IconButton>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 300 }, bgcolor: 'white', borderRadius: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
              fullWidth={isMobile}
              sx={{ bgcolor: '#1a5fba', py: { xs: 1.25, sm: 1 } }}
            >
              Add Staff
            </Button>
          </Box>
        </Box>

        {/* --- Main Table Directory Layout --- */}
        <Paper sx={{ width: '100%', overflow: 'hidden', mb: 3, boxShadow: isMobile ? 0 : 1, bgcolor: isMobile ? 'transparent' : 'white' }}>
          {!isMobile ? (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell>Service (Yrs)</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>DBS Status</TableCell>
                    <TableCell>Right to Work</TableCell>
                    <TableCell>Documents</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={11} align="center">Loading...</TableCell></TableRow> :
                    staff.length === 0 ? <TableRow><TableCell colSpan={11} align="center">No staff found</TableCell></TableRow> :
                      staff.map((s) => {
                        const dbs = getDbsStatus(s.dbs_expiry);
                        const docs = getDocuments(s);
                        return (
                          <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewClick(s)}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: '#1a5fba', width: 32, height: 32 }}>
                                  {s.first_name?.[0] || ''}{s.last_name?.[0] || ''}
                                </Avatar>
                                <Box>
                                  <Typography sx={{ fontWeight: 'bold' }}>{s.title} {s.first_name} {s.last_name}</Typography>
                                  <Typography variant="caption" color="textSecondary">{s.ni_number}</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell><Chip label={s.role || 'Unassigned'} size="small" color="primary" variant="outlined" /></TableCell>
                            <TableCell>{s.email || '—'}</TableCell>
                            <TableCell>{s.phone || '—'}</TableCell>
                            <TableCell>{s.joined_date || '—'}</TableCell>
                            <TableCell>{calculateYearsService(s.joined_date)}</TableCell>
                            <TableCell>{calculateAge(s.dob)}</TableCell>
                            <TableCell><Chip label={dbs.label} color={dbs.color} size="small" /></TableCell>
                            <TableCell>
                              {s.right_to_work_expiry ? (
                                new Date(s.right_to_work_expiry) > new Date()
                                  ? <Chip label="Valid" color="success" size="small" />
                                  : <Chip label="Expired" color="error" size="small" />
                              ) : <Chip label="Not Set" color="default" size="small" />}
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              {docs.length > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip 
                                    label={`${docs.length} Files`} 
                                    size="small" 
                                    color="info" 
                                    variant="outlined"
                                    icon={<AttachFile fontSize="small" />}
                                    onClick={() => window.open(docs[0].url, '_blank')}
                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'info.light', color: 'white' } }}
                                  />
                                </Box>
                              ) : (
                                <Typography variant="caption" color="textSecondary">None</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center" onClick={e => e.stopPropagation()}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <IconButton color="primary" size="small" onClick={() => handleViewClick(s)} title="View">
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                                <IconButton color="info" size="small" onClick={() => handleEditClick(s)} title="Edit">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton color="error" size="small" onClick={() => handleDeleteClick(s.id, s.first_name)} title="Delete">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 0 }}>
              {loading ? <Typography align="center" sx={{ py: 4 }}>Loading...</Typography> :
                staff.length === 0 ? <Typography align="center" sx={{ py: 4 }}>No staff found</Typography> :
                  staff.map((s) => <StaffMobileCard key={s.id} s={s} />)}
            </Box>
          )}

          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={count}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </Paper>

        {/* --- ATTRACTIVE WIZARD MODAL DIALOG --- */}
        <Dialog
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          maxWidth="md"
          fullWidth
          scroll="paper"
          PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 24px 54px rgba(0,0,0,0.15)', overflow: 'hidden' } }}
        >
          {/* Banner */}
          <Box sx={{ background: 'linear-gradient(135deg, #1a5fba 0%, #0c1f3f 100%)', color: 'white', py: 3, px: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', p: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', justifyBox: 'center', backdropFilter: 'blur(4px)' }}>
              <ContactPage sx={{ fontSize: 32 }} />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <DialogTitle sx={{ p: 0, m: 0, fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
                {isViewing ? 'Staff Profile' : (currentId ? 'Modify Profile Details' : 'New Staff Onboarding')}
              </DialogTitle>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, fontWeight: 300 }}>
                {isViewing ? 'Complete overview of worker record files.' : 'Fill in structural wizard parameters step-by-step.'}
              </Typography>
            </Box>
            {!isViewing && (
              <Chip label={`Step ${activeStep + 1} of ${steps.length}`} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }} variant="outlined" />
            )}
          </Box>

          {!isViewing && (
            <Box sx={{ bgcolor: '#fff', pt: 3, pb: 1 }}>
              <Paper elevation={0}>
                <Stepper activeStep={activeStep} alternativeLabel={isMobile} sx={{ px: { xs: 1, sm: 4 } }}>
                  {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>
              </Paper>
            </Box>
          )}

          <DialogContent dividers sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#f8f9fa' }}>

            {/* STEP 1: MANDATORY DETAILS PANEL */}
            {((!isViewing && activeStep === 0) || isViewing) && (
              <Box display={isViewing || activeStep === 0 ? 'block' : 'none'}>
                <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
                  
                  {/* --- UPDATED: Title and First Name Combined --- */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <FormControl 
                        size="small" 
                        sx={{ minWidth: 90, bgcolor: 'white' }}
                        disabled={isViewing}
                      >
                        <InputLabel id="title-label">Title</InputLabel>
                        <Select
                          labelId="title-label"
                          value={formData.title || ''}
                          label="Title"
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        >
                          <MenuItem value="Mr.">Mr.</MenuItem>
                          <MenuItem value="Mrs.">Mrs.</MenuItem>
                          <MenuItem value="Ms.">Ms.</MenuItem>
                          <MenuItem value="Miss">Miss</MenuItem>
                          <MenuItem value="Dr.">Dr.</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        fullWidth
                        label="First Name *"  
                        size="small"
                        sx={{ bgcolor: 'white' }}
                        value={formData.first_name || ''}
                        disabled={isViewing}
                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                        error={!!errors.first_name}
                        helperText={errors.first_name}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Last Name *" 
                      size="small" 
                      sx={{ bgcolor: 'white' }} 
                      value={formData.last_name || ''} 
                      disabled={isViewing} 
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      error={!!errors.last_name}
                      helperText={errors.last_name}
                    />
                  </Grid>
                  
                  {/* Date of Birth */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography
                        component="label"
                        variant="caption"
                        sx={{
                          color: errors.dob ? 'error.main' : 'text.secondary',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          ml: 0.5
                        }}
                      >
                        Date of Birth *
                      </Typography>
                      <TextField
                        fullWidth
                        type="date"
                        size="small"
                        sx={{ bgcolor: 'white' }}
                        value={formData.dob || ''}
                        disabled={isViewing}
                        inputProps={{ max: "9999-12-31" }}
                        onChange={e => {
                          const val = e.target.value;
                          const yearPart = val.split('-')[0];
                          if (yearPart && yearPart.length > 4) return;
                          setFormData({ ...formData, dob: val });
                        }}
                        error={!!errors.dob}
                        helperText={errors.dob}
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} >
                    <TextField 
                      fullWidth 
                      label="NI Number *" 
                      placeholder="AB123456C" 
                      size="small" 
                      sx={{ bgcolor: 'white' }} 
                      value={formData.ni_number || ''} 
                      disabled={isViewing} 
                      onChange={e => setFormData({ ...formData, ni_number: e.target.value.toUpperCase() })} 
                      helperText={errors.ni_number || "Format: 2 letters, 6 numbers, 1 letter"}
                      error={!!errors.ni_number}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Email *" 
                      type="email" 
                      size="small" 
                      sx={{ bgcolor: 'white' }} 
                      value={formData.email || ''} 
                      disabled={isViewing} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Phone *" 
                      size="small" 
                      sx={{ bgcolor: 'white' }} 
                      value={formData.phone || ''} 
                      disabled={isViewing} 
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                  </Grid>
                  
                  {/* Joined Date */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography
                        component="label"
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          ml: 0.5
                        }}
                      >
                        Joined Date
                      </Typography>
                      <TextField
                        fullWidth
                        type="date"
                        size="small"
                        sx={{ bgcolor: 'white' }}
                        value={formData.joined_date || ''}
                        disabled={isViewing}
                        inputProps={{ max: "9999-12-31" }}
                        onChange={e => {
                          const val = e.target.value;
                          const yearPart = val.split('-')[0];
                          if (yearPart && yearPart.length > 4) return;
                          setFormData({ ...formData, joined_date: val });
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Years of Service" 
                      size="small" 
                      value={calculateYearsService(formData.joined_date) || 0} 
                      disabled 
                      InputProps={{ readOnly: true }} 
                    />
                  </Grid>
                  
                  {/* Compliance Check Section */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', mb: 2, mt: 1 }}>
                      <AdminPanelSettings fontSize="small" /> Compliance Check
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                      <Chip label={`Age Check: ${calculateAge(formData.dob)}`} variant="outlined" color={calculateAge(formData.dob) >= 18 ? "success" : "error"} />
                      {getDbsStatus(formData.dbs_expiry).label !== 'No DBS' && (
                        <Chip label={`DBS Tracking: ${getDbsStatus(formData.dbs_expiry).label}`} color={getDbsStatus(formData.dbs_expiry).color} />
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* STEP 2: ADDITIONAL COMPLIANCE & CUSTOM FIELD PANEL */}
            {((!isViewing && activeStep === 1) || isViewing) && (
              <Box display={isViewing || activeStep === 1 ? 'block' : 'none'} sx={{ mt: isViewing ? 4 : 0 }}>
                {isViewing && <Typography variant="h6" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>Additional Details</Typography>}
                <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" variant="outlined" sx={{ bgcolor: 'white' }}>
                      <InputLabel id="role-category-select-label" shrink>Role Category</InputLabel>
                      <Select
                        labelId="role-category-select-label"
                        value={formData.role || ''}
                        notched={true}
                        label="Role Category"
                        disabled={isViewing}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                      >
                        <MenuItem value="" disabled><em>Select a Role Category...</em></MenuItem>
                        {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  {!isViewing && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField size="small" placeholder="New system role..." value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} sx={{ flexGrow: 1, bgcolor: 'white' }} />
                        <Button size="small" variant="contained" sx={{ bgcolor: '#0c1f3f', px: 2, height: '40px' }} onClick={handleAddRole}>Quick Add</Button>
                      </Box>
                    </Grid>
                  )}

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Contracted Hours" type="number" size="small" sx={{ bgcolor: 'white' }} value={formData.contracted_hours || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, contracted_hours: e.target.value })} />
                  </Grid>

                  {!isViewing && (
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Initial Password" type="password" size="small" sx={{ bgcolor: 'white' }} value={formData.temp_password || ''} onChange={e => setFormData({ ...formData, temp_password: e.target.value })} helperText="Leave blank to keep existing" />
                    </Grid>
                  )}

                  {/* Right to Work Expiry */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography
                        component="label"
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          ml: 0.5
                        }}
                      >
                        Right to Work Expiry
                      </Typography>
                      <TextField
                        fullWidth
                        type="date"
                        size="small"
                        sx={{ bgcolor: 'white' }}
                        value={formData.right_to_work_expiry || ''}
                        disabled={isViewing}
                        inputProps={{ max: "9999-12-31" }}
                        onChange={e => {
                          const val = e.target.value;
                          const yearPart = val.split('-')[0];
                          if (yearPart && yearPart.length > 4) return;
                          setFormData({ ...formData, right_to_work_expiry: val });
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                    <FormControlLabel control={<Checkbox checked={!!formData.dbs_checked} disabled={isViewing} onChange={e => setFormData({ ...formData, dbs_checked: e.target.checked })} />} label="DBS Checked?" />
                  </Grid>

                  {/* DBS Expiry Date */}
                  {formData.dbs_checked && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography
                          component="label"
                          variant="caption"
                          sx={{
                            color: errors.dbs_expiry ? 'error.main' : 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            ml: 0.5
                          }}
                        >
                          DBS Expiry Date *
                        </Typography>
                        <TextField
                          fullWidth
                          type="date"
                          size="small"
                          sx={{ bgcolor: 'white' }}
                          value={formData.dbs_expiry || ''}
                          disabled={isViewing}
                          inputProps={{ max: "9999-12-31" }}
                          onChange={e => {
                            const val = e.target.value;
                            const yearPart = val.split('-')[0];
                            if (yearPart && yearPart.length > 4) return;
                            setFormData({ ...formData, dbs_expiry: val });
                          }}
                          error={!!errors.dbs_expiry}
                          helperText={errors.dbs_expiry}
                        />
                      </Box>
                    </Grid>
                  )}

                  {/* DYNAMIC COLUMNS SECTION */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Additional Fields</Typography>
                      {!isViewing && <Button size="small" variant="outlined" onClick={handleAddCustomField} startIcon={<AddIcon />}>+ Add Field</Button>}
                    </Box>
                  </Grid>

                  {dynamicColumns.length > 0 ? (
                    dynamicColumns.map(colName => (
                      <Grid item xs={12} sm={6} key={colName}>
                        <TextField 
                          fullWidth 
                          label={formatLabel(colName)} 
                          size="small" 
                          sx={{ bgcolor: 'white' }} 
                          value={formData[colName] || ''} 
                          disabled={isViewing} 
                          onChange={e => {
                            setFormData({ ...formData, [colName]: e.target.value });
                          }} 
                        />
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                        No custom fields defined yet. Click "+ Add Field" to create one.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* STEP 3: DYNAMIC DOCUMENTS CONTAINER */}
            {((!isViewing && activeStep === 2) || isViewing) && (
              <Box display={isViewing || activeStep === 2 ? 'block' : 'none'} sx={{ mt: isViewing ? 4 : 0 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description color="primary" /> Attached Documents Repository
                </Typography>

                {!isViewing && (
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ height: 64, justifyContent: 'center', textTransform: 'none', borderStyle: 'dashed', mb: 3, bgcolor: 'white' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CloudUpload color="primary" sx={{ fontSize: 28 }} />
                      <Typography variant="body1">{uploadingFiles ? "Processing Storage uploads..." : "Select Files for Multi-Upload"}</Typography>
                    </Box>
                    <input type="file" multiple hidden onChange={handleFileUpload} disabled={uploadingFiles} />
                  </Button>
                )}

                {formData.documents && formData.documents.length > 0 ? (
                  <List dense sx={{ bgcolor: 'white', borderRadius: 2, border: '1px solid #e0e0e0', p: 1 }}>
                    {formData.documents.map((doc, idx) => (
                      <ListItem
                        key={idx}
                        secondaryAction={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button size="small" variant="text" href={doc.url} target="_blank" rel="noreferrer">Open URL</Button>
                            {!isViewing && (
                              <IconButton edge="end" size="small" onClick={() => handleRemoveDoc(idx)}>
                                <DeleteIcon fontSize="small" color="error" />
                              </IconButton>
                            )}
                          </Stack>
                        }
                      >
                        <ListItemIcon>
                          <AttachFile color="secondary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={doc.name}
                          secondary={doc.uploaded_at ? `Uploaded: ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                          primaryTypographyProps={{ fontWeight: 500, color: '#2c3e50' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4, border: '1px dashed #ccc', borderRadius: 2, bgcolor: 'white' }}>
                    No documentation attachments registered for this worker asset profile.
                  </Typography>
                )}
              </Box>
            )}

          </DialogContent>

          <DialogActions sx={{ p: 3, px: 4, bgcolor: '#fff', borderTop: '1px solid #f0f0f0', gap: 1 }}>
            {isViewing ? (
              <Button variant="contained" sx={{ bgcolor: '#0c1f3f', px: 4 }} onClick={() => setModalOpen(false)}>Close Profile View</Button>
            ) : (
              <>
                {activeStep === 0 && <Button sx={{ color: '#6c757d' }} onClick={() => setModalOpen(false)}>Cancel</Button>}
                {activeStep > 0 && <Button sx={{ color: '#6c757d' }} onClick={() => setActiveStep(prev => prev - 1)} startIcon={<ArrowBack />}>Back</Button>}

                {activeStep < steps.length - 1 ? (
                  <Button 
                    variant="contained" 
                    sx={{ bgcolor: '#1a5fba' }} 
                    onClick={() => {
                      if (activeStep === 0) {
                        if (!validateStep1()) {
                          setNotification({ open: true, message: "Please fix validation errors before proceeding.", severity: 'warning' });
                          return;
                        }
                      }
                      setActiveStep(prev => prev + 1);
                    }} 
                    endIcon={<ArrowForward />}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button variant="contained" sx={{ bgcolor: '#1a5fba', fontWeight: 'bold', px: 3 }} onClick={handleSave}>Save Staff Member</Button>
                )}
              </>
            )}
          </DialogActions>
        </Dialog>

        <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
          <Alert severity={notification.severity} variant="filled">{notification.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default Staff;