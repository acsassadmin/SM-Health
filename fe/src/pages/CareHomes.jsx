import React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, Chip } from '@mui/material';
import { Business, Add } from '@mui/icons-material';

const CareHomes = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 500 }}>Care Homes</Typography>
        <Button variant="contained" startIcon={<Add />}>Add Care Home</Button>
      </Box>
      
      <Grid container spacing={3}>
        {/* Example Card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ borderTop: '4px solid #0891b2' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Sunnybrook Care Home</Typography>
              <Typography variant="body2" color="text.secondary">12 Oak Lane, Birmingham</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Chip label="28 Beds" size="small" />
                <Chip label="Active" size="small" color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// --- THIS IS THE IMPORTANT PART ---
export default CareHomes;