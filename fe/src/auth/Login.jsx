import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Card, CardContent, CircularProgress } from '@mui/material';
import { supabase } from '../supabaseClient';

// --- IMPORT ROLE CONTEXT ---
import { useRole } from '../context/RoleContext'; 

const LoginForm = () => {
  const navigate = useNavigate();
  
  // --- GET FETCH FUNCTION ---
  const { fetchUserRole } = useRole(); 

  // --- FORM STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // 1. Fetch Role and WAIT for it to finish
        const role = await fetchUserRole(data.user.id);
        
        console.log("✅ Login Successful. Role:", role);
        
        // 2. Navigate to Dashboard ONLY after role is ready
        navigate('/dashboard');
      }

    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{
        // --- RESPONSIVE CONTAINER ---
        minHeight: '100vh',        // Full height of the screen
        display: 'flex',
        alignItems: 'center',      // Vertically center
        justifyContent: 'center',  // Horizontally center
        bgcolor: '#f7f9fc',        // Background color matching app
        p: 2,                      // Padding on mobile
      }}
    >
      <Card 
        sx={{ 
          // --- RESPONSIVE CARD ---
          width: '100%',           // Full width on mobile
          maxWidth: { xs: '100%', sm: '400px' }, // Constrain width on tablet/desktop
          boxShadow: 3,            // Slight elevation
          borderRadius: 2,         // Rounded corners
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}> {/* Less padding on mobile to save space */}
          
          {/* Header */}
          <Typography 
            variant="h4" 
            component="h1"
            gutterBottom 
            align="center" 
            fontWeight="bold"
            sx={{ 
              color: '#1a5fba', // Brand Color
              fontSize: { xs: '1.75rem', sm: '2rem' } // Slightly smaller font on mobile
            }}
          >
            SM Heath Login
          </Typography>
          
          <Typography 
            variant="body2" 
            align="center" 
            sx={{ mb: 3, color: 'text.secondary' }}
          >
            Please sign in to continue
          </Typography>
          
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            {/* Email Input */}
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              margin="normal"
              variant="outlined"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              disabled={loading}
              required
              autoComplete="email"
              autoFocus
              size="medium" // Larger touch target on mobile
            />

            {/* Password Input */}
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              variant="outlined"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              disabled={loading}
              required
              autoComplete="current-password"
              size="medium"
            />

            {/* Submit Button */}
            <Button
              fullWidth
              variant="contained"
              type="submit" 
              sx={{ 
                mt: 3, 
                mb: 2,
                py: 1.5,               // Taller button for easier tapping
                fontSize: '1rem',      // Larger text
                backgroundColor: '#1a5fba', 
                textTransform: 'none', // Keep text readable (don't force uppercase)
                '&:hover': {
                  backgroundColor: '#0f4d9a', 
                }
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
            
            {/* Optional: Forgot Password Link */}
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary', 
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline', color: '#1a5fba' }
                }}
              >
                Forgot your password?
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;