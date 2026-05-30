import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logActivity } from '../utils/logger';
import {
  Box, Typography, Button, Grid, Card, CardContent, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  CircularProgress, TablePagination, useMediaQuery, useTheme, Avatar, styled, Paper
} from '@mui/material';
import { Add, Business, LocationOn, Phone, Person, Bed, CheckCircle, Error, WarningAmber } from '@mui/icons-material';

// Custom Gradient Button for the Success Modal
const GradientButton = styled(Button)(({ theme, colorType = 'success' }) => ({
  background: colorType === 'success' 
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

  // State for Attractive Info/Success Modal
  const [infoModal, setInfoModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'success' // 'success' | 'error' | 'warning'
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

   

    // ATTEMPT 1: Sort by 'created_at' (Newest first)
    let { data, error, count } = await supabase
      .from('care_homes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false }) 
      .range(from, to);

    // FALLBACK: If sorting by 'created_at' fails (column might not exist), try sorting by 'id'
    if (error) {
   
      
      const result = await supabase
        .from('care_homes')
        .select('*', { count: 'exact' })
        .order('id', { ascending: false }) // Use 'id' as a backup timestamp proxy
        .range(from, to);

      data = result.data;
      error = result.error;
      count = result.count;
    }

    if (error) {
      // Optionally show a toast/modal to the user
      // setInfoModal({ open: true, title: "Error", message: error.message, type: 'error' });
    } else {
    
      setHomes(data || []);
      setCount(count || 0);
    }
    setLoading(false);
  };

  // Handle Input Changes with Validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // VALIDATION: Name & Contact Name -> Letters and Spaces Only
    // Removes any numbers or special characters
    if (name === 'name' || name === 'contact_name') {
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    // VALIDATION: Phone -> No Letters Allowed
    // Removes all letters but keeps numbers and symbols (+, -, etc.)
    if (name === 'phone') {
      processedValue = value.replace(/[a-zA-Z]/g, '');
    }

    // VALIDATION: Beds -> No Negative Numbers
    if (name === 'beds') {
      // Check if the value is empty or a non-negative number
      if (processedValue === '' || (Number(processedValue) >= 0)) {
        setFormData({ ...formData, [name]: processedValue });
      }
    } else {
      // Set state for other validated fields (Name, Address, Contact Name, Phone)
      setFormData({ ...formData, [name]: processedValue });
    }
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
      setInfoModal({
        open: true,
        title: "Missing Information",
        message: "Client Name and Address are required.",
        type: 'error'
      });
      return;
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
      setInfoModal({
        open: true,
        title: "System Error",
        message: 'Error saving client: ' + error.message,
        type: 'error'
      });
    } else {
      
      // CALL THE LOGGER
      await logActivity("Added Client", `Name: ${formData.name}, Beds: ${formData.beds}`);
      

      setInfoModal({
        open: true,
        title: "Client Added!",
        message: `${formData.name} has been successfully added to the system.`,
        type: 'success'
      });
      
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

      {/* --- ADD CLIENT MODAL --- */}
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
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save Client</Button>
        </DialogActions>
      </Dialog>

      {/* --- ATTRACTIVE SUCCESS/ERROR MODAL --- */}
      <Dialog open={infoModal.open} onClose={() => setInfoModal({ ...infoModal, open: false })} PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', maxWidth: 400 } }}>
        <Box sx={{ 
            textAlign: 'center', 
            background: infoModal.type === 'success' 
              ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
              : infoModal.type === 'error'
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff', 
            py: 4, 
            px: 2,
            position: 'relative'
          }}>
          <Avatar sx={{ 
              width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', 
              margin: '0 auto 16px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
            {infoModal.type === 'success' ? <CheckCircle sx={{ fontSize: 40, color: '#fff' }} /> : 
             infoModal.type === 'error' ? <Error sx={{ fontSize: 40, color: '#fff' }} /> : 
             <WarningAmber sx={{ fontSize: 40, color: '#fff' }} />}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{infoModal.title}</Typography>
        </Box>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            {infoModal.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 0 }}>
          <GradientButton 
            onClick={() => setInfoModal({ ...infoModal, open: false })} 
            colorType={infoModal.type}
            autoFocus
          >
            Okay
          </GradientButton>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Clients;