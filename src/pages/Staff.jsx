import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, IconButton, TablePagination
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Visibility as ViewIcon, Edit as EditIcon } from '@mui/icons-material';

const Staff = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [count, setCount] = useState(0); // Total number of records for pagination calculation

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: '', dbs_date: '', quals: ''
  });

  // Fetch Data with Pagination
  useEffect(() => {
    fetchStaff();
  }, [page, rowsPerPage]); // Re-fetch when page or rows per page changes

  const fetchStaff = async () => {
    setLoading(true);
    
    // 1. Calculate range for Supabase (0-indexed)
    const from = page * rowsPerPage;
    const to = from + rowsPerPage - 1;

    // 2. Fetch the specific page of data
    const { data, error, count } = await supabase
      .from('staff')
      .select('*', { count: 'exact' }) // Request total count for pagination math
      .order('id', { ascending: true }) // Optional: Keep order consistent
      .range(from, to);

    if (error) {
      console.error('Error fetching staff:', error);
    } else {
      setStaff(data || []);
      setCount(count || 0);
    }
    setLoading(false);
  };

  const handleAddClick = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ first_name: '', last_name: '', email: '', phone: '', role: '', dbs_date: '', quals: '' });
    setModalOpen(true);
  };

  const handleEditClick = (staffMember) => {
    setIsEditing(true);
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
    if (!first_name || !last_name) return alert("Name is required");

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

    if (error) alert(error.message);
    else {
      setModalOpen(false);
      fetchStaff(); // Refresh table
    }
  };

  // Search functionality (Client-side filter for the current page)
  // Note: For true search with pagination, you would typically filter the Supabase query 
  // inside fetchStaff using .ilike(), but this keeps it simple for now.
  const filtered = staff.filter(s => 
    `${s.first_name} ${s.last_name} ${s.role}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 500 }}>Staff Directory</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField 
            size="small" 
            placeholder="Search..." 
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
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
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center">No staff found</TableCell></TableRow>
              ) : (
                filtered.map((s) => (
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
        
        {/* --- ADDED PAGINATION --- */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={count}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* --- MODAL (View/Edit) --- */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'serif' }}>
          {isEditing ? 'Edit Staff Member' : 'Staff Details'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  fullWidth label="First Name" size="small" 
                  value={formData.first_name}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  fullWidth label="Last Name" size="small" 
                  value={formData.last_name}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
                />
              </Grid>
            </Grid>
            <TextField fullWidth label="Email" type="email" size="small" value={formData.email} disabled={!isEditing} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small" disabled={!isEditing}>
                  <InputLabel>Role</InputLabel>
                  <Select label="Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                    <MenuItem value="Carer">Carer</MenuItem>
                    <MenuItem value="Senior Carer">Senior Carer</MenuItem>
                    <MenuItem value="Nurse">Nurse</MenuItem>
                    <MenuItem value="Senior Nurse">Senior Nurse</MenuItem>
                    <MenuItem value="Support Worker">Support Worker</MenuItem>
                    <MenuItem value="Team Leader">Team Leader</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Phone" size="small" value={formData.phone} disabled={!isEditing} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </Grid>
            </Grid>
            <TextField fullWidth type="date" label="DBS Expiry" size="small" InputLabelProps={{ shrink: true }} value={formData.dbs_date} disabled={!isEditing} onChange={(e) => setFormData({...formData, dbs_date: e.target.value})} />
            <TextField fullWidth label="Qualifications" size="small" value={formData.quals} disabled={!isEditing} onChange={(e) => setFormData({...formData, quals: e.target.value})} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
          {isEditing && <Button variant="contained" onClick={handleSave}>Save Changes</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Staff;