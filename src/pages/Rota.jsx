import React from 'react';
import { Box, Typography } from '@mui/material';

const Rota = () => (
  <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
    <Typography variant="h4" sx={{ fontFamily: 'serif', mb: 3 }}>Rota Calendar</Typography>
    <Typography>Calendar view will go here...</Typography>
  </Box>
);

export default Rota;