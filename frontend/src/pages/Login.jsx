import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Card, CardContent, TextField, Button, Typography, 
  Alert, InputAdornment, IconButton, CircularProgress, Container
} from '@mui/material';
import { 
  Person as UserIcon, 
  Lock as LockIcon, 
  Visibility as VisibilityIcon, 
  VisibilityOff as VisibilityOffIcon 
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { CumtaLogoSvg, ChennaiOneLogoSvg } from '../components/Layout';

export default function Login() {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSubmitting(true);
    
    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: (theme) => theme.palette.mode === 'dark'
        ? 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)'
        : 'radial-gradient(circle at 50% 50%, #e2f1ec 0%, #f1f5f9 100%)',
      py: 4
    }}>
      <Container maxWidth="sm">
        {/* Core Auth Card */}
        <Card sx={{ 
          borderRadius: 4, 
          boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.1)', 
          overflow: 'hidden',
          border: (theme) => theme.palette.mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0'
        }}>
          
          {/* Accent Header */}
          <Box sx={{ 
            bgcolor: '#006A4E', 
            py: 4, 
            px: 2, 
            textAlign: 'center',
            color: '#ffffff',
            position: 'relative'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: 2,
              mb: 1.5
            }}>
              <Box sx={{ bgcolor: 'white', p: 0.5, borderRadius: '50%', display: 'flex' }}>
                <CumtaLogoSvg size={45} />
              </Box>
              <Box sx={{ bgcolor: 'white', p: 0.5, borderRadius: '50%', display: 'flex' }}>
                <ChennaiOneLogoSvg size={45} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.25rem', letterSpacing: 0.5 }}>
              CUMTA Train Validation Portal
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.8rem', mt: 0.5, display: 'block' }}>
              Chennai One suburban train Validation & Quality Assurance System
            </Typography>
          </Box>
          
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {/* Username field */}
              <TextField
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <UserIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2.5 }}
              />

              {/* Password field */}
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {/* Login Action Button */}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={submitting}
                sx={{ 
                  py: 1.5, 
                  fontSize: '1rem', 
                  borderRadius: 2,
                  bgcolor: '#006A4E',
                  '&:hover': {
                    bgcolor: '#004A36'
                  }
                }}
              >
                {submitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Login Securely'
                )}
              </Button>
            </form>
          </CardContent>
          
          {/* Card Footer */}
          <Box sx={{ 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
            py: 2.5,
            px: 4,
            textAlign: 'center',
            borderTop: (theme) => theme.palette.mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0'
          }}>
            <Typography variant="caption" color="text.secondary">
              Official application of CUMTA, Government of Tamil Nadu. Restricted access.
            </Typography>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
