

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';

const Staff = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

  // Fetch Data
  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*');
    if (data) setStaff(data);
    setLoading(false);
  };

  const handleSave = async () => {
    const { first_name, last_name, email, phone, role, dbs_date, quals } = formData;
    if (!first_name || !last_name) return alert("Name is required");

    const { error } = await supabase.from('staff').insert([{
      first_name, last_name, email, phone, role, dbs_date, 
      quals, joined_date: new Date().toISOString().split('T')[0]
    }]);

    if (error) alert(error.message);
    else {
      setModalOpen(false);
      fetchStaff();
    }
  };

  const filtered = staff.filter(s => 
    `${s.first_name} ${s.last_name} ${s.role}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>Add Staff</Button>
        </Box>
      </Box>

      {/* Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>DBS Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#1a5fba', width: 32, height: 32 }}>
                        {s.first_name[0]}{s.last_name[0]}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 'bold' }}>{s.first_name} {s.last_name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={s.role} size="small" color="primary" variant="outlined" /></TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell>
                    {s.dbs_date && new Date(s.dbs_date) < new Date() 
                      ? <Chip label="Expired" color="error" size="small" /> 
                      : <Chip label="Valid" color="success" size="small" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* --- UPDATED MODAL WITH ALL FIELDS --- */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'serif' }}>Add New Staff Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="First Name" size="small" onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last Name" size="small" onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
              </Grid>
            </Grid>
            
            <TextField fullWidth label="Email" type="email" size="small" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select label="Role" onChange={(e) => setFormData({...formData, role: e.target.value})}>
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
                <TextField fullWidth label="Phone" size="small" placeholder="07700 900 000" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </Grid>
            </Grid>

            <TextField fullWidth type="date" label="DBS Expiry" size="small" InputLabelProps={{ shrink: true }} onChange={(e) => setFormData({...formData, dbs_date: e.target.value})} />
            
            <TextField fullWidth label="Qualifications" placeholder="e.g. NVQ Level 3, First Aid" size="small" onChange={(e) => setFormData({...formData, quals: e.target.value})} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>✓ Save Staff Member</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Staff;