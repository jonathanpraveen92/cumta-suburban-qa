import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  Box, Card, CardContent, Typography, TextField, MenuItem, 
  Button, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, IconButton, Chip, Dialog, DialogTitle, 
  DialogContent, DialogActions, Grid, Divider, CircularProgress, 
  Alert, Tooltip, Drawer
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Email as EmailIcon,
  CheckCircle as ResolveIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';

export default function ObservationList() {
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [observations, setObservations] = useState([]);
  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filters State
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    stationId: '',
    trainNumber: '',
    severity: '',
    status: '',
    issueCategoryId: '',
    search: ''
  });

  // Selected Detail Drawer state
  const [selectedObs, setSelectedObs] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [remarksUpdate, setRemarksUpdate] = useState('');
  
  // Lightbox State
  const [activeImage, setActiveImage] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  useEffect(() => {
    fetchStationsAndCategories();
    fetchObservations();
  }, []);

  const fetchStationsAndCategories = async () => {
    try {
      const [stationRes, catRes] = await Promise.all([
        axios.get('/api/stations'),
        axios.get('/api/categories')
      ]);
      setStations(stationRes.data);
      setCategories(catRes.data);
    } catch (e) {
      console.error('Failed to load initial master lists:', e.message);
    }
  };

  const fetchObservations = async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(currentFilters).forEach(([key, val]) => {
        if (val) params[key] = val;
      });

      const response = await axios.get('/api/observations', { params });
      setObservations(response.data);
    } catch (e) {
      setError('Failed to fetch observations.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchObservations(filters);
  };

  const resetFilters = () => {
    const cleared = {
      startDate: '',
      endDate: '',
      stationId: '',
      trainNumber: '',
      severity: '',
      status: '',
      issueCategoryId: '',
      search: ''
    };
    setFilters(cleared);
    fetchObservations(cleared);
  };

  // Fetch observation detail on row click
  const handleOpenDetail = async (id) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const response = await axios.get(`/api/observations/${id}`);
      setSelectedObs(response.data);
      setStatusUpdate(response.data.status);
      setRemarksUpdate(response.data.remarks || '');
    } catch (e) {
      console.error('Error fetching detail:', e);
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedObs) return;
    
    try {
      await axios.put(`/api/observations/${selectedObs.id}`, {
        status: statusUpdate,
        remarks: remarksUpdate
      });
      // Refresh detail and list
      setSelectedObs(prev => ({ ...prev, status: statusUpdate, remarks: remarksUpdate }));
      fetchObservations();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this observation?')) return;
    
    try {
      await axios.delete(`/api/observations/${id}`);
      fetchObservations();
      if (selectedObs?.id === id) {
        setDetailOpen(false);
      }
    } catch (e) {
      console.error('Failed to delete observation:', e);
    }
  };

  // JWT-secure file downloader
  const handleDownload = async (format) => {
    try {
      const params = {};
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params[key] = val;
      });

      const response = await axios.get(`/api/reports/${format}`, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : format;
      const filename = `CUMTA_QA_Report_${new Date().toISOString().slice(0, 10)}.${ext}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to generate file.');
    }
  };

  // Email simulation trigger
  const handleSendEmailReport = async () => {
    if (!emailRecipient) return;
    setEmailSubmitting(true);
    try {
      const response = await axios.post('/api/reports/email', {
        filters,
        emailRecipient
      });
      alert(response.data.message);
      setEmailDialogOpen(false);
      setEmailRecipient('');
    } catch (error) {
      console.error(error);
      alert('Email report dispatch failed.');
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Color selection for difference chip
  const getDiffColor = (diffVal) => {
    if (diffVal === null) return 'default';
    if (diffVal <= 2) return 'success';
    if (diffVal <= 5) return 'warning';
    return 'error';
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Low': return 'info';
      case 'Medium': return 'warning';
      case 'High': return 'error';
      case 'Critical': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (stat) => {
    switch (stat) {
      case 'Pending': return 'warning';
      case 'Resolved': return 'success';
      case 'Closed': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Inspection Observations Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse, search, audit, and export suburban train QA audits
          </Typography>
        </Box>
        
        {/* Export Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<EmailIcon />} 
            onClick={() => setEmailDialogOpen(true)}
            size="small"
          >
            Email Report
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={() => handleDownload('csv')}
            size="small"
          >
            CSV
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={() => handleDownload('excel')}
            size="small"
          >
            Excel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={() => handleDownload('pdf')}
            size="small"
            sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}
          >
            PDF Report
          </Button>
        </Box>
      </Box>

      {/* Filter panel */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Row 1: Station Name, Severity, Status */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Station Name
              </Typography>
              <TextField
                select
                name="stationId"
                value={filters.stationId}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                <MenuItem value="">All Stations</MenuItem>
                {stations.map(st => (
                  <MenuItem key={st.id} value={st.id}>{st.station_name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Severity
              </Typography>
              <TextField
                select
                name="severity"
                value={filters.severity}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                <MenuItem value="">All Severities</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Audit Status
              </Typography>
              <TextField
                select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </TextField>
            </Grid>

            {/* Row 2: Train Number, Search Keywords */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Train Number
              </Typography>
              <TextField
                name="trainNumber"
                value={filters.trainNumber}
                onChange={handleFilterChange}
                fullWidth
                size="small"
                placeholder="e.g. 40001"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 8 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Search Keywords
              </Typography>
              <TextField
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                fullWidth
                size="small"
                placeholder="Search Train Name, remarks, or inspector..."
              />
            </Grid>

            {/* Row 3: Action Buttons */}
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
              <Button 
                variant="outlined" 
                onClick={resetFilters}
                size="medium"
                sx={{ height: 40, px: 4 }}
              >
                Reset
              </Button>
              <Button 
                variant="contained" 
                onClick={applyFilters}
                size="medium"
                sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' }, height: 40, px: 4 }}
              >
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Main Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Station</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Train No / Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>C1 ETA Diff</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>NTES ETA Diff</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Issues Flagged</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Severity</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {observations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No inspection records found matching your filters.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                observations.map((obs) => (
                  <TableRow 
                    key={obs.id} 
                    hover 
                    onClick={() => handleOpenDetail(obs.id)}
                    sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(obs.test_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {obs.test_time}
                      </Typography>
                    </TableCell>
                    <TableCell>{obs.station_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{obs.train_number}</Typography>
                      <Typography variant="caption" color="text.secondary">{obs.train_name}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {obs.c1_visible ? (
                        <Chip 
                          label={`${obs.c1_eta_diff_min} min`} 
                          size="small" 
                          color={getDiffColor(obs.c1_eta_diff_min)}
                          sx={{ color: '#fff', fontWeight: 'bold' }}
                        />
                      ) : (
                        <Chip label="Hidden" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {obs.ntes_visible ? (
                        <Chip 
                          label={`${obs.ntes_eta_diff_min} min`} 
                          size="small" 
                          color={getDiffColor(obs.ntes_eta_diff_min)}
                          sx={{ color: '#fff', fontWeight: 'bold' }}
                        />
                      ) : (
                        <Chip label="Hidden" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {obs.issue_names ? (
                        <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                          {obs.issue_names}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>✔ None</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={obs.severity} size="small" color={getSeverityColor(obs.severity)} sx={{ color: '#fff', fontWeight: 'bold' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={obs.status} size="small" color={getStatusColor(obs.status)} variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton size="small" color="primary">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        {user?.role === 'admin' && (
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={(e) => handleDelete(obs.id, e)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DETAIL SIDE DRAWER PANEL */}
      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 3 } }}
      >
        {detailLoading || !selectedObs ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Inspection Details
              </Typography>
              <Chip label={selectedObs.status} color={getStatusColor(selectedObs.status)} />
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            {/* Content list */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Inspector</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.tester_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedObs.mobile_number}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Test Date / Time</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{new Date(selectedObs.test_date).toLocaleDateString()}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.test_time}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Station location</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{selectedObs.station_name} ({selectedObs.zone})</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>Train Info</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Train No & Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.train_number}</Typography>
                  <Typography variant="body2">{selectedObs.train_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Direction</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.direction}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Chennai One Info */}
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#0ea5e9' }}>Chennai One App details</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Visible?</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.c1_visible ? 'Yes' : 'No'}</Typography>
                </Grid>
                {selectedObs.c1_visible && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">ETA Displayed</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.c1_eta || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Platform</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.c1_platform || 'N/A'}</Typography>
                    </Grid>
                  </>
                )}
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Journey Planner</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.c1_journey_planner}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Ticket Booking</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.c1_ticket_booking}</Typography>
                </Grid>
              </Grid>

              {/* NTES Info */}
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>CRIS NTES API details</Typography>
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Visible?</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.ntes_visible ? 'Yes' : 'No'}</Typography>
                </Grid>
                {selectedObs.ntes_visible && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">ETA Displayed</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.ntes_eta || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Platform</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.ntes_platform || 'N/A'}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Ground Truth */}
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'success.main' }}>Ground Truth Observation</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Actual Arrival</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.actual_arrival_time}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Actual Platform</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.actual_platform}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Train Status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedObs.train_status}</Typography>
                </Grid>
              </Grid>

              {/* Variances */}
              <Box sx={{ p: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Chennai One ETA Diff</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {selectedObs.c1_visible ? (
                        <Chip label={`${selectedObs.c1_eta_diff_min} min`} size="small" color={getDiffColor(selectedObs.c1_eta_diff_min)} sx={{ color: '#fff', fontWeight: 'bold' }} />
                      ) : (
                        <Typography variant="body2">N/A</Typography>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">NTES ETA Diff</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {selectedObs.ntes_visible ? (
                        <Chip label={`${selectedObs.ntes_eta_diff_min} min`} size="small" color={getDiffColor(selectedObs.ntes_eta_diff_min)} sx={{ color: '#fff', fontWeight: 'bold' }} />
                      ) : (
                        <Typography variant="body2">N/A</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Issues checked */}
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Flagged Issues Checklist</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {selectedObs.issues && selectedObs.issues.length > 0 ? (
                  selectedObs.issues.map(iss => (
                    <Chip key={iss.id} label={iss.name} color="error" variant="outlined" size="small" />
                  ))
                ) : (
                  <Chip label="No QA issues reported" color="success" size="small" />
                )}
              </Box>

              {/* Uploaded image files */}
              {selectedObs.images && selectedObs.images.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Screenshots Attachments</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {selectedObs.images.map(img => (
                      <Box 
                        key={img.id} 
                        sx={{ width: 80, height: 80, borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer', border: '1px solid #ccc' }}
                        onClick={() => setActiveImage(`http://localhost:5000${img.file_path}`)}
                      >
                        <img 
                          src={`http://localhost:5000${img.file_path}`} 
                          alt={img.file_name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Remarks */}
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Remarks</Typography>
              <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap', bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc', p: 1.5, borderRadius: 2 }}>
                {selectedObs.remarks || 'No remarks provided.'}
              </Typography>
            </Box>

            {/* Actions (Admin status update) */}
            <Divider sx={{ my: 2 }} />
            {user?.role === 'admin' ? (
              <Box sx={{ mt: 'auto' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>Admin Actions: Update status</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label="Audit Status"
                      value={statusUpdate}
                      onChange={(e) => setStatusUpdate(e.target.value)}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Resolved">Resolved</MenuItem>
                      <MenuItem value="Closed">Closed</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      variant="contained" 
                      startIcon={<ResolveIcon />} 
                      onClick={handleUpdateStatus}
                      fullWidth
                      sx={{ height: '40px', bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}
                    >
                      Update
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Update Resolution Notes"
                      value={remarksUpdate}
                      onChange={(e) => setRemarksUpdate(e.target.value)}
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box sx={{ mt: 'auto', p: 1, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Logged in as Field Inspector. Submission locked. Only Admins can modify status.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      <Dialog 
        open={Boolean(activeImage)} 
        onClose={() => setActiveImage(null)}
        maxWidth="lg"
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {activeImage && (
            <img 
              src={activeImage} 
              alt="Fullscreen visual attachment" 
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} 
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveImage(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* EMAIL REPORT RECIPIENT DIALOG */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Dispatch QA Report via Email</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will send an compiled audit report summary matching your active filters to the recipient email.
          </Typography>
          <TextField
            label="Recipient Email Address"
            type="email"
            value={emailRecipient}
            onChange={(e) => setEmailRecipient(e.target.value)}
            fullWidth
            required
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)} disabled={emailSubmitting}>Cancel</Button>
          <Button 
            onClick={handleSendEmailReport} 
            variant="contained" 
            disabled={!emailRecipient || emailSubmitting}
            sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}
          >
            {emailSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
