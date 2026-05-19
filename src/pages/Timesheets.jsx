
import React from 'react';
import { Box, Typography } from '@mui/material';

const Timesheets = () => (
  <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
    <Typography variant="h4" sx={{ fontFamily: 'serif', mb: 3 }}>Timesheets</Typography>
    <Typography>Timesheet approval list...</Typography>
  </Box>
);

export default Timesheets;