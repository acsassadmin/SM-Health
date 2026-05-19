import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Card, CardContent, Alert, CircularProgress, Chip, Divider } from '@mui/material';
import { supabase } from '../supabaseClient';

const TwoFactorAuth = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('idle'); // idle, verifying
  const [message, setMessage] = useState('');
  const [factorId, setFactorId] = useState(null);

  // Check if MFA is already enabled
  useEffect(() => {
    const checkMFA = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (data && data.totp && data.totp.length > 0) {
        setIsEnabled(true);
        setFactorId(data.totp[0].id);
      }
    };
    checkMFA();
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setMessage('');
    try {
      // 1. Enroll the factor (Generate TOTP Secret & QR Code)
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'SM Heath Authenticator',
      });

      if (error) throw error;

      // 2. Save the Factor ID (needed for verification later)
      setFactorId(data.id);
      
      // 3. The QR code is returned as a base64 SVG string
      setQrCodeUrl(data.totp.qr_code);
      setStep('verifying');
    } catch (err) {
      console.error(err);
      setMessage('Failed to setup 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId) return;
    
    setLoading(true);
    setMessage('');
    try {
      // 1. Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });
      
      if (challengeError) throw challengeError;

      // 2. Verify the code against the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;
      
      setIsEnabled(true);
      setStep('idle');
      setMessage('2FA Enabled Successfully!');
      setVerificationCode('');
    } catch (err) {
      console.error(err);
      setMessage('Invalid Code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) return;
    if (!factorId) return;
    
    setLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factorId });
    
    if (error) {
      setMessage(error.message);
    } else {
      setIsEnabled(false);
      setFactorId(null);
      setMessage('2FA Disabled.');
    }
    setLoading(false);
  };

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Two-Factor Authentication</Typography>
          <Chip label={isEnabled ? 'Enabled' : 'Disabled'} color={isEnabled ? 'success' : 'default'} />
        </Box>
        
        <Divider />

        {message && <Alert severity={message.includes('Successfully') ? 'success' : 'error'} sx={{ my: 2 }}>{message}</Alert>}

        {!isEnabled ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Secure your account by requiring a code from your authenticator app.
            </Typography>
            <Button variant="contained" onClick={handleSetup} disabled={loading} fullWidth>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Enable 2FA'}
            </Button>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="error" onClick={handleDisable} disabled={loading} fullWidth>
              Disable 2FA
            </Button>
          </Box>
        )}

        {step === 'verifying' && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid #ddd' }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>1. Scan QR Code</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use Google Authenticator, Authy, or 1Password on your phone.
            </Typography>
            
            {qrCodeUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: 180, height: 180, borderRadius: 8 }} />
              </Box>
            )}
            
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>2. Enter Code</Typography>
            <TextField
              fullWidth label="6-digit Code" value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem' } }}
              sx={{ mb: 2 }}
            />
            
            <Button fullWidth variant="contained" onClick={handleVerify} disabled={loading || verificationCode.length !== 6}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Enable'}
            </Button>
            <Button fullWidth onClick={() => setStep('idle')} sx={{ mt: 1 }}>
              Cancel
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorAuth;