import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box, Typography, Button, Grid, Card, CardContent, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, TablePagination
} from '@mui/material';
import { Add, Business, LocationOn, Phone, Person, Bed } from '@mui/icons-material';

const CareHomes = () => {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(9); // 9 cards fits a 3x3 grid nicely
  const [count, setCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',   // Ensure this matches your DB column name!
    contact_name: '', // Ensure this matches your DB column name!
    phone: '',       // Ensure this matches your DB column name!
    beds: ''
  });

  // Fetch Data with Pagination
  useEffect(() => {
    fetchCareHomes();
  }, [page, rowsPerPage]); // Re-run when page changes

  const fetchCareHomes = async () => {
    setLoading(true);
    
    // Calculate range (0-8, 9-17, etc.)
    const from = page * rowsPerPage;
    const to = from + rowsPerPage - 1;

    const { data, error, count } = await supabase
      .from('care_homes')
      .select('*', { count: 'exact' }) // Get total count for pagination math
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Error fetching care homes:', error);
    } else {
      setHomes(data || []);
      setCount(count || 0);
    }
    setLoading(false);
  };

  // Handle Input Changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Open Add Modal
  const handleOpenModal = () => {
    setFormData({ name: '', address: '', contact_name: '', phone: '', beds: '' });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Submit to DB
  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      return alert("Name and Address are required");
    }

    // NOTE: Make sure these keys (name, address, etc.) match your DB columns exactly!
    const { error } = await supabase
      .from('care_homes')
      .insert([{
        name: formData.name,
        address: formData.address,
        contact_name: formData.contact_name,
        phone: formData.phone,
        beds: parseInt(formData.beds) || 0
      }]);

    if (error) {
      alert('Error saving care home: ' + error.message);
    } else {
      alert('Care Home added successfully!');
      setModalOpen(false);
      fetchCareHomes(); // Refresh list
    }
  };

  // Pagination Handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 500 }}>Care Homes</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenModal}>
          Add Care Home
        </Button>
      </Box>

      {/* Content Area */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', flexGrow: 1, alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {homes.length === 0 ? (
               <Grid item xs={12}>
                 <Typography align="center" color="text.secondary" sx={{ mt: 5 }}>
                   No care homes found. Add one!
                 </Typography>
               </Grid>
            ) : (
              homes.map((home) => (
                <Grid item xs={12} md={6} lg={4} key={home.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      borderTop: '4px solid #0891b2',
                      transition: '0.3s',
                      '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Business color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {home.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                        <LocationOn sx={{ fontSize: 16, mt: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {home.address || 'No address provided'}
                        </Typography>
                      </Box>

                      {home.contact_name && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{home.contact_name}</Typography>
                        </Box>
                      )}

                      {home.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{home.phone}</Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                        <Chip 
                          icon={<Bed sx={{ fontSize: 16 }} />} 
                          label={`${home.beds || 0} Beds`} 
                          size="small" 
                          color="info" 
                          variant="outlined"
                        />
                        <Chip label="Active" size="small" color="success" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>

          {/* Pagination Component */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
             <TablePagination
                rowsPerPageOptions={[6, 9, 12, 24]}
                component="div"
                count={count}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
          </Box>
        </>
      )}

      {/* --- MODAL --- */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Care Home</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              autoFocus margin="dense" name="name" label="Care Home Name"
              type="text" fullWidth variant="outlined" size="small"
              value={formData.name} onChange={handleChange}
            />
            <TextField
              margin="dense" name="address" label="Address"
              type="text" fullWidth variant="outlined" size="small" multiline rows={2}
              value={formData.address} onChange={handleChange}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  margin="dense" name="contact_name" label="Contact Name"
                  type="text" fullWidth variant="outlined" size="small"
                  value={formData.contact_name} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  margin="dense" name="phone" label="Phone Number"
                  type="text" fullWidth variant="outlined" size="small"
                  value={formData.phone} onChange={handleChange}
                />
              </Grid>
            </Grid>
            <TextField
              margin="dense" name="beds" label="Total Beds"
              type="number" fullWidth variant="outlined" size="small"
              value={formData.beds} onChange={handleChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save Care Home</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default CareHomes;