import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, MenuItem, Select, FormControl, InputLabel, Alert, CircularProgress } from '@mui/material';
import { supabase } from '../supabaseClient';

const AddStaff = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STAFF' // Default
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // STEP 1: Create the Auth User
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName, // Pass full_name to the trigger
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // STEP 2: Update the Profile with the correct Role
        // The Trigger creates the row, but we need to update the role specifically
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: formData.role })
          .eq('id', data.user.id);

        if (updateError) throw updateError;

        setMessage('Success! Staff member added. They will receive a confirmation email.');
        
        // Reset form
        setFormData({ fullName: '', email: '', password: '', role: 'STAFF' });
      }

    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Add New Staff</Typography>
      
      {message && <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>{message}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        <TextField
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
          fullWidth
        />

        <TextField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel>Role</InputLabel>
          <Select
            name="role"
            value={formData.role}
            label="Role"
            onChange={handleChange}
          >
            <MenuItem value="STAFF">Staff</MenuItem>
            <MenuItem value="HR">HR</MenuItem>
            <MenuItem value="DIRECTOR">Director</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Temporary Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          helperText="User will be asked to change this on first login"
          required
          fullWidth
        />

        <Button 
          variant="contained" 
          type="submit" 
          size="large"
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Staff Account'}
        </Button>

      </Box>
    </Box>
  );
};

export default AddStaff;