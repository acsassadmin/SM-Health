import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { Logout } from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Button 
      variant="outlined" 
      color="error" 
      startIcon={<Logout />} 
      onClick={handleLogout}
    >
      Sign Out
    </Button>
  );
};

export default LogoutButton;