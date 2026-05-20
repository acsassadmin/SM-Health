import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, 
  Select, MenuItem, InputLabel, FormControl, IconButton, TablePagination, Snackbar, Alert,
  Stepper, Step, StepLabel, Checkbox, FormControlLabel, Divider, Grid, Card, CardContent
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Visibility as ViewIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  ArrowBack, 
  ArrowForward 
} from '@mui/icons-material';

const Staff = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  // --- Dynamic Roles State ---
  const [roles, setRoles] = useState([
    'Health Care Assistant', 'Senior Health Care Assistant', 'Nurse', 
    'Senior Nurse', 'Admin Staff', 'Accountant', 'Team Leader', 'HR Officer'
  ]);
  const [newRoleInput, setNewRoleInput] = useState('');
  
  // --- Custom Fields (Future Proofing) ---
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
  const steps = ['Mandatory Details', 'Additional Details'];

  // --- Form State (Merged) ---
  const [formData, setFormData] = useState({
    // Mandatory
    first_name: '', last_name: '', dob: '', email: '', phone: '', ni_number: '', joined_date: '',
    // Additional
    contracted_hours: '', right_to_work_expiry: '', dbs_checked: false, dbs_expiry: '', role: '', temp_password: '',
    // Custom
    custom_data: {} 
  });

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────
  
  useEffect(() => {
    fetchStaff();
  }, [page, rowsPerPage, searchTerm]);

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

  // ─────────────────────────────────────────────────────────────
  // CALCULATED HELPERS
  // ─────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────

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
    setIsViewing(false); // Enable editing
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
      custom_data: {}
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
      custom_data: staffMember.custom_data || {}
    });
    setCurrentId(staffMember.id);
  };

  const handleSave = async () => {
    // Basic Validation
    const { first_name, last_name, dob, email, phone, ni_number, dbs_checked, dbs_expiry } = formData;
    
    // Mandatory Step Validation
    if (!first_name || !last_name || !dob || !email || !phone || !ni_number) {
      setNotification({ open: true, message: "Please fill in all mandatory fields.", severity: 'warning' });
      setActiveStep(0);
      return;
    }

    // Additional Step Validation (Conditional)
    if (dbs_checked && !dbs_expiry) {
      setNotification({ open: true, message: "DBS Expiry Date is required if DBS is checked.", severity: 'warning' });
      setActiveStep(1);
      return;
    }

    const payload = { ...formData };

    // Age Validation (18+)
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

  // ─────────────────────────────────────────────────────────────
  // DYNAMIC ROLE MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  
  const handleAddRole = () => {
    if (newRoleInput && !roles.includes(newRoleInput)) {
      setRoles([...roles, newRoleInput]);
      setNewRoleInput('');
      setNotification({ open: true, message: 'New role category added', severity: 'success' });
    }
  };

  const handleAddCustomField = () => {
    const label = prompt("Enter field label (e.g. 'Emergency Contact'):");
    if (label) {
      setCustomFields([...customFields, { id: Date.now(), label, type: 'text' }]);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
      
      {/* --- Header --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 500 }}>Staff Directory</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', position: 'relative' }}>
          <SearchIcon sx={{ position: 'absolute', left: 10, color: 'text.secondary', zIndex: 1, pointerEvents: 'none' }} />
          <TextField 
            size="small" placeholder="Search name, role, email..." 
            value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: 300, '& .MuiInputBase-root': { pl: 4 } }} 
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>Add Staff</Button>
        </Box>
      </Box>

      {/* --- Table --- */}
      <Paper sx={{ width: '100%', overflow: 'hidden', mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
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
                          {s.first_name[0]}{s.last_name[0]}
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

      {/* --- Modal (Wizard) --- */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ fontFamily: 'serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{isViewing ? 'Staff Profile' : (currentId ? 'Edit Staff' : 'New Staff Onboarding')}</span>
          {!isViewing && activeStep === 1 && (
             <Box sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Step 2 of 2</Box>
          )}
        </DialogTitle>

        {!isViewing && (
          <Stepper activeStep={activeStep} sx={{ px: 3, pb: 2 }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}

        <DialogContent dividers>
          {/* STEP 1: MANDATORY */}
          {(!isViewing && activeStep === 0) || (isViewing) ? (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="First Name *" size="small" value={formData.first_name} disabled={isViewing} onChange={e => setFormData({...formData, first_name: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last Name *" size="small" value={formData.last_name} disabled={isViewing} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Date of Birth *" InputLabelProps={{shrink:true}} size="small" value={formData.dob} disabled={isViewing} onChange={e => setFormData({...formData, dob: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="NI Number *" placeholder="AB123456C" size="small" value={formData.ni_number} disabled={isViewing} onChange={e => setFormData({...formData, ni_number: e.target.value.toUpperCase()})} helperText="Format: 2 letters, 6 numbers, 1 letter" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Email *" type="email" size="small" value={formData.email} disabled={isViewing} onChange={e => setFormData({...formData, email: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Phone *" size="small" value={formData.phone} disabled={isViewing} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Joined Date" InputLabelProps={{shrink:true}} size="small" value={formData.joined_date} disabled={isViewing} onChange={e => setFormData({...formData, joined_date: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                 {/* Read Only Calculated Field in Modal */}
                 <TextField fullWidth label="Years of Service" size="small" value={calculateYearsService(formData.joined_date)} disabled InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12}><Divider sx={{my:1}} /><Typography variant="subtitle2" color="primary">Compliance Overview</Typography></Grid>
              <Grid item xs={6}>
                 <Chip label={`Age: ${calculateAge(formData.dob)}`} variant="outlined" size="small" />
              </Grid>
              <Grid item xs={6}>
                 {getDbsStatus(formData.dbs_expiry).label !== 'No DBS' && (
                    <Chip label={getDbsStatus(formData.dbs_expiry).label} color={getDbsStatus(formData.dbs_expiry).color} size="small" />
                 )}
              </Grid>
            </Grid>
          ) : null }

          {/* STEP 2: ADDITIONAL */}
          {(!isViewing && activeStep === 1) && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role Category</InputLabel>
                  <Select value={formData.role} label="Role Category" onChange={e => setFormData({...formData, role: e.target.value})}>
                    {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField size="small" placeholder="Add new role..." value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} sx={{ flexGrow: 1 }} />
                  <Button size="small" variant="outlined" onClick={handleAddRole}>Add</Button>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <TextField fullWidth label="Contracted Hours" type="number" size="small" value={formData.contracted_hours} onChange={e => setFormData({...formData, contracted_hours: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                 <TextField fullWidth label="Initial Password" type="password" size="small" value={formData.temp_password} onChange={e => setFormData({...formData, temp_password: e.target.value})} helperText="Leave blank to keep existing" />
              </Grid>

              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Right to Work Expiry" InputLabelProps={{shrink:true}} size="small" value={formData.right_to_work_expiry} onChange={e => setFormData({...formData, right_to_work_expiry: e.target.value})} />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel 
                  control={<Checkbox checked={formData.dbs_checked} onChange={e => setFormData({...formData, dbs_checked: e.target.checked})} />} 
                  label="DBS Checked?" 
                />
              </Grid>

              {formData.dbs_checked && (
                <Grid item xs={6}>
                  <TextField fullWidth type="date" label="DBS Expiry Date *" InputLabelProps={{shrink:true}} size="small" value={formData.dbs_expiry} onChange={e => setFormData({...formData, dbs_expiry: e.target.value})} required />
                </Grid>
              )}

              {/* Dynamic Custom Fields Section */}
              <Grid item xs={12}><Divider sx={{my:1}} />
                <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <Typography variant="subtitle2">Additional Custom Fields</Typography>
                  <Button size="small" onClick={handleAddCustomField}>+ Add Field</Button>
                </Box>
              </Grid>
              
              {customFields.map(field => (
                <Grid item xs={12} key={field.id}>
                  <TextField fullWidth label={field.label} size="small" value={formData.custom_data[field.label] || ''} onChange={e => {
                    const newCustom = { ...formData.custom_data, [field.label]: e.target.value };
                    setFormData({ ...formData, custom_data: newCustom });
                  }} />
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          {isViewing ? (
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          ) : (
            <>
              {activeStep === 1 && <Button onClick={() => setActiveStep(0)} startIcon={<ArrowBack />}>Back</Button>}
              {activeStep === 0 && <Button onClick={() => setModalOpen(false)}>Cancel</Button>}
              {activeStep === 0 ? (
                <Button variant="contained" onClick={() => setActiveStep(1)} endIcon={<ArrowForward />}>Next Step</Button>
              ) : (
                <Button variant="contained" onClick={handleSave}>Save Staff Member</Button>
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