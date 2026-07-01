import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Card, CardContent, Typography, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Alert, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export default function CategoriesManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Dialog state
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (e) {
      setError('Failed to fetch issue categories.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setCategoryName('');
    setOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      if (editingCategory) {
        await axios.put(`/api/categories/${editingCategory.id}`, { name: categoryName.trim() });
      } else {
        await axios.post('/api/categories', { name: categoryName.trim() });
      }
      setOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving category.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this issue category? This will clear flags on past submissions!')) return;
    try {
      await axios.delete(`/api/categories/${id}`);
      fetchCategories();
    } catch (e) {
      console.error(e);
      setError('Failed to delete category.');
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            QA Issue Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure issue checkbox labels present on the inspector's validation form
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}
        >
          Add Category
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
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Category Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} hover>
                  <TableCell>{cat.id}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{cat.name}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleOpenEdit(cat)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(cat.id)}>
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
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            {editingCategory ? 'Edit Issue Category' : 'Create Issue Category'}
          </DialogTitle>
          <DialogContent>
            <TextField
              label="Category Name (e.g. GPS Failure)"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              fullWidth
              required
              sx={{ mt: 1.5 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#006A4E', '&:hover': { bgcolor: '#004A36' } }}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
