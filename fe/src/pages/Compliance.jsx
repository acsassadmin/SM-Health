import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Avatar, Card, CardContent, 
  LinearProgress, Stack, Modal, TextField, Select, MenuItem, 
  DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment, 
  Grid, Divider
} from '@mui/material';
import { 
  Close as CloseIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  VerifiedUser as VerifiedUserIcon, 
  Warning as WarningIcon,          
  Error as ErrorOutlineIcon, 
  Edit as EditIcon,
  Person as PersonIcon
} from '@mui/icons-material';

// IMPORT YOUR SUPABASE CLIENT HERE
import { supabase } from '../supabaseClient'; 

export default function CompliancePage() {
  const [complianceList, setComplianceList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null); 
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal Form State
  const [formData, setFormData] = useState({
    staff_id: '',
    dbs_checked: false,
    dbs_expiry: '',
    dbs_certificate_number: '',
    rtw_checked: false,
    rtw_expiry: '',
    rtw_document_type: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Staff
      const { data: staffData, error: staffError } = await supabase
  .from('staff')
  .select('*');
      
      if (staffError) throw staffError;

      // 2. Fetch Compliance
      const { data: compData, error: compError } = await supabase
        .from('staff_compliance')
        .select('*');

      if (compError) throw compError;

      // 3. Merge Data (Manual Join)
      const mergedData = (staffData || []).map(staff => {
        const comp = compData?.find(c => c.staff_id === staff.id);
        const status = getDbsStatus(comp?.dbs_expiry, comp?.dbs_checked);
        
        return {
          ...staff,
          ...comp, 
          dbs_status: status
        };
      });

      setComplianceList(mergedData);

    } catch (error) {
      console.error("Error fetching compliance data:", error);
      alert("Failed to load compliance data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const getDbsStatus = (expiryDate, isChecked) => {
    if (!isChecked || !expiryDate) return 'Not Checked';
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Valid';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getBadgeColor = (status) => {
    switch (status) {
      case 'Valid': return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
      case 'Expiring Soon': return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'Expired': return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  // --- FILTER LOGIC ---
  const filteredList = useMemo(() => {
    return complianceList.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        item.first_name.toLowerCase().includes(searchLower) ||
        item.last_name.toLowerCase().includes(searchLower) ||
        item.email.toLowerCase().includes(searchLower);
      
      const matchesRole = roleFilter === 'All' || item.role_category === roleFilter;
      const matchesStatus = statusFilter === 'All' || item.dbs_status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [complianceList, searchQuery, roleFilter, statusFilter]);

  // Dynamic Role Options from Database
  const roleOptions = useMemo(() => {
    const roles = [...new Set(complianceList.map(s => s.role_category))];
    return roles.sort();
  }, [complianceList]);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    const total = complianceList.length;
    const expired = complianceList.filter(s => s.dbs_status === 'Expired').length;
    const expiring = complianceList.filter(s => s.dbs_status === 'Expiring Soon').length;
    const rtwIssues = complianceList.filter(s => {
      if (!s.rtw_checked || !s.rtw_expiry) return false;
      return new Date(s.rtw_expiry) < new Date();
    }).length;
    
    const validCount = complianceList.filter(s => s.dbs_status === 'Valid').length;
    const percent = total > 0 ? Math.round((validCount / total) * 100) : 0;

    return { total, expired, expiring, rtwIssues, percent };
  }, [complianceList]);

  // --- HANDLERS ---

  const handleEdit = (staff) => {
    setSelectedStaff(staff);
    setFormData({
      staff_id: staff.id,
      dbs_checked: !!staff.dbs_checked,
      dbs_expiry: staff.dbs_expiry || '',
      dbs_certificate_number: staff.dbs_certificate_number || '',
      rtw_checked: !!staff.rtw_checked,
      rtw_expiry: staff.rtw_expiry || '',
      rtw_document_type: staff.rtw_document_type || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        staff_id: Number(formData.staff_id),
        dbs_checked: formData.dbs_checked,
        dbs_expiry: formData.dbs_expiry || null,
        dbs_certificate_number: formData.dbs_certificate_number,
        rtw_checked: formData.rtw_checked,
        rtw_expiry: formData.rtw_expiry || null,
        rtw_document_type: formData.rtw_document_type
      };

      const { error } = await supabase
        .from('staff_compliance')
        .upsert(payload, { onConflict: 'staff_id' });

      if (error) throw error;

      alert('Compliance updated successfully');
      setIsModalOpen(false);
      fetchData(); 
    } catch (error) {
      console.error("Error saving compliance:", error);
      alert("Failed to save compliance data.");
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'DBS Status', 'DBS Expiry', 'RTW Expiry'];
    const rows = filteredList.map(s => [
      `${s.first_name} ${s.last_name}`,
      s.email,
      s.role_category,
      s.dbs_status,
      s.dbs_expiry || 'N/A',
      s.rtw_expiry || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "compliance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
      
      {/* PAGE HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'DM Serif Display, serif', color: '#0c1f3f', fontWeight: 400 }}>
            Compliance Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#5e7187' }}>
            Monitor DBS checks and Right to Work status
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          sx={{ 
            bgcolor: '#1a5fba', 
            textTransform: 'none',
            boxShadow: '0 2px 14px rgba(26,95,186,0.3)',
            '&:hover': { bgcolor: '#0f4d9a' }
          }}
        >
          Export CSV
        </Button>
      </Box>

      {/* STATS GRID */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Expired DBS', val: stats.expired, color: '#fee2e2', text: '#991b1b', icon: <ErrorOutlineIcon /> },
          { label: 'Expiring Soon', val: stats.expiring, color: '#fef3c7', text: '#b45309', icon: <WarningIcon /> },
          { label: 'RTW Issues', val: stats.rtwIssues, color: '#fee2e2', text: '#991b1b', icon: <PersonIcon /> },
          { label: 'Compliance Rate', val: `${stats.percent}%`, color: '#dcfce7', text: '#166534', icon: <VerifiedUserIcon /> },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: stat.color, border: 0, boxShadow: 'none' }}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.5)', color: stat.text }}>
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: stat.text, lineHeight: 1 }}>{stat.val}</Typography>
                <Typography variant="caption" sx={{ color: stat.text, fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* MAIN LAYOUT */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 3 }}>
        
        {/* LEFT: TABLE */}
        <Paper sx={{ borderRadius: 3, border: '1px solid #e1e8f4', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {/* TOOLBAR */}
          <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e1e8f4', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search staff..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <Select
              size="small"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="All">All Roles</MenuItem>
              {roleOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>

            <Select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Valid">Valid</MenuItem>
              <MenuItem value="Expiring Soon">Expiring Soon</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
              <MenuItem value="Not Checked">Not Checked</MenuItem>
            </Select>
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead sx={{ bgcolor: '#f7f9fc' }}>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>DBS Status</TableCell>
                  <TableCell>DBS Expiry</TableCell>
                  <TableCell>RTW Expiry</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Loading data...</TableCell></TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>No records found.</TableCell></TableRow>
                ) : (
                  filteredList.map((staff) => {
                    const badgeStyle = getBadgeColor(staff.dbs_status);
                    return (
                      <TableRow key={staff.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#1a5fba', fontSize: 12, fontWeight: 'bold' }}>
                              {getInitials(`${staff.first_name} ${staff.last_name}`)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a2535' }}>
                                {staff.first_name} {staff.last_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>{staff.email}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{staff.role_category}</TableCell>
                        <TableCell>
                          <Chip 
                            label={staff.dbs_status} 
                            size="small" 
                            sx={{ 
                              bgcolor: badgeStyle.bg, 
                              color: badgeStyle.color, 
                              border: `1px solid ${badgeStyle.border}`,
                              fontWeight: 600,
                              fontSize: 11
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: '#334155' }}>{formatDate(staff.dbs_expiry)}</TableCell>
                        <TableCell sx={{ fontSize: 13, color: staff.rtw_expiry && new Date(staff.rtw_expiry) < new Date() ? '#dc2626' : '#334155' }}>
                          {formatDate(staff.rtw_expiry)}
                        </TableCell>
                        <TableCell align="right">
                          <Button 
                            size="small" 
                            startIcon={<EditIcon />}
                            onClick={() => handleEdit(staff)}
                            sx={{ textTransform: 'none', fontSize: 12 }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* RIGHT: SUMMARY */}
        <Box>
          <Card sx={{ borderRadius: 3, border: '1px solid #e1e8f4' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1a2535' }}>
                Issues Overview
              </Typography>
              
              <Stack spacing={2}>
                {/* Expired DBS List */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                    Expired DBS ({complianceList.filter(s => s.dbs_status === 'Expired').length})
                  </Typography>
                  <Stack spacing={1}>
                    {complianceList.filter(s => s.dbs_status === 'Expired').slice(0, 3).map(s => (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>{s.first_name} {s.last_name}</span>
                        <Typography variant="caption" color="error">{formatDate(s.dbs_expiry)}</Typography>
                      </Box>
                    ))}
                    {complianceList.filter(s => s.dbs_status === 'Expired').length === 0 && (
                      <Typography variant="caption" color="success">None</Typography>
                    )}
                  </Stack>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Expiring DBS List */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#d97706', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                    Expiring Soon ({complianceList.filter(s => s.dbs_status === 'Expiring Soon').length})
                  </Typography>
                  <Stack spacing={1}>
                    {complianceList.filter(s => s.dbs_status === 'Expiring Soon').slice(0, 3).map(s => (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>{s.first_name} {s.last_name}</span>
                        <Typography variant="caption" color="warning.main">{formatDate(s.dbs_expiry)}</Typography>
                      </Box>
                    ))}
                     {complianceList.filter(s => s.dbs_status === 'Expiring Soon').length === 0 && (
                      <Typography variant="caption" color="success">None</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

      </Box>

      {/* EDIT/ADD MODAL */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 0
        }}>
          <Box sx={{ bgcolor: '#1a5fba', px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography id="modal-title" variant="h6" sx={{ color: '#fff', fontFamily: 'DM Serif Display, serif' }}>
              Update Compliance
            </Typography>
            <IconButton onClick={() => setIsModalOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={2.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>DBS Details</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <Typography variant="body2">DBS Checked:</Typography>
                 <Select
                    size="small"
                    value={formData.dbs_checked}
                    onChange={(e) => setFormData({...formData, dbs_checked: e.target.value === 'true'})}
                  >
                    <MenuItem value={true}>Yes</MenuItem>
                    <MenuItem value={false}>No</MenuItem>
                  </Select>
              </Box>

              <TextField
                label="DBS Expiry Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.dbs_expiry}
                onChange={(e) => setFormData({...formData, dbs_expiry: e.target.value})}
              />

              <TextField
                label="Certificate Number"
                fullWidth
                size="small"
                value={formData.dbs_certificate_number}
                onChange={(e) => setFormData({...formData, dbs_certificate_number: e.target.value})}
              />

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Right to Work</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <Typography variant="body2">RTW Checked:</Typography>
                 <Select
                    size="small"
                    value={formData.rtw_checked}
                    onChange={(e) => setFormData({...formData, rtw_checked: e.target.value === 'true'})}
                  >
                    <MenuItem value={true}>Yes</MenuItem>
                    <MenuItem value={false}>No</MenuItem>
                  </Select>
              </Box>

              <TextField
                label="RTW Expiry Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.rtw_expiry}
                onChange={(e) => setFormData({...formData, rtw_expiry: e.target.value})}
              />

              <TextField
                label="Document Type"
                fullWidth
                size="small"
                value={formData.rtw_document_type}
                onChange={(e) => setFormData({...formData, rtw_document_type: e.target.value})}
                placeholder="e.g. Passport, Visa"
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              sx={{ bgcolor: '#1a5fba', '&:hover': { bgcolor: '#0f4d9a' } }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Box>
      </Modal>

    </Box>
  );
}