import React, { useState, useContext, useEffect } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Grid, 
  Alert, Divider, FormControlLabel, Switch, FormGroup
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';

export default function Settings() {
  const { user, changePassword } = useContext(AuthContext);
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password fields state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // System Configuration (mock settings saved in localStorage)
  const [config, setConfig] = useState({
    emailAlertsEnabled: true,
    alertOnCritical: true,
    alertOnTicketFail: true,
    alertOnApiDown: true,
    alertThresholdCount: 10
  });

  useEffect(() => {
    const savedConfig = localStorage.getItem('cumta_system_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.warn('Error reading saved system config:', e.message);
      }
    }
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleConfigChange = (e) => {
    const { name, checked, value } = e.target;
    const isBool = e.target.type === 'checkbox';
    
    setConfig(prev => {
      const updated = {
        ...prev,
        [name]: isBool ? checked : parseInt(value) || 0
      };
      localStorage.setItem('cumta_system_config', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    const res = await changePassword(passwords.currentPassword, passwords.newPassword);
    setSubmitting(false);

    if (res.success) {
      setSuccess('Password updated successfully.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setError(res.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 850, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
        Profile & Portal Settings
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={4}>
        {/* User profile overview */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                Inspector Profile Info
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Username</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{user?.username}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Email Address</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{user?.email || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Assigned System Role</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {user?.role?.replace('_', ' ')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Change password card */}
          <Card>
            <CardContent>
              <form onSubmit={handlePasswordSubmit}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                  Reset Account Password
                </Typography>
                
                <TextField
                  type="password"
                  label="Current Password"
                  name="currentPassword"
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  fullWidth
                  required
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  type="password"
                  label="New Password"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  fullWidth
                  required
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  type="password"
                  label="Confirm New Password"
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  fullWidth
                  required
                  size="small"
                  sx={{ mb: 3 }}
                />

                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={submitting}
                  sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}
                >
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Administrative settings */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                System Alert & Notification Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure threshold alerts for CUMTA administrators when inspection records detect system discrepancies.
              </Typography>
              
              <Divider sx={{ mb: 3 }} />

              <FormGroup sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={config.emailAlertsEnabled} 
                      onChange={handleConfigChange} 
                      name="emailAlertsEnabled"
                      disabled={user?.role !== 'admin'}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Enable Admin Email Alerts</Typography>
                      <Typography variant="caption" color="text.secondary">Trigger SMTP alerts to system administrator mailing list</Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch 
                      checked={config.alertOnCritical} 
                      onChange={handleConfigChange} 
                      name="alertOnCritical"
                      disabled={!config.emailAlertsEnabled || user?.role !== 'admin'}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Alert on Critical Issues</Typography>
                      <Typography variant="caption" color="text.secondary">Send warning when inspector flags severity level: Critical</Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch 
                      checked={config.alertOnTicketFail} 
                      onChange={handleConfigChange} 
                      name="alertOnTicketFail"
                      disabled={!config.emailAlertsEnabled || user?.role !== 'admin'}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Alert on Ticket Booking Failures</Typography>
                      <Typography variant="caption" color="text.secondary">Send warning if inspect ticket bookings fail</Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch 
                      checked={config.alertOnApiDown} 
                      onChange={handleConfigChange} 
                      name="alertOnApiDown"
                      disabled={!config.emailAlertsEnabled || user?.role !== 'admin'}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Alert on NTES API Timeout / Downs</Typography>
                      <Typography variant="caption" color="text.secondary">Notify when CRIS server integrations fail to return response</Typography>
                    </Box>
                  }
                />
                
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Station-wise Issue Alert Threshold</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Trigger alert when a single station experiences more than this number of failures.
                  </Typography>
                  <TextField
                    type="number"
                    name="alertThresholdCount"
                    value={config.alertThresholdCount}
                    onChange={handleConfigChange}
                    size="small"
                    sx={{ width: 120 }}
                    disabled={!config.emailAlertsEnabled || user?.role !== 'admin'}
                  />
                </Box>
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
