import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Availability = () => {
  const [availList, setAvailList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('availability').select('*, staff(first_name, last_name)');
    if (data) setAvailList(data);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('availability').insert([form]);
    if (!error) { setOpen(false); fetchData(); }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', height: '100vh', overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 500 }}>Staff Availability</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Mark Unavailable</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead><TableRow><TableCell>Staff</TableCell><TableCell>Date</TableCell><TableCell>Reason</TableCell></TableRow></TableHead>
            <TableBody>
              {availList.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.staff ? `${item.staff.first_name} ${item.staff.last_name}` : 'Unknown'}</TableCell>
                  <TableCell>{item.unavailable_date}</TableCell>
                  <TableCell><Chip label={item.reason} size="small" color="warning" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Mark Unavailability</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Staff ID" onChange={e => setForm({...form, staff_id: e.target.value})} />
          <TextField type="date" label="Date" InputLabelProps={{shrink: true}} onChange={e => setForm({...form, unavailable_date: e.target.value})} />
          <FormControl fullWidth>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" onChange={e => setForm({...form, reason: e.target.value})}>
              <MenuItem value="Annual Leave">Annual Leave</MenuItem>
              <MenuItem value="Sick Leave">Sick Leave</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- THIS LINE IS CRITICAL ---
export default Availability;