import React from 'react';
import { Box, Typography } from '@mui/material';

const Compliance = () => (
  <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
    <Typography variant="h4" sx={{ fontFamily: 'serif', mb: 3 }}>Compliance Dashboard</Typography>
    <Typography>DBS checks and documents...</Typography>
  </Box>
);

export default Compliance;