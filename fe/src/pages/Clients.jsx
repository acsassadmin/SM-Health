import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box, Typography, Button, Grid, Card, CardContent, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  CircularProgress, TablePagination, useMediaQuery, useTheme
} from '@mui/material';
import { Add, Business, LocationOn, Phone, Person, Bed } from '@mui/icons-material';

const Clients = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for checking user role
  const [userRoleId, setUserRoleId] = useState(null);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(9);
  const [count, setCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',   
    contact_name: '', 
    phone: '',       
    beds: ''
  });

  // Fetch User Role on Mount
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUserRoleId(data.role_id);
        }
      }
    };
    fetchUserRole();
  }, []);

  // Fetch Data with Pagination
  useEffect(() => {
    fetchCareHomes();
  }, [page, rowsPerPage, userRoleId]); // Added userRoleId dependency

  const fetchCareHomes = async () => {
    // LOGIC: If Staff (ID 14), do not fetch anything. Just stop.
    if (userRoleId === 14) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = page * rowsPerPage;
    const to = from + rowsPerPage - 1;

    const { data, error, count } = await supabase
      .from('care_homes')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Error fetching clients:', error);
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
      alert('Error saving client: ' + error.message);
    } else {
      alert('Client added successfully!');
      setModalOpen(false);
      fetchCareHomes();
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

  // ---------------------------------------------------------
  // VIEW LOGIC
  // ---------------------------------------------------------
  
  // 1. While checking role
  if (userRoleId === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 2. If Staff (ID 14), Show Empty Page
  if (userRoleId === 14) {
    return (
      <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
        <Typography variant="h4" sx={{ fontFamily: 'DM sans', fontWeight: 500, mb: 3 }}>
           Clients
        </Typography>
        
        {/* Empty State - Remove the Typography below if you want it truly blank */}
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh', 
            flexDirection: 'column',
            color: 'text.secondary'
        }}>
            {/* Uncomment the line below for a truly blank page */}
            {/* <span></span> */} 
            
            <Typography variant="h6">Access Restricted</Typography>
            <Typography variant="body2">You do not have permission to view this content.</Typography>
        </Box>
      </Box>
    );
  }

  // 3. Otherwise (Director, Admin, HR), Show the Page
  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f7f9fc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Typography variant="h4" sx={{ fontFamily: 'DM sans', fontWeight: 500, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          Clients
        </Typography>
        
        {/* 
           BUTTON LOGIC:
           Show button ONLY for Director (11) and Admin (12).
           Hides for HR (13) and Staff (14).
        */}
        {(userRoleId === 11 || userRoleId === 12) && (
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={handleOpenModal}
            fullWidth={isMobile}
            sx={{ py: 1.5 }}
          >
            Add Client
          </Button>
        )}
      </Box>

      {/* Content Area */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', flexGrow: 1, alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {homes.length === 0 ? (
               <Grid item xs={12}>
                 <Typography align="center" color="text.secondary" sx={{ mt: 5 }}>
                   No clients found.
                 </Typography>
               </Grid>
            ) : (
              homes.map((home) => (
                <Grid item xs={12} sm={6} md={4} key={home.id}>
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
                        <Typography variant="body2" color="textSecondary" sx={{ wordBreak: 'break-word' }}>
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
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{home.phone}</Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', flexWrap: 'wrap' }}>
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
                labelRowsPerPage={isMobile ? '' : 'Rows per page:'}
              />
          </Box>
        </>
      )}

      {/* --- MODAL --- */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              autoFocus margin="dense" name="name" label="Client Name"
              type="text" fullWidth variant="outlined" size="small"
              value={formData.name} onChange={handleChange}
            />
            <TextField
              margin="dense" name="address" label="Address"
              type="text" fullWidth variant="outlined" size="small" multiline rows={2}
              value={formData.address} onChange={handleChange}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense" name="contact_name" label="Contact Name"
                  type="text" fullWidth variant="outlined" size="small"
                  value={formData.contact_name} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
          <Button variant="contained" onClick={handleSubmit}>Save Client</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Clients;