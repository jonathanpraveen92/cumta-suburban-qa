import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Box, Card, CardContent, Typography, TextField, MenuItem, 
  FormControl, FormControlLabel, RadioGroup, Radio, FormLabel,
  Checkbox, FormGroup, Grid, Button, Alert, CircularProgress,
  IconButton, Divider, Chip
} from '@mui/material';
import { Delete as DeleteIcon, PhotoCamera as PhotoIcon } from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';

export default function ObservationForm() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetchingMasters, setFetchingMasters] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Master lists
  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Available directions for selected station
  const [availableDirections, setAvailableDirections] = useState([]);

  // Form State
  const [form, setForm] = useState({
    tester_name: '',
    mobile_number: '',
    email: '',
    test_date: new Date().toISOString().slice(0, 10),
    test_time: new Date().toTimeString().slice(0, 5),
    station_id: '',
    train_number: '',
    train_name: '',
    direction: '',
    c1_visible: 'true',
    c1_eta: '',
    c1_platform: '',
    c1_journey_planner: 'Not Tested',
    c1_ticket_booking: 'Not Tested',
    ntes_visible: 'true',
    ntes_eta: '',
    ntes_platform: '',
    actual_arrival_time: '',
    actual_platform: '',
    train_status: 'On Time',
    severity: 'Medium',
    remarks: ''
  });

  const [selectedIssues, setSelectedIssues] = useState([]);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Auto-calculated differences
  const [c1Diff, setC1Diff] = useState(null);
  const [ntesDiff, setNtesDiff] = useState(null);

  useEffect(() => {
    fetchMasters();
    if (user) {
      setForm(prev => ({
        ...prev,
        tester_name: user.username,
        email: user.email || '',
        mobile_number: 'N/A'
      }));
    }
  }, [user]);

  const fetchMasters = async () => {
    try {
      const [stationRes, catRes] = await Promise.all([
        axios.get('/api/stations'),
        axios.get('/api/categories')
      ]);
      setStations(stationRes.data);
      setCategories(catRes.data);
    } catch (e) {
      setError('Failed to load stations or issues database.');
      console.error(e);
    } finally {
      setFetchingMasters(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Dynamic directions based on selected station
    if (name === 'station_id') {
      const selectedStation = stations.find(s => s.id === parseInt(value));
      if (selectedStation) {
        const dirs = [];
        if (selectedStation.towards_beach) dirs.push('Towards Beach');
        if (selectedStation.towards_tambaram) dirs.push('Towards Tambaram');
        if (selectedStation.towards_chengalpattu) dirs.push('Towards Chengalpattu');
        if (selectedStation.towards_arakkonam) dirs.push('Towards Arakkonam');
        if (selectedStation.towards_others) dirs.push('Others');
        setAvailableDirections(dirs);
        setForm(prev => ({ ...prev, station_id: value, direction: dirs[0] || '' }));
      }
    }
  };

  // Live difference calculations on input changes
  useEffect(() => {
    if (form.actual_arrival_time) {
      if (form.c1_visible === 'true' && form.c1_eta) {
        setC1Diff(calcDifference(form.actual_arrival_time, form.c1_eta));
      } else {
        setC1Diff(null);
      }
      
      if (form.ntes_visible === 'true' && form.ntes_eta) {
        setNtesDiff(calcDifference(form.actual_arrival_time, form.ntes_eta));
      } else {
        setNtesDiff(null);
      }
    } else {
      setC1Diff(null);
      setNtesDiff(null);
    }
  }, [form.actual_arrival_time, form.c1_visible, form.c1_eta, form.ntes_visible, form.ntes_eta]);

  const calcDifference = (time1, time2) => {
    if (!time1 || !time2) return null;
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    const mins1 = h1 * 60 + m1;
    const mins2 = h2 * 60 + m2;
    
    let diff = mins1 - mins2;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    
    return Math.abs(diff);
  };

  // Color coding selector for difference
  const getDiffColor = (diffVal) => {
    if (diffVal === null) return 'text.secondary';
    if (diffVal <= 2) return 'success.main';
    if (diffVal <= 5) return 'warning.main';
    return 'error.main';
  };

  const handleIssueCheckboxChange = (catId) => {
    setSelectedIssues(prev => {
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Append to images state
    setImages(prev => [...prev, ...files]);

    // Create URL previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.station_id || !form.train_number || !form.actual_arrival_time || !form.actual_platform) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      
      // Append all text inputs
      Object.entries(form).forEach(([key, val]) => {
        formData.append(key, val);
      });
      
      // Append issue categories as JSON string
      formData.append('issues', JSON.stringify(selectedIssues));
      
      // Append files
      images.forEach(imgFile => {
        formData.append('images', imgFile);
      });

      await axios.post('/api/observations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Inspection observation record submitted successfully!');
      // Reset form
      setForm(prev => ({
        ...prev,
        train_number: '',
        train_name: '',
        c1_eta: '',
        c1_platform: '',
        c1_journey_planner: 'Not Tested',
        c1_ticket_booking: 'Not Tested',
        ntes_eta: '',
        ntes_platform: '',
        actual_arrival_time: '',
        actual_platform: '',
        train_status: 'On Time',
        severity: 'Medium',
        remarks: ''
      }));
      setSelectedIssues([]);
      setImages([]);
      setImagePreviews([]);
      
      window.scrollTo(0, 0);
      
      // Redirect after 2s
      setTimeout(() => {
        navigate('/observations');
      }, 1500);
      
    } catch (e) {
      setError(e.response?.data?.message || 'Server error submitting observation.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingMasters) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
        Field Validation Submission Form
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Input real-time train updates at suburban stations to run audits against NTES APIs and Chennai One ETAs
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        {/* SECTION 1: Tester & Test Details */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
             <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              1. Inspection & Test Details
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Inspection Date
                </Typography>
                <TextField
                  type="date"
                  name="test_date"
                  value={form.test_date}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Inspection Time
                </Typography>
                <TextField
                  type="time"
                  name="test_time"
                  value={form.test_time}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Station Name
                </Typography>
                <TextField
                  select
                  name="station_id"
                  value={form.station_id}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                >
                  {stations.map(st => (
                    <MenuItem key={st.id} value={st.id}>{st.station_name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Train Direction
                </Typography>
                <TextField
                  select
                  name="direction"
                  value={form.direction}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!form.station_id}
                  required
                  size="small"
                >
                  {availableDirections.map(dir => (
                    <MenuItem key={dir} value={dir}>{dir}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* SECTION 2: Train General Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              2. Train Identification
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Train Number
                </Typography>
                <TextField
                  name="train_number"
                  value={form.train_number}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="e.g. 40001"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Train Name
                </Typography>
                <TextField
                  name="train_name"
                  value={form.train_name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="e.g. Beach - Tambaram Local"
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* SECTION 3: Chennai One App comparison */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              3. Chennai One App Display
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Visible in Chennai One App?</FormLabel>
                  <RadioGroup row name="c1_visible" value={form.c1_visible} onChange={handleInputChange}>
                    <FormControlLabel value="true" control={<Radio />} label="Yes" />
                    <FormControlLabel value="false" control={<Radio />} label="No" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              {form.c1_visible === 'true' && (
                <>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Chennai One App ETA
                    </Typography>
                    <TextField
                      type="time"
                      name="c1_eta"
                      value={form.c1_eta}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Chennai One Platform
                    </Typography>
                    <TextField
                      name="c1_platform"
                      value={form.c1_platform}
                      onChange={handleInputChange}
                      fullWidth
                      placeholder="e.g. 3"
                      size="small"
                    />
                  </Grid>
                </>
              )}
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Journey Planner Routing Check
                </Typography>
                <TextField
                  select
                  name="c1_journey_planner"
                  value={form.c1_journey_planner}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="Correct">Correct</MenuItem>
                  <MenuItem value="Incorrect">Incorrect</MenuItem>
                  <MenuItem value="Not Tested">Not Tested</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Ticket Booking Transaction Status
                </Typography>
                <TextField
                  select
                  name="c1_ticket_booking"
                  value={form.c1_ticket_booking}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="Successful">Successful</MenuItem>
                  <MenuItem value="Failed">Failed</MenuItem>
                  <MenuItem value="Not Tested">Not Tested</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* SECTION 4: CRIS NTES API comparison */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              4. CRIS NTES API Details
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Visible in NTES / National Train Enquiry?</FormLabel>
                  <RadioGroup row name="ntes_visible" value={form.ntes_visible} onChange={handleInputChange}>
                    <FormControlLabel value="true" control={<Radio />} label="Yes" />
                    <FormControlLabel value="false" control={<Radio />} label="No" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              {form.ntes_visible === 'true' && (
                <>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      NTES ETA
                    </Typography>
                    <TextField
                      type="time"
                      name="ntes_eta"
                      value={form.ntes_eta}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      NTES Platform
                    </Typography>
                    <TextField
                      name="ntes_platform"
                      value={form.ntes_platform}
                      onChange={handleInputChange}
                      fullWidth
                      placeholder="e.g. 3"
                      size="small"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* SECTION 5: Actual Observation on Platform */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              5. Physical Observation (Ground Truth)
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Actual Arrival Time
                </Typography>
                <TextField
                  type="time"
                  name="actual_arrival_time"
                  value={form.actual_arrival_time}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Actual Platform Arrived
                </Typography>
                <TextField
                  name="actual_platform"
                  value={form.actual_platform}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="e.g. 3"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Physical Train Status
                </Typography>
                <TextField
                  select
                  name="train_status"
                  value={form.train_status}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                >
                  <MenuItem value="On Time">On Time</MenuItem>
                  <MenuItem value="Delayed">Delayed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* DYNAMIC LIVE CALCULATED VARIANCES */}
            {form.actual_arrival_time && (
              <Box sx={{ mt: 3, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                  Auto-Calculated Arrival Variance:
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">Chennai One Delay Difference:</Typography>
                      {c1Diff === null ? (
                        <Chip label="N/A" size="small" />
                      ) : (
                        <Chip 
                          label={`${c1Diff} min`} 
                          size="small" 
                          sx={{ 
                            bgcolor: getDiffColor(c1Diff), 
                            color: '#ffffff',
                            fontWeight: 'bold'
                          }} 
                        />
                      )}
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">CRIS NTES Delay Difference:</Typography>
                      {ntesDiff === null ? (
                        <Chip label="N/A" size="small" />
                      ) : (
                        <Chip 
                          label={`${ntesDiff} min`} 
                          size="small" 
                          sx={{ 
                            bgcolor: getDiffColor(ntesDiff), 
                            color: '#ffffff',
                            fontWeight: 'bold' 
                          }} 
                        />
                      )}
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>● Green &lt;= 2 min</Typography>
                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 'bold' }}>● Yellow &lt;= 5 min</Typography>
                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>● Red &gt; 5 min</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* SECTION 6: Issue Checklist Selection */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              6. QA Issues Checklist (Check all that apply)
            </Typography>
            <FormGroup>
              <Grid container spacing={1}>
                {categories.map(cat => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedIssues.includes(cat.id)}
                          onChange={() => handleIssueCheckboxChange(cat.id)}
                        />
                      }
                      label={cat.name}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </CardContent>
        </Card>

        {/* SECTION 7: Severity & Remarks */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              7. Remarks & Severity
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Severity Level
                </Typography>
                <TextField
                  select
                  name="severity"
                  value={form.severity}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Inspector Remarks & Observations
                </Typography>
                <TextField
                  name="remarks"
                  value={form.remarks}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Enter details about discrepancies, ticket issues, platform changes..."
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* SECTION 8: Image Uploader */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
              8. Upload Inspection Screenshots
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Upload screenshots of Chennai One app display, NTES board, or physical railway indicator boards (Max 5 files).
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoIcon />}
                sx={{ py: 1 }}
              >
                Choose Photos
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />
              </Button>
              
              <Typography variant="body2" color="text.secondary">
                {images.length} file(s) selected
              </Typography>
            </Box>

            {imagePreviews.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                {imagePreviews.map((url, index) => (
                  <Box 
                    key={url} 
                    sx={{ 
                      position: 'relative', 
                      width: 100, 
                      height: 100, 
                      borderRadius: 1.5, 
                      overflow: 'hidden',
                      border: '1px solid #ddd' 
                    }}
                  >
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeImage(index)}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(255,255,255,0.7)',
                        color: 'error.main',
                        '&:hover': { bgcolor: 'white' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 6 }}>
          <Button 
            variant="outlined" 
            size="large" 
            onClick={() => navigate('/observations')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ bgcolor: '#006A4E', px: 4, '&:hover': { bgcolor: '#004A36' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Inspection'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
