import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Card, CardContent, CircularProgress, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material'; // Eye icons
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

  // --- VIEW PASSWORD TOGGLE ---
  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

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

        console.log('✅ Login Successful. Role:', role);

        // 2. Navigate to Dashboard ONLY after role is ready
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f7f9fc',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '400px' },
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            fontWeight="bold"
            sx={{
              color: '#1a5fba',
              fontSize: { xs: '1.75rem', sm: '2rem' },
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
              size="medium"
            />

            {/* Password Input with View Password Toggle */}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="current-password"
              size="medium"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Submit Button */}
            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: '1rem',
                backgroundColor: '#1a5fba',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#0f4d9a',
                },
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
                  '&:hover': { textDecoration: 'underline', color: '#1a5fba' },
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