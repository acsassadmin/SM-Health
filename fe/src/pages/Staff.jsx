import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, InputLabel, FormControl, IconButton, TablePagination,
  Stepper, Step, StepLabel, Checkbox, FormControlLabel, Divider, Grid, Card, CardContent,
  useTheme, useMediaQuery, Stack, List, ListItem, ListItemText, ListItemIcon, CircularProgress, styled, Alert
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
  LocationOn,
  Work,
  Person,
  CheckCircle,
  Error as ErrorIcon,
  WarningAmber,
  AccountBalance,
  Badge
} from '@mui/icons-material';

// --- MUI X DATE PICKER IMPORTS ---
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import dayjs from 'dayjs';

// --- STYLING CONSTANTS ---

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

const GradientButton = styled(Button)(({ theme, colorType = 'primary' }) => ({
  background: colorType === 'primary'
    ? 'linear-gradient(45deg, #1a5fba 30%, #0c1f3f 90%)'
    : colorType === 'success'
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

const FormSectionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: 2,
  border: '1px solid #e0e0e0',
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
}));

const SYSTEM_COLUMNS = [
  'id', 'created_at', 'updated_at', 
  'first_name', 'last_name', 'dob', 'email', 'phone', 'ni_number', 'joined_date', 
  'role', 'contracted_hours', 'right_to_work_expiry', 
  'dbs_checked', 'dbs_expiry', 'custom_data', 'title',
  'gender', 'nationality', 'driving_license',
  'address_line_1', 'address_line_2', 'address_line_3', 'city', 'county', 'postcode',
  'employment_status', 'pay_rate', 'working_hours_weekly',
  'bank_name', 'branch', 'account_no'
];

