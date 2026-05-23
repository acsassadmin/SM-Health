import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, InputLabel, FormControl, IconButton, TablePagination, Snackbar, Alert,
  Stepper, Step, StepLabel, Checkbox, FormControlLabel, Divider, Grid, Card, CardContent,
  useTheme, useMediaQuery, Stack, List, ListItem, ListItemText, ListItemIcon
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
  AttachFile
} from '@mui/icons-material';

const Staff = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- Core List State ---
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // --- Dynamic Roles From DB ---
  const [roles, setRoles] = useState([]);
  const [newRoleInput, setNewRoleInput] = useState('');

  // --- Custom Fields ---
  const [customFields, setCustomFields] = useState([]);

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
  // UPDATED: Added Step 3
  const steps = ['Mandatory Details', 'Additional Details', 'Documents'];

  // --- Form State ---
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', dob: '', email: '', phone: '', ni_number: '', joined_date: '',
    contracted_hours: '', right_to_work_expiry: '', dbs_checked: false, dbs_expiry: '', role: '', temp_password: '',
    custom_data: {},
    documents: [] // <-- NEW: Stores array of file objects
  });
  
  // State for file upload UI
  const [uploadingFiles, setUploadingFiles] = useState(false);


  useEffect(() => {
    fetchStaff();
  }, [page, rowsPerPage, searchTerm]);

  useEffect(() => {
    fetchRoleCategories();
  }, []);

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
      console.error('Error fetching role categories:', err);
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
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
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
      first_name: '', last_name: '', dob: '', email: '', phone: '', ni_number: '', joined_date: new Date().toISOString().split('T')[0],
      contracted_hours: '', right_to_work_expiry: '', dbs_checked: false, dbs_expiry: '', role: '', temp_password: '',
      custom_data: {},
      documents: [] // Reset documents
    });
    setCurrentId(null);
  };

  const populateForm = (staffMember) => {
    setFormData({
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
      custom_data: staffMember.custom_data || {},
      documents: staffMember.documents || [] // Load existing docs
    });
    setCurrentId(staffMember.id);
  };

  const handleSave = async () => {
    const { first_name, last_name, dob, email, phone, ni_number, dbs_checked, dbs_expiry } = formData;

    if (!first_name || !last_name || !dob || !email || !phone || !ni_number) {
      setNotification({ open: true, message: "Please fill in all mandatory fields.", severity: 'warning' });
      setActiveStep(0);
      return;
    }

    if (dbs_checked && !dbs_expiry) {
      setNotification({ open: true, message: "DBS Expiry Date is required if DBS is checked.", severity: 'warning' });
      setActiveStep(1);
      return;
    }

    const payload = { ...formData };

    const age = calculateAge(dob);
    if (age < 18) {
      setNotification({ open: true, message: "Staff must be 18 years or older.", severity: 'error' });
      return;
    }

    if (!payload.temp_password) delete payload.temp_password;

    let error;
    if (currentId) {
      const { error: updateError } = await supabase
        .from('staff')
        .update(payload)
        .eq('id', currentId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('staff').insert([payload]);
      error = insertError;
    }

    if (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    } else {
      setModalOpen(false);
      setNotification({ open: true, message: currentId ? 'Staff updated successfully' : 'Staff onboarded successfully', severity: 'success' });
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

  const handleAddCustomField = () => {
    const label = prompt("Enter field label (e.g. 'Emergency Contact'):");
    if (label) {
      setCustomFields([...customFields, { id: Date.now(), label, type: 'text' }]);
    }
  };

  // --- FILE UPLOAD LOGIC ---
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const newDocs = [...formData.documents];

    try {
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name}`;
        // Upload to Storage (Assuming 'staff-documents' bucket exists)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('staff-documents')
          .upload(`staff-docs/${fileName}`, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue; 
        }

        const { data: publicUrlData } = supabase.storage
          .from('staff-documents')
          .getPublicUrl(`staff-docs/${fileName}`);

        // Add to form state (in memory)
        newDocs.push({
          name: file.name,
          url: publicUrlData.publicUrl,
          uploaded_at: new Date().toISOString()
        });
      }

      setFormData({ ...formData, documents: newDocs });
    } catch (err) {
      console.error(err);
      setNotification({ open: true, message: 'Failed to upload files', severity: 'error' });
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

    return (
      <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 2 }} onClick={() => handleViewClick(s)}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1a5fba', width: 40, height: 40 }}>
              {s.first_name?.[0] || ''}{s.last_name?.[0] || ''}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#0c1f3f' }}>
                {s.first_name} {s.last_name}
              </Typography>
              <Typography variant="caption" color="textSecondary">{s.ni_number || 'No NI'}</Typography>
            </Box>
            <Chip label={s.role || 'Unassigned'} size="small" color="primary" variant="outlined" />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Grid container spacing={1} sx={{ mb: 2, mt: 0.5 }}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary" display="block">Email</Typography>
              <Typography variant="body2" sx={{ noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}>{s.email || '—'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary" display="block">Phone</Typography>
              <Typography variant="body2">{s.phone || '—'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary" display="block">DBS Status</Typography>
              <Chip label={dbs.label} color={dbs.color} size="small" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary" display="block">Right to Work</Typography>
              {rtwValid === true && <Chip label="Valid" color="success" size="small" sx={{ mt: 0.5 }} />}
              {rtwValid === false && <Chip label="Expired" color="error" size="small" sx={{ mt: 0.5 }} />}
              {rtwValid === null && <Chip label="Not Set" color="default" size="small" sx={{ mt: 0.5 }} />}
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

  // ─────────────────────────────────────────────────────────────
  // MAIN COMPONENT RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>

      {/* --- Header --- */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <Typography variant="h4" sx={{ fontWeight: 500, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          Staff Directory
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          width: { xs: '100%', sm: 'auto' },
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
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

      {/* --- Responsive Content Container --- */}
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
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={10} align="center">Loading...</TableCell></TableRow> :
                  staff.length === 0 ? <TableRow><TableCell colSpan={10} align="center">No staff found</TableCell></TableRow> :
                    staff.map((s) => {
                      const dbs = getDbsStatus(s.dbs_expiry);
                      return (
                        <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewClick(s)}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: '#1a5fba', width: 32, height: 32 }}>
                                {s.first_name?.[0] || ''}{s.last_name?.[0] || ''}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontWeight: 'bold' }}>{s.first_name} {s.last_name}</Typography>
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

      {/* --- ATTRACTIVE WIZARD MODAL --- */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 24px 54px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }}
      >
        {/* Gradient Header banner */}
        <Box sx={{
          background: 'linear-gradient(135deg, #1a5fba 0%, #0c1f3f 100%)',
          color: 'white',
          py: 3,
          px: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            p: 1.5,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
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
            <Chip
              label={`Step ${activeStep + 1} of ${steps.length}`}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}
              variant="outlined"
            />
          )}
        </Box>

        {!isViewing && (
          <Box sx={{ bgcolor: '#fff', pt: 3, pb: 1 }}>
            <Stepper activeStep={activeStep} alternativeLabel={isMobile} sx={{ px: { xs: 1, sm: 4 } }}>
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
          </Box>
        )}

        <DialogContent dividers sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#f8f9fa' }}>

          {/* STEP 1: MANDATORY DETAILS DISPLAY PANEL */}
          {(!isViewing && activeStep === 0) || isViewing ? (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="First Name *" size="small" sx={{ bgcolor: 'white' }} value={formData.first_name} disabled={isViewing} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Last Name *" size="small" sx={{ bgcolor: 'white' }} value={formData.last_name} disabled={isViewing} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  type="date" 
                  label="Date of Birth *" 
                  InputLabelProps={{ shrink: true }} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'white',
                    '& .MuiInputLabel-root': { transform: 'translate(14px, -6px) scale(0.75)' }
                  }} 
                  value={formData.dob} 
                  disabled={isViewing} 
                  onChange={e => setFormData({...formData, dob: e.target.value})} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="NI Number *" placeholder="AB123456C" size="small" sx={{ bgcolor: 'white' }} value={formData.ni_number} disabled={isViewing} onChange={e => setFormData({ ...formData, ni_number: e.target.value.toUpperCase() })} helperText="Format: 2 letters, 6 numbers, 1 letter" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email *" type="email" size="small" sx={{ bgcolor: 'white' }} value={formData.email} disabled={isViewing} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone *" size="small" sx={{ bgcolor: 'white' }} value={formData.phone} disabled={isViewing} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  type="date" 
                  label="Joined Date" 
                  InputLabelProps={{ shrink: true }} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'white',
                    '& .MuiInputLabel-root': { transform: 'translate(14px, -6px) scale(0.75)' }
                  }} 
                  value={formData.joined_date} 
                  disabled={isViewing} 
                  onChange={e => setFormData({...formData, joined_date: e.target.value})} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Years of Service" size="small" value={calculateYearsService(formData.joined_date)} disabled InputProps={{ readOnly: true }} />
              </Grid>

              {/* Compliance Layout Check Chips Block */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                  <AdminPanelSettings fontSize="small" /> Compliance Overview
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Chip label={`Age Check: ${calculateAge(formData.dob)}`} variant="outlined" color={calculateAge(formData.dob) >= 18 ? "success" : "error"} />
                  {getDbsStatus(formData.dbs_expiry).label !== 'No DBS' && (
                    <Chip label={`DBS Tracking: ${getDbsStatus(formData.dbs_expiry).label}`} color={getDbsStatus(formData.dbs_expiry).color} />
                  )}
                </Stack>
              </Grid>
            </Grid>
          ) : null}

          {/* STEP 2: ADDITIONAL COMPLIANCE FIELD DETAILS PANEL */}
          {(!isViewing && activeStep === 1) && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" variant="outlined" sx={{ bgcolor: 'white' }}>
                  <InputLabel id="role-category-select-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
                    Role Category
                  </InputLabel>
                  <Select
                    labelId="role-category-select-label"
                    value={formData.role}
                    displayEmpty
                    notched={true}
                    label="Role Category"
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    renderValue={(selected) => {
                      if (!selected) {
                        return <Typography color="textSecondary">Select a Role Category...</Typography>;
                      }
                      return selected;
                    }}
                  >
                    <MenuItem value="" disabled><em>Select a Role Category...</em></MenuItem>
                    {roles.map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField 
                    size="small" 
                    placeholder="New system role..." 
                    value={newRoleInput} 
                    onChange={e => setNewRoleInput(e.target.value)} 
                    sx={{ flexGrow: 1, bgcolor: 'white' }} 
                  />
                  <Button size="small" variant="contained" sx={{ bgcolor: '#0c1f3f', px: 2 }} onClick={handleAddRole}>
                    Quick Add
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Contracted Hours" type="number" size="small" sx={{ bgcolor: 'white' }} value={formData.contracted_hours} onChange={e => setFormData({ ...formData, contracted_hours: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Initial Password" type="password" size="small" sx={{ bgcolor: 'white' }} value={formData.temp_password} onChange={e => setFormData({ ...formData, temp_password: e.target.value })} helperText="Leave blank to keep existing" />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  type="date" 
                  label="Right to Work Expiry" 
                  InputLabelProps={{ shrink: true }} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'white',
                    '& .MuiInputLabel-root': { transform: 'translate(14px, -6px) scale(0.75)' }
                  }} 
                  value={formData.right_to_work_expiry} 
                  onChange={e => setFormData({...formData, right_to_work_expiry: e.target.value})} 
                />
              </Grid>

              <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel 
                  control={<Checkbox checked={formData.dbs_checked} onChange={e => setFormData({...formData, dbs_checked: e.target.checked})} />} 
                  label="DBS Checked?" 
                />
              </Grid>

              {formData.dbs_checked && (
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    type="date" 
                    label="DBS Expiry Date *" 
                    InputLabelProps={{ shrink: true }} 
                    size="small" 
                    sx={{ 
                      bgcolor: 'white',
                      '& .MuiInputLabel-root': { transform: 'translate(14px, -6px) scale(0.75)' }
                    }} 
                    value={formData.dbs_expiry} 
                    onChange={e => setFormData({...formData, dbs_expiry: e.target.value})} 
                    required 
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Additional Custom Fields</Typography>
                  <Button size="small" variant="outlined" onClick={handleAddCustomField}>+ Add Field</Button>
                </Box>
              </Grid>

              {customFields.map(field => (
                <Grid item xs={12} sm={6} key={field.id}>
                  <TextField fullWidth label={field.label} size="small" sx={{ bgcolor: 'white' }} value={formData.custom_data[field.label] || ''} onChange={e => {
                    const newCustom = { ...formData.custom_data, [field.label]: e.target.value };
                    setFormData({ ...formData, custom_data: newCustom });
                  }} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* --- NEW STEP 3: DOCUMENTS UPLOAD --- */}
          {(!isViewing && activeStep === 2) && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Upload Documents</Typography>
              
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ height: 56, justifyContent: 'flex-start', textTransform: 'none', borderStyle: 'dashed', mb: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CloudUpload color="primary" />
                  {uploadingFiles ? "Uploading..." : "Select Files to Upload"}
                </Box>
                <input type="file" multiple hidden onChange={handleFileUpload} disabled={uploadingFiles} />
              </Button>

              {/* List Uploaded Files */}
              {formData.documents.length > 0 ? (
                <List dense>
                  {formData.documents.map((doc, idx) => (
                    <ListItem 
                      key={idx} 
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => handleRemoveDoc(idx)}>
                          <Delete fontSize="small" color="error" />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <Description fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={doc.name} 
                        secondary={new Date(doc.uploaded_at).toLocaleDateString()}
                        primaryTypographyProps={{ fontSize: '0.9rem' }}
                      />
                      <Button size="small" href={doc.url} target="_blank" sx={{ml: 1}}>View</Button>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4, border: '1px dashed #ccc', borderRadius: 1 }}>
                  No documents uploaded yet.
                </Typography>
              )}
            </Box>
          )}

        </DialogContent>

        <DialogActions sx={{ p: 3, px: 4, bgcolor: '#fff', borderTop: '1px solid #f0f0f0', gap: 1 }}>
          {isViewing ? (
            <Button variant="contained" sx={{ bgcolor: '#0c1f3f', px: 4 }} onClick={() => setModalOpen(false)}>Close Profile</Button>
          ) : (
            <>
              {activeStep === 0 && <Button sx={{ color: '#6c757d' }} onClick={() => setModalOpen(false)}>Cancel</Button>}
              {activeStep > 0 && <Button sx={{ color: '#6c757d' }} onClick={() => setActiveStep(prev => prev - 1)} startIcon={<ArrowBack />}>Back</Button>}
              
              {activeStep < steps.length - 1 ? (
                <Button variant="contained" sx={{ bgcolor: '#1a5fba' }} onClick={() => setActiveStep(prev => prev + 1)} endIcon={<ArrowForward />}>Next Step</Button>
              ) : (
                <Button variant="contained" sx={{ bgcolor: '#1a5fba', fontWeight: 'bold', px: 3 }} onClick={handleSave}>Save Staff Member</Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Staff;