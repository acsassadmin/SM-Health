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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (requiresMFA) {
      await verifyMFA();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check for MFA Factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (factors && factors.totp && factors.totp.length > 0) {
        // 2FA is enabled, switch to code input view
        setRequiresMFA(true);
        setMfaFactorId(factors.totp[0].id);
        setLoading(false);
      } else {
        // No 2FA: Fetch Role then Navigate
        await fetchUserRole(data.user.id); 
        navigate('/dashboard');
      }

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    setLoading(true);
    try {
      // 1. Create Challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) throw challengeError;

      // 2. Verify Challenge
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: totpCode,
      });

      if (error) throw error;

      // 3. Get Current User Session (to ensure we have the ID)
      const { data: { user } } = await supabase.auth.getUser();
      
      // 4. Fetch Role then Navigate
      if (user) {
        await fetchUserRole(user.id);
      }
      
      navigate('/dashboard');

    } catch (err) {
      setError('Invalid 2FA Code');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom align="center" fontWeight="bold">
            SM Heath Login
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleLogin}>
            {!requiresMFA ? (
              <>
                <TextField
                  fullWidth label="Email" type="email" margin="normal"
                  value={email} onChange={(e) => setEmail(e.target.value)} 
                  disabled={loading}
                  required
                />
                <TextField
                  fullWidth label="Password" type="password" margin="normal"
                  value={password} onChange={(e) => setPassword(e.target.value)} 
                  disabled={loading}
                  required
                />
                <Button
                  fullWidth variant="contained" type="submit" sx={{ mt: 3 }}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </Button>
              </>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  2FA Required. Please enter the code from your authenticator app.
                </Alert>
                <TextField
                  fullWidth label="6-Digit Code" margin="normal"
                  value={totpCode} 
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' } }}
                  disabled={loading}
                  autoFocus
                  required
                />
                <Button
                  fullWidth variant="contained" type="submit" sx={{ mt: 3 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
                </Button>
                <Button
                  fullWidth variant="text" sx={{ mt: 1 }}
                  onClick={() => { setRequiresMFA(false); setLoading(false); }}
                >
                  Back
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;