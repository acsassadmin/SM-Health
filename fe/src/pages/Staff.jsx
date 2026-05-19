import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, IconButton, TablePagination, Snackbar, Alert
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Visibility as ViewIcon, Edit as EditIcon } from '@mui/icons-material';

const Staff = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [count, setCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false); // New state to isolate view-only mode
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: '', dbs_date: '', quals: ''
  });

  // --- Fetch Data ---
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
      query = query.ilike('first_name', `%${searchTerm}%`)
                   .or('last_name.ilike.%' + searchTerm + '%')
                   .or('email.ilike.%' + searchTerm + '%')
                   .or('role.ilike.%' + searchTerm + '%');
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

  // --- Handlers ---

  const handleAddClick = () => {
    setIsEditing(false);
    setIsViewing(false); // Form fields will be active
    setCurrentId(null);
    setFormData({ first_name: '', last_name: '', email: '', phone: '', role: '', dbs_date: '', quals: '' });
    setModalOpen(true);
  };

  const handleEditClick = (staffMember) => {
    setIsEditing(true);
    setIsViewing(false); // Form fields will be active
    setCurrentId(staffMember.id);
    setFormData({
      first_name: staffMember.first_name || '',
      last_name: staffMember.last_name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      role: staffMember.role || '',
      dbs_date: staffMember.dbs_date || '',
      quals: staffMember.quals || ''
    });
    setModalOpen(true);
  };

  const handleViewClick = (staffMember) => {
    setIsEditing(false);
    setIsViewing(true); // Form fields will be disabled
    setCurrentId(staffMember.id);
    setFormData({
      first_name: staffMember.first_name || '',
      last_name: staffMember.last_name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      role: staffMember.role || '',
      dbs_date: staffMember.dbs_date || '',
      quals: staffMember.quals || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const { first_name, last_name, email, phone, role, dbs_date, quals } = formData;
    if (!first_name || !last_name) {
      setNotification({ open: true, message: "First and Last name are required", severity: 'warning' });
      return;
    }

    let error;
    if (isEditing && currentId) {
      const { error: updateError } = await supabase
        .from('staff')
        .update({ first_name, last_name, email, phone, role, dbs_date, quals })
        .eq('id', currentId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('staff').insert([{
        first_name, last_name, email, phone, role, dbs_date, 
        quals, joined_date: new Date().toISOString().split('T')[0]
      }]);
      error = insertError;
    }

    if (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    } else {
      setModalOpen(false);
      setTimeout(() => {
        setNotification({ open: true, message: isEditing ? 'Staff updated successfully' : 'Staff added successfully', severity: 'success' });
        fetchStaff();
      }, 100);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 500 }}>Staff Directory</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', position: 'relative' }}>
          <SearchIcon sx={{ position: 'absolute', left: 10, color: 'text.secondary', zIndex: 1, pointerEvents: 'none' }} />
          
          <TextField 
            size="small" 
            placeholder="Search name, role, email..." 
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ width: 300, '& .MuiInputBase-root': { pl: 4 } }} 
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>Add Staff</Button>
        </Box>
      </Box>

      {/* Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Qualifications</TableCell>
                <TableCell>DBS Expiry</TableCell>
                <TableCell>Joined Date</TableCell>
                <TableCell>DBS Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} align="center">Loading...</TableCell></TableRow>
              ) : staff.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center">No staff found</TableCell></TableRow>
              ) : (
                staff.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#1a5fba', width: 32, height: 32 }}>
                          {s.first_name ? s.first_name[0] : ''}{s.last_name ? s.last_name[0] : ''}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 'bold' }}>{s.first_name} {s.last_name}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={s.role} size="small" color="primary" variant="outlined" /></TableCell>
                    <TableCell>{s.email || '—'}</TableCell>
                    <TableCell>{s.phone || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.quals || '—'}
                    </TableCell>
                    <TableCell>{s.dbs_date || '—'}</TableCell>
                    <TableCell>{s.joined_date || '—'}</TableCell>
                    <TableCell>
                      {s.dbs_date && new Date(s.dbs_date) < new Date() 
                        ? <Chip label="Expired" color="error" size="small" /> 
                        : <Chip label="Valid" color="success" size="small" />}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" size="small" onClick={() => handleViewClick(s)} title="View">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="info" size="small" onClick={() => handleEditClick(s)} title="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={count}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* --- MODAL (View/Edit/Create) --- */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'serif' }}>
          {isViewing ? 'Staff Details' : isEditing ? 'Edit Staff Member' : 'Add New Staff'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                fullWidth label="First Name" size="small" 
                value={formData.first_name}
                disabled={isViewing}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
              />
              <TextField 
                fullWidth label="Last Name" size="small" 
                value={formData.last_name}
                disabled={isViewing}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
              />
            </Box>

            <TextField 
              fullWidth label="Email" type="email" size="small" 
              value={formData.email} 
              disabled={isViewing} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small" disabled={isViewing}>
                <InputLabel>Role</InputLabel>
                <Select 
                  label="Role" 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <MenuItem value="Carer">Carer</MenuItem>
                  <MenuItem value="Senior Carer">Senior Carer</MenuItem>
                  <MenuItem value="Nurse">Nurse</MenuItem>
                  <MenuItem value="Senior Nurse">Senior Nurse</MenuItem>
                  <MenuItem value="Support Worker">Support Worker</MenuItem>
                  <MenuItem value="Team Leader">Team Leader</MenuItem>
                </Select>
              </FormControl>
              <TextField 
                fullWidth label="Phone" size="small" 
                value={formData.phone} 
                disabled={isViewing} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
            </Box>

            <TextField 
              fullWidth 
              type="date" 
              label="DBS Expiry" 
              size="small" 
              InputLabelProps={{ shrink: true }}
              value={formData.dbs_date} 
              disabled={isViewing} 
              onChange={(e) => setFormData({...formData, dbs_date: e.target.value})} 
            />

            <TextField 
              fullWidth 
              label="Qualifications" 
              size="small" 
              value={formData.quals} 
              disabled={isViewing} 
              onChange={(e) => setFormData({...formData, quals: e.target.value})} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
          {!isViewing && (
            <Button variant="contained" onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Add Staff'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Notification Toast */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Staff;