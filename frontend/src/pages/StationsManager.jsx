import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Card, CardContent, Typography, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Checkbox, FormControlLabel, Grid, Alert, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export default function StationsManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stations, setStations] = useState([]);
  
  // Dialog States
  const [open, setOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  
  const [form, setForm] = useState({
    station_name: '',
    zone: 'Southern Railway',
    latitude: '',
    longitude: '',
    towards_beach: false,
    towards_tambaram: false,
    towards_chengalpattu: false,
    towards_arakkonam: false,
    towards_others: true
  });

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/stations');
      setStations(response.data);
    } catch (e) {
      setError('Failed to fetch stations.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStation(null);
    setForm({
      station_name: '',
      zone: 'Southern Railway',
      latitude: '',
      longitude: '',
      towards_beach: false,
      towards_tambaram: false,
      towards_chengalpattu: false,
      towards_arakkonam: false,
      towards_others: true
    });
    setOpen(true);
  };

  const handleOpenEdit = (st) => {
    setEditingStation(st);
    setForm({
      station_name: st.station_name,
      zone: st.zone,
      latitude: st.latitude || '',
      longitude: st.longitude || '',
      towards_beach: Boolean(st.towards_beach),
      towards_tambaram: Boolean(st.towards_tambaram),
      towards_chengalpattu: Boolean(st.towards_chengalpattu),
      towards_arakkonam: Boolean(st.towards_arakkonam),
      towards_others: Boolean(st.towards_others)
    });
    setOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.station_name || !form.zone) return;

    try {
      if (editingStation) {
        // Update
        await axios.put(`/api/stations/${editingStation.id}`, form);
      } else {
        // Create
        await axios.post('/api/stations', form);
      }
      setOpen(false);
      fetchStations();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving station details.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this station? This will remove all connected observation history!')) return;
    try {
      await axios.delete(`/api/stations/${id}`);
      fetchStations();
    } catch (e) {
      console.error(e);
      setError('Failed to delete station.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Suburban Stations Config
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage station lists, geographical details, and active train direction vectors
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}
        >
          Add Station
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
                <TableCell sx={{ fontWeight: 'bold' }}>Station Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Zone</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Latitude</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Longitude</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Directions Config</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stations.map((st) => (
                <TableRow key={st.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{st.station_name}</TableCell>
                  <TableCell>{st.zone}</TableCell>
                  <TableCell>{st.latitude || 'N/A'}</TableCell>
                  <TableCell>{st.longitude || 'N/A'}</TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {st.towards_beach && <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.2, borderRadius: 1 }}>Beach</Typography>}
                      {st.towards_tambaram && <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.2, borderRadius: 1 }}>Tambaram</Typography>}
                      {st.towards_chengalpattu && <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.2, borderRadius: 1 }}>Chengalpattu</Typography>}
                      {st.towards_arakkonam && <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.2, borderRadius: 1 }}>Arakkonam</Typography>}
                      {st.towards_others && <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.2, borderRadius: 1 }}>Others</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleOpenEdit(st)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(st.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            {editingStation ? 'Modify Station Details' : 'Configure New Station'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Station Name"
                  name="station_name"
                  value={form.station_name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Zone"
                  name="zone"
                  value={form.zone}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="number"
                  inputProps={{ step: 'any' }}
                  label="Latitude"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleInputChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="number"
                  inputProps={{ step: 'any' }}
                  label="Longitude"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleInputChange}
                  fullWidth
                />
              </Grid>
              
              {/* Directions Checkboxes */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Station Directions Configurations
                </Typography>
                <Grid container>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.towards_beach} onChange={handleCheckboxChange} name="towards_beach" />}
                      label="Towards Beach"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.towards_tambaram} onChange={handleCheckboxChange} name="towards_tambaram" />}
                      label="Towards Tambaram"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.towards_chengalpattu} onChange={handleCheckboxChange} name="towards_chengalpattu" />}
                      label="Towards Chengalpattu"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.towards_arakkonam} onChange={handleCheckboxChange} name="towards_arakkonam" />}
                      label="Towards Arakkonam"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.towards_others} onChange={handleCheckboxChange} name="towards_others" />}
                      label="Others"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}>
              Save Station
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
