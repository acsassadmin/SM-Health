import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Paper } from '@mui/material';
import { People, Business, EventNote, Warning } from '@mui/icons-material';

const Dashboard = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
      <Typography variant="h4" sx={{ fontFamily: 'serif', mb: 3 }}>Overview</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: '4px solid #1a5fba' }}>
            <CardContent>
              <People color="primary" />
              <Typography variant="h4">0</Typography>
              <Typography variant="caption" color="textSecondary">Active Staff</Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Add other stat cards here... */}
      </Grid>
    </Box>
  );
};

export default Dashboard;