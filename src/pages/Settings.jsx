// src/pages/Settings.jsx
import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import TwoFactorAuth from "../auth/TwoFactorAuth";
const Settings = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Account Settings
      </Typography>
      <Box sx={{ mt: 3 }}>
        <TwoFactorAuth />
      </Box>
    </Container>
  );
};

export default Settings;