import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, CircularProgress, Alert
} from '@mui/material';

export default function AuditLogs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/audit');
      setLogs(response.data);
    } catch (e) {
      setError('Failed to fetch system audit logs.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          System Audit Trail Logs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track database manipulations, logins, status modifications, and data export audits
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Action Flag</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Entity Table</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Record ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Audit Notes / Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No historical audit records recorded.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{log.username || 'System'}</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>{log.action}</TableCell>
                    <TableCell>{log.table_name || 'N/A'}</TableCell>
                    <TableCell>{log.record_id || 'N/A'}</TableCell>
                    <TableCell sx={{ fontSize: '0.88rem' }}>{log.details}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
