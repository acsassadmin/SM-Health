import React from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

const Login = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f7f9fc' }}>
    <Paper sx={{ p: 4, width: 400 }}>
      <Typography variant="h5" gutterBottom>Login</Typography>
      <TextField fullWidth label="Email" sx={{ mb: 2 }} />
      <TextField fullWidth label="Password" type="password" sx={{ mb: 2 }} />
      <Button fullWidth variant="contained">Sign In</Button>
    </Paper>
  </Box>
);
export default Login;