import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Card, CardContent, Typography, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  MenuItem, Alert, CircularProgress, Chip
} from '@mui/material';
import {
  PersonAdd as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export default function UsersManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  
  // Dialog state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'field_inspector'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/users');
      setUsers(response.data);
    } catch (e) {
      setError('Failed to fetch user accounts database.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setForm({
      username: '',
      email: '',
      password: '',
      role: 'field_inspector'
    });
    setOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) return;

    try {
      await axios.post('/api/auth/register', form);
      setOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering new user.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/api/auth/users/${id}`);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <Box sx={{ maxWidth: 850, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            System Users Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system log-in credentials, add field inspectors, and verify email assignments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}
        >
          Add User
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email Address</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role Access</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created On</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={u.role === 'admin' ? 'Administrator' : 'Field Inspector'} 
                      color={u.role === 'admin' ? 'primary' : 'secondary'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <IconButton color="error" onClick={() => handleDelete(u.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Register New User Account</DialogTitle>
          <DialogContent>
            <TextField
              label="Username"
              name="username"
              value={form.username}
              onChange={handleInputChange}
              fullWidth
              required
              sx={{ mt: 1.5, mb: 2 }}
            />
            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleInputChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              select
              label="Role Assignment"
              name="role"
              value={form.role}
              onChange={handleInputChange}
              fullWidth
              required
            >
              <MenuItem value="field_inspector">Field Inspector</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}>
              Register Account
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
