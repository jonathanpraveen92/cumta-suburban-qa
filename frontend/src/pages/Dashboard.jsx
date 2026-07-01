import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Grid, Card, CardContent, Typography, Box, TextField, 
  MenuItem, Button, CircularProgress, Alert, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  Speed as SpeedIcon,
  ReportProblem as ProblemIcon,
  Train as TrainIcon,
  CheckCircle as OkIcon,
  CalendarMonth as CalendarIcon,
  Map as MapIcon,
  Error as ErrorIcon,
  Restore as ResetIcon,
  FilterAlt as FilterIcon
} from '@mui/icons-material';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Dashboard Metrics State
  const [data, setData] = useState({
    cards: {},
    kpis: {},
    charts: {
      issuesByStation: [],
      issuesByCategory: [],
      dailyTests: [],
      etaAccuracy: 100,
      stationAccuracyHeatmap: []
    }
  });

  // Filter values state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    stationId: '',
    trainNumber: '',
    severity: '',
    status: '',
    issueCategoryId: ''
  });

  useEffect(() => {
    fetchStationsAndCategories();
    fetchDashboardData();
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
      console.error('Failed to load initial master tables:', e.message);
    }
  };

  const fetchDashboardData = async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      // Build query string
      const params = {};
      Object.entries(currentFilters).forEach(([key, val]) => {
        if (val) params[key] = val;
      });

      const response = await axios.get('/api/analytics/dashboard', { params });
      setData(response.data);
    } catch (e) {
      setError('Failed to fetch dashboard metrics. Please try again.');
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
    fetchDashboardData(filters);
  };

  const resetFilters = () => {
    const cleared = {
      startDate: '',
      endDate: '',
      stationId: '',
      trainNumber: '',
      severity: '',
      status: '',
      issueCategoryId: ''
    };
    setFilters(cleared);
    fetchDashboardData(cleared);
  };

  // Helper card compiler
  const renderCard = (title, value, icon, color) => (
    <Card sx={{ height: '100%', borderLeft: `6px solid ${color}` }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: `${color}15`, p: 1.5, borderRadius: '50%', display: 'flex', color: color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            System Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cross-checking Chennai One ETAs, CRIS NTES API status, and physical suburban movements
          </Typography>
        </Box>
      </Box>

      {/* 1. Dashboard Filters Panel */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Row 1: Station Name, Issue Type, Severity */}
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
                Issue Type
              </Typography>
              <TextField
                select
                name="issueCategoryId"
                value={filters.issueCategoryId}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                <MenuItem value="">All Issues</MenuItem>
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
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

            {/* Row 2: Train Number, From Date, To Date */}
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                From Date
              </Typography>
              <TextField
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.8, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                To Date
              </Typography>
              <TextField
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Row 3: Action Buttons */}
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<ResetIcon />} 
                onClick={resetFilters}
                size="medium"
                sx={{ height: 40, px: 4 }}
              >
                Reset
              </Button>
              <Button 
                variant="contained" 
                startIcon={<FilterIcon />} 
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <>
          {/* 2. Metrics Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard('Total Inspections', data.cards.totalTests, <TrainIcon />, '#0284c7')}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard("Today's Audits", data.cards.todayTests, <CalendarIcon />, '#8b5cf6')}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard('Stations Covered', data.cards.stationsCovered, <MapIcon />, '#059669')}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard('Critical Issues', data.cards.criticalIssues, <ProblemIcon />, '#ef4444')}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard('API / Missing Train Failures', data.cards.apiFailures, <ErrorIcon />, '#f59e0b')}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard('Ticket Failures', data.cards.ticketBookingFailures, <ProblemIcon />, '#dc2626')}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard('Avg ETA Diff (Variance)', `${data.cards.avgEtaDifference} min`, <SpeedIcon />, '#0891b2')}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              {renderCard('Avg CRIS Resp Time', data.cards.avgResponseTime, <OkIcon />, '#10b981')}
            </Grid>
          </Grid>

          {/* 3. Performance Indicators Panel */}
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Key Performance Indicators (KPIs)
              </Typography>
              <Grid container spacing={4} sx={{ textAlign: 'center' }}>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Box>
                    <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {data.kpis.ticketSuccessRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Ticket Booking Success
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Box>
                    <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {data.kpis.jpAccuracy}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Journey Planner Accuracy
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Box>
                    <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {data.kpis.c1AvailabilityRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Chennai One Availability
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Box>
                    <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {data.kpis.ntesAvailabilityRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      NTES Availability
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Box>
                    <Typography variant="h5" color="error.main" sx={{ fontWeight: 'bold', fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {data.kpis.mostProblematicStation}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, display: 'block', mt: 0.5 }}>
                      Highest Failure Station
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Box>
                    <Typography variant="h5" color="error.main" sx={{ fontWeight: 'bold', fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {data.kpis.mostCommonIssue}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, display: 'block', mt: 0.5 }}>
                      Most Common Issue
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 4. Charts Section */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Daily Test count (Line Chart) */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ height: 350 }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Daily Inspection Submissions Trend (Last 7 Days)
                  </Typography>
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.charts.dailyTests}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="tests" stroke="#006A4E" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* ETA Accuracy (Circular Progress "Gauge") */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ height: 350 }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, width: '100%', textAlign: 'left' }}>
                    ETA Variance Level (Diff &lt;= 2 Mins)
                  </Typography>
                  <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                    <CircularProgress
                      variant="determinate"
                      value={100}
                      size={180}
                      thickness={5}
                      sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0' }}
                    />
                    <CircularProgress
                      variant="determinate"
                      value={data.charts.etaAccuracy}
                      size={180}
                      thickness={5}
                      sx={{
                        color: data.charts.etaAccuracy > 80 ? 'success.main' : data.charts.etaAccuracy > 50 ? 'warning.main' : 'error.main',
                        position: 'absolute',
                        left: 0,
                      }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                        {data.charts.etaAccuracy}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Accurate ETA
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                    The percentage of total suburban train observations where the app's ETA matched the physical arrival within 2 minutes.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Issues by Station (Bar Chart) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: 400 }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Issue Count by Station
                  </Typography>
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    {data.charts.issuesByStation.length === 0 ? (
                      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No issues reported for selected filters</Typography>
                      </Box>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.issuesByStation}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} interval={0} fontSize={10} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="issues" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Issues by Category (Pie Chart) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: 400 }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Distribution of Issue Categories
                  </Typography>
                  <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
                    {data.charts.issuesByCategory.length === 0 ? (
                      <Box sx={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No issues reported</Typography>
                      </Box>
                    ) : (
                      <>
                        <ResponsiveContainer width="55%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.charts.issuesByCategory}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {data.charts.issuesByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <Box sx={{ width: '45%', pl: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {data.charts.issuesByCategory.slice(0, 6).map((item, index) => (
                            <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: PIE_COLORS[index % PIE_COLORS.length] }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.name}: {item.value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 5. Station Accuracy Heatmap/Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Station Accuracy Matrix
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Percentage of arrival validation tests where calculations showed accurate ETAs (&lt;= 2 min) at specific stations.
              </Typography>
              {data.charts.stationAccuracyHeatmap.length === 0 ? (
                <Typography color="text.secondary">No station accuracy data available</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Station Name</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Tests Conducted</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Chennai One Accuracy Rate</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>NTES API Accuracy Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.charts.stationAccuracyHeatmap.map((row) => (
                        <TableRow key={row.station}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{row.station}</TableCell>
                          <TableCell align="center">{row.total}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ 
                              display: 'inline-block', px: 2, py: 0.5, borderRadius: 5, fontWeight: 'bold', fontSize: '0.85rem',
                              bgcolor: row.c1Accuracy >= 80 ? 'success.main' : row.c1Accuracy >= 50 ? 'warning.main' : 'error.main',
                              color: '#ffffff'
                            }}>
                              {row.c1Accuracy}%
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ 
                              display: 'inline-block', px: 2, py: 0.5, borderRadius: 5, fontWeight: 'bold', fontSize: '0.85rem',
                              bgcolor: row.ntesAccuracy >= 80 ? 'success.main' : row.ntesAccuracy >= 50 ? 'warning.main' : 'error.main',
                              color: '#ffffff'
                            }}>
                              {row.ntesAccuracy}%
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