const Staff = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- Core List State ---
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- State for Attractive Info/Success Modal ---
  const [infoModal, setInfoModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'success' 
  });

  // --- Dynamic Roles ---
  const [roles, setRoles] = useState([]);
  const [newRoleInput, setNewRoleInput] = useState('');

  // --- Dynamic Columns ---
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [columnLabels, setColumnLabels] = useState({});

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
  const steps = [
    'Mandatory Details', 
    'Personal Details', 
    'Address', 
    'Employment & Bank', 
    'Documents'
  ];

  // --- Form State ---
  const [formData, setFormData] = useState({
    title: 'Mr.',
    first_name: '', last_name: '', dob: '', email: '', phone: '', ni_number: '', joined_date: '',
    contracted_hours: '', right_to_work_expiry: '', dbs_checked: false, dbs_expiry: '', role: '', temp_password: '',
    gender: '', nationality: '', driving_license: '',
    address_line_1: '', address_line_2: '', address_line_3: '', city: '', county: '', postcode: '',
    employment_status: '', pay_rate: '', working_hours_weekly: '',
    bank_name: '', branch: '', account_no: '',
    documents: []
  });

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // --- STRICT YEAR SANITIZER EFFECT (Fixed) ---
  useEffect(() => {
    const dateFields = ['dob', 'joined_date', 'right_to_work_expiry', 'dbs_expiry'];
    
    dateFields.forEach(field => {
      const dateVal = formData[field];
      // Only sanitize if it looks like a date string (has hyphens) to avoid breaking partial inputs
      if (dateVal && dateVal.includes('-')) {
        const parts = dateVal.split('-');
        // If the year (part 0) is longer than 4 digits, slice it.
        if (parts[0] && parts[0].length > 4) {
          setFormData(prev => ({
            ...prev,
            [field]: `${parts[0].substring(0, 4)}-${parts.slice(1).join('-')}`
          }));
        }
      }
    });
  }, [formData.dob, formData.joined_date, formData.right_to_work_expiry, formData.dbs_expiry]);

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
    fetchDynamicSchema();
  }, []);

  // --- HANDLERS ---

  const handleDateKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
    ) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleDateChange = (e, field) => {
    let val = e.target.value;
    const today = new Date().toISOString().split('T')[0];
    
    // Logic: DOB and Joined Date cannot be in the future. 
    // Right to Work CAN be in the future (expiry date), but we keep the sanitizer logic.
    if (field === 'dob' || field === 'joined_date') {
      if (val > today) val = today;
    }

    setFormData({ ...formData, [field]: val });
  };

  // Restrict Bank Name and Branch to Alphanumeric and spaces only
  const handleAlphaNumericChange = (e, field) => {
    const val = e.target.value;
    const regex = /^[a-zA-Z0-9\s]*$/; // Allows Letters, Numbers, Spaces
    
    if (val === '' || regex.test(val)) {
      setFormData({ ...formData, [field]: val });
    }
  };

  // Restrict Pay Rate to numbers and decimals only
  const handleNumericChange = (e, field) => {
    const val = e.target.value;
    // Allow digits, optional decimal point, and empty string
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setFormData({ ...formData, [field]: val });
    }
  };

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
      setInfoModal({ open: true, message: 'Failed to load staff', severity: 'error' });
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
        setInfoModal({ open: true, title: 'Role Added', message: 'New role category added to system', type: 'success' });
      } catch (err) {
      
        setInfoModal({ open: true, title: 'Error', message: 'Failed to save new role category', type: 'error' });
      }
    }
  };

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

  // --- UPDATED: Fetch schema whenever opening the Add Modal ---
  const handleAddClick = async () => {
    setLoading(true); // Show loading indicator while fetching schema
    await fetchDynamicSchema(); // 1. Get the latest columns from DB
    setLoading(false);
    
    resetForm();
    setActiveStep(0);
    setIsViewing(false);
    setModalOpen(true);
  };

  const handleViewClick = async (staffMember) => {
    await fetchDynamicSchema(); // Also refresh when viewing, just in case
    populateForm(staffMember);
    setIsViewing(true);
    setActiveStep(0);
    setModalOpen(true);
  };

  const handleEditClick = async (staffMember) => {
    await fetchDynamicSchema(); // Also refresh when editing
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
        setInfoModal({ open: true, title: 'Error', message: 'Failed to delete staff member', type: 'error' });
      } else {
        setInfoModal({ open: true, title: 'Deleted', message: 'Staff member deleted successfully', type: 'success' });
        fetchStaff();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: 'Mr.',
      first_name: '', last_name: '', dob: '', email: '', phone: '', ni_number: '', joined_date: new Date().toISOString().split('T')[0],
      contracted_hours: '', right_to_work_expiry: '', dbs_checked: false, dbs_expiry: '', role: '', temp_password: '',
      gender: '', nationality: '', driving_license: '',
      address_line_1: '', address_line_2: '', address_line_3: '', city: '', county: '', postcode: '',
      employment_status: '', pay_rate: '', working_hours_weekly: '',
      bank_name: '', branch: '', account_no: '',
      documents: []
    });
    setErrors({});
    setCurrentId(null);
  };

  const formatLabel = (str) => {
    if (!str) return '';
    if (columnLabels[str]) return columnLabels[str];
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const populateForm = (staffMember) => {
    const systemDocs = staffMember.custom_data?.uploaded_documents || [];
    
    const initialState = {
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
      documents: systemDocs,
      
      title: staffMember.title || 'Mr.',
      gender: staffMember.gender || '',
      nationality: staffMember.nationality || '',
      driving_license: staffMember.driving_license || '',
      
      address_line_1: staffMember.address_line_1 || '',
      address_line_2: staffMember.address_line_2 || '',
      address_line_3: staffMember.address_line_3 || '',
      city: staffMember.city || '',
      county: staffMember.county || '',
      postcode: staffMember.postcode || '',

      employment_status: staffMember.employment_status || '',
      pay_rate: staffMember.pay_rate || '',
      working_hours_weekly: staffMember.working_hours_weekly || '',

      bank_name: staffMember.bank_name || '',
      branch: staffMember.branch || '',
      account_no: staffMember.account_no || '',
    };

    // IMPORTANT: Initialize dynamic columns in the form data based on current schema
    dynamicColumns.forEach(colName => {
      initialState[colName] = staffMember[colName] || '';
    });

    setFormData(initialState);
    setErrors({});
    setCurrentId(staffMember.id);
  };

  const handlePositiveNumberChange = (e, field) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    const { first_name, last_name, dob, email, phone, ni_number } = formData;
    const nameRegex = /^[a-zA-Z\s]+$/;
    
    if (!first_name) newErrors.first_name = "Required";
    else if (!nameRegex.test(first_name)) newErrors.first_name = "Letters only";

    if (!last_name) newErrors.last_name = "Required";
    else if (!nameRegex.test(last_name)) newErrors.last_name = "Letters only";

    if (!phone) newErrors.phone = "Required";
    if (!ni_number) newErrors.ni_number = "Required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = "Required";
    else if (!emailRegex.test(email)) newErrors.email = "Invalid email";

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dob) newErrors.dob = "Required";
    else if (!dateRegex.test(dob)) newErrors.dob = "Invalid date";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    const { address_line_1, city, postcode } = formData;
    if (!address_line_1) newErrors.address_line_1 = "Required";
    if (!city) newErrors.city = "Required";
    if (!postcode) newErrors.postcode = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateStep1()) {
      setInfoModal({ open: true, title: "Validation Error", message: "Please fix validation errors.", type: 'error' });
      setActiveStep(0);
      return;
    }

    setSaving(true);

    const { 
      title, first_name, last_name, dob, email, phone, ni_number, 
      joined_date, contracted_hours, right_to_work_expiry,
      dbs_checked, dbs_expiry, documents, role, temp_password,
      gender, nationality, driving_license,
      address_line_1, address_line_2, address_line_3, city, county, postcode,
      employment_status, pay_rate, working_hours_weekly,
      bank_name, branch, account_no
    } = formData;

    const payload = {
      first_name,
      last_name,
      title,
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
      gender,
      nationality,
      driving_license,
      address_line_1,
      address_line_2,
      address_line_3,
      city,
      county,
      postcode,
      employment_status,
      pay_rate,
      working_hours_weekly: working_hours_weekly ? parseFloat(working_hours_weekly) : null,
      bank_name,
      branch,
      account_no
    };

    // Include dynamic columns in payload
    dynamicColumns.forEach(colName => {
      payload[colName] = formData[colName] || null;
    });

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
      const { error: updateError } = await supabase.from('staff').update(payload).eq('id', currentId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('staff').insert([payload]);
      error = insertError;
    }

    setSaving(false);

    if (error) {
      
      setInfoModal({ open: true, title: 'Error', message: `Save failed: ${error.message}`, type: 'error' });
    } else {
      setModalOpen(false);
      setInfoModal({ 
        open: true, 
        title: currentId ? 'Profile Updated' : 'Staff Onboarded', 
        message: currentId ? 'Changes saved successfully.' : 'Staff member added successfully.', 
        type: 'success' 
      });
      fetchStaff(); 
    }
  };

  const handleAddCustomField = async () => {
    const label = prompt("Enter field label (e.g. 'Emergency Contact'):");
    if (label) {
      const columnName = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (!columnName) return setInfoModal({ open: true, message: 'Invalid field name', type: 'error' });

      const { error: rpcError } = await supabase.rpc('add_column_to_staff', { 
        p_column_name: columnName, 
        p_column_label: label 
      });

      if (rpcError) {
        setInfoModal({ open: true, message: `Failed: ${rpcError.message}`, type: 'error' });
        return;
      }

      setDynamicColumns(prev => [...prev, columnName]);
      setColumnLabels(prev => ({ ...prev, [columnName]: label }));
      setFormData(prev => ({ ...prev, [columnName]: '' })); // Initialize the new field in current form
      setInfoModal({ open: true, title: 'Success', message: 'Field added to database.', type: 'success' });
      await fetchDynamicSchema(); // Ensure state is synced
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

        const { error: uploadError } = await supabase.storage.from('staff-documents').upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('staff-documents').getPublicUrl(filePath);
        newDocs.push({ name: file.name, url: publicUrlData.publicUrl, path: filePath, uploaded_at: new Date().toISOString() });
      }
      setFormData({ ...formData, documents: newDocs });
      setInfoModal({ open: true, message: 'Documents uploaded', type: 'success' });
    } catch (err) {
     
      setInfoModal({ open: true, message: 'Upload error', type: 'error' });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveDoc = (indexToRemove) => {
    const newDocs = formData.documents.filter((_, index) => index !== indexToRemove);
    setFormData({ ...formData, documents: newDocs });
  };

  // Mobile Card Component
  const StaffMobileCard = ({ s }) => {
    const dbs = getDbsStatus(s.dbs_expiry);
    return (
      <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 2 }} onClick={() => handleViewClick(s)}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1a5fba', width: 40, height: 40 }}>
              {s.first_name?.[0]}{s.last_name?.[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#0c1f3f' }}>
                {s.title} {s.first_name} {s.last_name}
              </Typography>
              <Typography variant="caption" color="textSecondary">{s.role || 'Unassigned'}</Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Grid container spacing={1} sx={{ mb: 2, mt: 0.5 }}>
            <Grid xs={6}>
              <Typography variant="caption" color="textSecondary">Email</Typography>
              <Typography variant="body2" noWrap>{s.email || '—'}</Typography>
            </Grid>
            <Grid xs={6}>
              <Typography variant="caption" color="textSecondary">Phone</Typography>
              <Typography variant="body2">{s.phone || '—'}</Typography>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} justifyContent="flex-end" onClick={e => e.stopPropagation()}>
            <IconButton color="primary" size="small" onClick={() => handleViewClick(s)}><ViewIcon fontSize="small" /></IconButton>
            <IconButton color="info" size="small" onClick={() => handleEditClick(s)}><EditIcon fontSize="small" /></IconButton>
            <IconButton color="error" size="small" onClick={() => handleDeleteClick(s.id, s.first_name)}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <style>{datePickerStyles}</style>
      <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>

        {/* Header */}
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
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick} fullWidth={isMobile} sx={{ bgcolor: '#1a5fba', py: { xs: 1.25, sm: 1 } }}>
              Add Staff
            </Button>
          </Box>
        </Box>

        {/* List View */}
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
                    <TableCell>DBS</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow> :
                    staff.length === 0 ? <TableRow><TableCell colSpan={6} align="center">No staff found</TableCell></TableRow> :
                      staff.map((s) => {
                        const dbs = getDbsStatus(s.dbs_expiry);
                        return (
                          <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewClick(s)}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: '#1a5fba', width: 32, height: 32 }}>
                                  {s.first_name?.[0]}{s.last_name?.[0]}
                                </Avatar>
                                <Box><Typography sx={{ fontWeight: 'bold' }}>{s.title} {s.first_name} {s.last_name}</Typography><Typography variant="caption" color="textSecondary">{s.ni_number}</Typography></Box>
                              </Box>
                            </TableCell>
                            <TableCell><Chip label={s.role || 'Unassigned'} size="small" variant="outlined" /></TableCell>
                            <TableCell>{s.email || '—'}</TableCell>
                            <TableCell>{s.phone || '—'}</TableCell>
                            <TableCell><Chip label={dbs.label} color={dbs.color} size="small" /></TableCell>
                            <TableCell align="center" onClick={e => e.stopPropagation()}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <IconButton color="primary" size="small" onClick={() => handleViewClick(s)}><ViewIcon fontSize="small" /></IconButton>
                                <IconButton color="info" size="small" onClick={() => handleEditClick(s)}><EditIcon fontSize="small" /></IconButton>
                                <IconButton color="error" size="small" onClick={() => handleDeleteClick(s.id, s.first_name)}><DeleteIcon fontSize="small" /></IconButton>
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
        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth scroll="paper" PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 24px 54px rgba(0,0,0,0.15)', overflow: 'hidden' } }}>
          {/* Header Banner */}
          <Box sx={{ background: 'linear-gradient(135deg, #1a5fba 0%, #0c1f3f 100%)', color: 'white', py: 4, px: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <ContactPage sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <DialogTitle sx={{ p: 0, m: 0, fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
                {isViewing ? 'Staff Profile' : (currentId ? 'Modify Profile Details' : 'New Staff Onboarding')}
              </DialogTitle>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, fontWeight: 300 }}>
                {isViewing ? 'Complete overview of worker record files.' : 'Fill in structural wizard parameters step-by-step.'}
              </Typography>
            </Box>
            {!isViewing && (
              <Chip label={`Step ${activeStep + 1} of ${steps.length}`} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.1)' }} variant="outlined" />
            )}
          </Box>

          {!isViewing && (
            <Box sx={{ bgcolor: '#fff', pt: 3, pb: 1 }}>
              <Paper elevation={0}><Stepper activeStep={activeStep} alternativeLabel={isMobile} sx={{ px: { xs: 1, sm: 4 } }}>
                {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
              </Stepper></Paper>
            </Box>
          )}

          <DialogContent dividers sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#f8f9fa' }}>

            {/* STEP 1: MANDATORY DETAILS */}
            {((!isViewing && activeStep === 0) || isViewing) && (
              <Box display={isViewing || activeStep === 0 ? 'block' : 'none'}>
                
                {/* Identity Section */}
                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" /> Identity Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Grid container spacing={1}>
                        <Grid item xs={4} sm={3.5}>
                          <FormControl fullWidth size="small" sx={{ bgcolor: 'white' }} disabled={isViewing}>
                            <InputLabel>Title</InputLabel>
                            <Select value={formData.title || ''} label="Title" onChange={(e) => setFormData({ ...formData, title: e.target.value })}>
                              <MenuItem value="Mr.">Mr.</MenuItem><MenuItem value="Mrs.">Mrs.</MenuItem><MenuItem value="Ms.">Ms.</MenuItem><MenuItem value="Miss">Miss</MenuItem><MenuItem value="Dr.">Dr.</MenuItem><MenuItem value="Other">Other</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={8} sm={8.5}>
                          <TextField fullWidth label="First Name *" size="small" sx={{ bgcolor: 'white' }} value={formData.first_name || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, first_name: e.target.value })} error={!!errors.first_name} helperText={errors.first_name} />
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Last Name *" size="small" sx={{ bgcolor: 'white' }} value={formData.last_name || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, last_name: e.target.value })} error={!!errors.last_name} helperText={errors.last_name} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography component="label" variant="caption" sx={{ color: errors.dob ? 'error.main' : 'text.secondary', fontWeight: 600, fontSize: '0.75rem', ml: 0.5 }}>Date of Birth *</Typography>
                        <TextField fullWidth type="date" size="small" sx={{ bgcolor: 'white' }} value={formData.dob || ''} disabled={isViewing} onKeyDown={handleDateKeyDown} onChange={(e) => handleDateChange(e, 'dob')} error={!!errors.dob} helperText={errors.dob} />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="NI Number *" placeholder="AB123456C" size="small" sx={{ bgcolor: 'white' }} value={formData.ni_number || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, ni_number: e.target.value.toUpperCase() })} error={!!errors.ni_number} helperText={errors.ni_number} />
                    </Grid>
                  </Grid>
                </FormSectionCard>

                {/* Contact Section */}
                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Badge fontSize="small" /> Contact Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Email *" type="email" size="small" sx={{ bgcolor: 'white' }} value={formData.email || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, email: e.target.value })} error={!!errors.email} helperText={errors.email} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Phone *" size="small" sx={{ bgcolor: 'white' }} value={formData.phone || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, phone: e.target.value })} error={!!errors.phone} helperText={errors.phone} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography component="label" variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', ml: 0.5 }}>Joined Date</Typography>
                        <TextField fullWidth type="date" size="small" sx={{ bgcolor: 'white' }} value={formData.joined_date || ''} disabled={isViewing} onKeyDown={handleDateKeyDown} onChange={(e) => handleDateChange(e, 'joined_date')} />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                       <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem', ml: 0.5, visibility: 'hidden' }}>Spacer</Typography>
                        <TextField fullWidth label="Years of Service" size="small" sx={{ bgcolor: 'white' }} value={calculateYearsService(formData.joined_date) || 0} disabled InputProps={{ readOnly: true }} />
                      </Box>
                    </Grid>
                  </Grid>
                </FormSectionCard>

                {/* Compliance Check */}
                <Alert severity="info" icon={<AdminPanelSettings fontSize="inherit" />} sx={{ borderRadius: 2, bgcolor: '#e3f2fd', color: '#0d47a1' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Compliance Check: Age is {calculateAge(formData.dob)} years.</Typography>
                </Alert>
              </Box>
            )}

            {/* STEP 2: PERSONAL DETAILS & ROLES */}
            {((!isViewing && activeStep === 1) || isViewing) && (
              <Box display={isViewing || activeStep === 1 ? 'block' : 'none'}>
                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" /> Personal & Role Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" sx={{ bgcolor: 'white' ,width:'250px' }}><InputLabel>Gender</InputLabel>
                        <Select value={formData.gender || ''} label="Gender" disabled={isViewing} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                          <MenuItem value="Male">Male</MenuItem><MenuItem value="Female">Female</MenuItem><MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Nationality" size="small" sx={{ bgcolor: 'white' }} value={formData.nationality || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, nationality: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" sx={{ bgcolor: 'white',width:'250px' }}><InputLabel>Driving License</InputLabel>
                        <Select value={formData.driving_license || ''} label="Driving License" disabled={isViewing} onChange={e => setFormData({ ...formData, driving_license: e.target.value })}>
                          <MenuItem value="No">No</MenuItem><MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" variant="outlined" sx={{ bgcolor: 'white',width:'250px' }}><InputLabel id="role-label" shrink>Role Category</InputLabel>
                        <Select labelId="role-label" value={formData.role || ''} notched label="Role Category" disabled={isViewing} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                          <MenuItem value="" disabled><em>Select Role...</em></MenuItem>{roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    {!isViewing && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <TextField size="small" placeholder="Add New Role" value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} sx={{ flexGrow: 1, bgcolor: 'white' }} />
                          <Button size="small" variant="contained" sx={{ bgcolor: '#0c1f3f' }} onClick={handleAddRole}>Add</Button>
                        </Box>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Contracted Hours" type="number" size="small" sx={{ bgcolor: 'white' }} value={formData.contracted_hours || ''} disabled={isViewing} onChange={(e) => handlePositiveNumberChange(e, 'contracted_hours')} inputProps={{ min: 0 }} />
                    </Grid>
                    {!isViewing && (
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Temp Password" type="password" size="small" sx={{ bgcolor: 'white' }} value={formData.temp_password || ''} onChange={e => setFormData({ ...formData, temp_password: e.target.value })} helperText="Leave blank to keep existing" />
                      </Grid>
                    )}
                  </Grid>
                </FormSectionCard>

                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminPanelSettings fontSize="small" /> Compliance Dates
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography component="label" variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', ml: 0.5 }}>Right to Work Expiry</Typography>
                        <TextField fullWidth type="date" size="small" sx={{ bgcolor: 'white' }} value={formData.right_to_work_expiry || ''} disabled={isViewing} onKeyDown={handleDateKeyDown} onChange={(e) => handleDateChange(e, 'right_to_work_expiry')} helperText="Future dates allowed" />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                      <FormControlLabel control={<Checkbox checked={!!formData.dbs_checked} disabled={isViewing} onChange={e => setFormData({ ...formData, dbs_checked: e.target.checked })} />} label="DBS Checked?" />
                    </Grid>
                    {formData.dbs_checked && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography component="label" variant="caption" sx={{ color: errors.dbs_expiry ? 'error.main' : 'text.secondary', fontWeight: 600, fontSize: '0.75rem', ml: 0.5 }}>DBS Expiry *</Typography>
                          <TextField fullWidth type="date" size="small" sx={{ bgcolor: 'white' }} value={formData.dbs_expiry || ''} disabled={isViewing} onKeyDown={handleDateKeyDown} onChange={(e) => handleDateChange(e, 'dbs_expiry')} error={!!errors.dbs_expiry} helperText={errors.dbs_expiry} />
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </FormSectionCard>

                {/* Dynamic Fields Section */}
                <FormSectionCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Work fontSize="small" /> Custom Fields
                    </Typography>
                    {!isViewing && <Button size="small" variant="outlined" onClick={handleAddCustomField} startIcon={<AddIcon />}>+ Add Field</Button>}
                  </Box>
                  {dynamicColumns.length > 0 ? (
                    <Grid container spacing={2}>
                      {dynamicColumns.map(colName => (
                        <Grid item xs={12} sm={6} key={colName}>
                          <TextField fullWidth label={formatLabel(colName)} size="small" sx={{ bgcolor: 'white' }} value={formData[colName] || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, [colName]: e.target.value })} />
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2, border: '1px dashed #ccc', borderRadius: 1 }}>No custom fields defined.</Typography>
                  )}
                </FormSectionCard>
              </Box>
            )}

            {/* STEP 3: ADDRESS */}
            {((!isViewing && activeStep === 2) || isViewing) && (
              <Box display={isViewing || activeStep === 2 ? 'block' : 'none'}>
                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small" /> Address Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField fullWidth label="Address Line 1 *" size="small" sx={{bgcolor:'white'}} value={formData.address_line_1 || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, address_line_1: e.target.value })} error={!!errors.address_line_1} helperText={errors.address_line_1} /></Grid>
                    <Grid item xs={12}><TextField fullWidth label="Address Line 2" size="small" sx={{bgcolor:'white'}} value={formData.address_line_2 || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, address_line_2: e.target.value })} /></Grid>
                    <Grid item xs={12}><TextField fullWidth label="Address Line 3" size="small" sx={{bgcolor:'white'}} value={formData.address_line_3 || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, address_line_3: e.target.value })} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="City *" size="small" sx={{bgcolor:'white'}} value={formData.city || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, city: e.target.value })} error={!!errors.city} helperText={errors.city} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="County" size="small" sx={{bgcolor:'white'}} value={formData.county || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, county: e.target.value })} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Post Code *" size="small" sx={{bgcolor:'white'}} value={formData.postcode || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, postcode: e.target.value.toUpperCase() })} error={!!errors.postcode} helperText={errors.postcode} /></Grid>
                  </Grid>
                </FormSectionCard>
              </Box>
            )}

            {/* STEP 4: EMPLOYMENT & BANK */}
            {((!isViewing && activeStep === 3) || isViewing) && (
              <Box display={isViewing || activeStep === 3 ? 'block' : 'none'}>
                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Work fontSize="small" /> Employment
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={{bgcolor:'white',width:'250px'}}><InputLabel>Employment Status</InputLabel>
                        <Select value={formData.employment_status || ''} label="Employment Status" disabled={isViewing} onChange={e => setFormData({ ...formData, employment_status: e.target.value })}>
                          <MenuItem value="Full Time">Full Time</MenuItem><MenuItem value="Part Time">Part Time</MenuItem><MenuItem value="New Starter">New Starter</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        fullWidth 
                        label="Pay Rate" 
                        size="small" 
                        sx={{bgcolor:'white'}} 
                        value={formData.pay_rate || ''} 
                        disabled={isViewing} 
                        onChange={e => handleNumericChange(e, 'pay_rate')} 
                        placeholder="e.g. 12.50"
                        helperText="Numbers only"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}><TextField fullWidth label="Hours (Weekly)" type="number" size="small" sx={{bgcolor:'white'}} value={formData.working_hours_weekly || ''} disabled={isViewing} onChange={(e) => handlePositiveNumberChange(e, 'working_hours_weekly')} inputProps={{ min: 0 }} /></Grid>
                  </Grid>
                </FormSectionCard>

                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalance fontSize="small" /> Banking Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth 
                        label="Bank Name" 
                        size="small" 
                        sx={{bgcolor:'white'}} 
                        value={formData.bank_name || ''} 
                        disabled={isViewing} 
                        onChange={e => handleAlphaNumericChange(e, 'bank_name')} 
                        helperText="Alphanumeric & Spaces only"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth 
                        label="Branch" 
                        size="small" 
                        sx={{bgcolor:'white'}} 
                        value={formData.branch || ''} 
                        disabled={isViewing} 
                        onChange={e => handleAlphaNumericChange(e, 'branch')} 
                        helperText="Alphanumeric & Spaces only"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Account No" type="text" size="small" sx={{bgcolor:'white'}} value={formData.account_no || ''} disabled={isViewing} onChange={e => setFormData({ ...formData, account_no: e.target.value })} />
                    </Grid>
                  </Grid>
                </FormSectionCard>
              </Box>
            )}

            {/* STEP 5: DOCUMENTS */}
            {((!isViewing && activeStep === 4) || isViewing) && (
              <Box display={isViewing || activeStep === 4 ? 'block' : 'none'}>
                <FormSectionCard>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1a5fba', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Description fontSize="small" /> Documents
                  </Typography>
                  {!isViewing && (
                    <Button variant="outlined" component="label" fullWidth sx={{ height: 64, justifyContent: 'center', textTransform: 'none', borderStyle: 'dashed', mb: 3, bgcolor: 'white' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CloudUpload color="primary" sx={{ fontSize: 28 }} />
                        <Typography variant="body1">{uploadingFiles ? "Uploading..." : "Select Files"}</Typography>
                      </Box>
                      <input type="file" multiple hidden onChange={handleFileUpload} disabled={uploadingFiles} />
                    </Button>
                  )}
                  {formData.documents && formData.documents.length > 0 ? (
                    <List dense sx={{ bgcolor: 'white', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                      {formData.documents.map((doc, idx) => (
                        <ListItem key={idx} secondaryAction={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button size="small" variant="text" href={doc.url} target="_blank">View</Button>
                            {!isViewing && <IconButton edge="end" size="small" onClick={() => handleRemoveDoc(idx)}><DeleteIcon fontSize="small" color="error" /></IconButton>}
                          </Stack>
                        }>
                          <ListItemIcon><AttachFile color="secondary" /></ListItemIcon>
                          <ListItemText primary={doc.name} secondary={doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4, border: '1px dashed #ccc', borderRadius: 2, bgcolor: 'white' }}>No documents uploaded.</Typography>
                  )}
                </FormSectionCard>
              </Box>
            )}

          </DialogContent>

          <DialogActions sx={{ p: 3, px: 4, bgcolor: '#fff', borderTop: '1px solid #f0f0f0', gap: 1 }}>
            {isViewing ? (
              <GradientButton colorType="primary" onClick={() => setModalOpen(false)}>Close</GradientButton>
            ) : (
              <>
                {activeStep === 0 && <Button sx={{ color: '#6c757d' }} onClick={() => setModalOpen(false)}>Cancel</Button>}
                {activeStep > 0 && <Button sx={{ color: '#6c757d' }} onClick={() => setActiveStep(prev => prev - 1)} startIcon={<ArrowBack />}>Back</Button>}
                
                {activeStep < 4 ? (
                  <GradientButton 
                    onClick={() => {
                      if (activeStep === 0 && !validateStep1()) {
                        setInfoModal({ open: true, title: "Validation Error", message: "Please check required fields.", type: 'warning' });
                        return;
                      }
                      if (activeStep === 2 && !validateStep3()) {
                        setInfoModal({ open: true, title: "Validation Error", message: "Address details required.", type: 'warning' });
                        return;
                      }
                      setActiveStep(prev => prev + 1);
                    }} 
                    endIcon={<ArrowForward />}
                  >
                    Next
                  </GradientButton>
                ) : (
                  <GradientButton onClick={handleSave} disabled={saving}>
                    {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Staff Member'}
                  </GradientButton>
                )}
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* --- ATTRACTIVE INFO MODAL --- */}
        <Dialog open={infoModal.open} onClose={() => setInfoModal({ ...infoModal, open: false })} PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', maxWidth: 400 } }}>
          <Box sx={{ 
              textAlign: 'center', 
              background: infoModal.type === 'success' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 
                         infoModal.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 
                         'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff', py: 4, px: 2 
            }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }}>
              {infoModal.type === 'success' ? <CheckCircle sx={{ fontSize: 40, color: '#fff' }} /> : 
               infoModal.type === 'error' ? <ErrorIcon sx={{ fontSize: 40, color: '#fff' }} /> : 
               <WarningAmber sx={{ fontSize: 40, color: '#fff' }} />}
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{infoModal.title}</Typography>
          </Box>
          <DialogContent sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#64748b' }}>{infoModal.message}</Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 0 }}>
            <GradientButton onClick={() => setInfoModal({ ...infoModal, open: false })} colorType={infoModal.type}>Okay</GradientButton>
          </DialogActions>
        </Dialog>

      </Box>
    </>
  );
};

export default Staff;