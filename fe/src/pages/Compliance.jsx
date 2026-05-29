import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Avatar, Card, CardContent, 
  Stack, Modal, TextField, Select, MenuItem, 
  IconButton, InputAdornment, 
  Grid, Divider, Link, Tooltip
} from '@mui/material';
import { 
  Close as CloseIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  VerifiedUser as VerifiedUserIcon, 
  Warning as WarningIcon,          
  Error as ErrorOutlineIcon, 
  Edit as EditIcon,
  Person as PersonIcon,
  Description as FileIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// IMPORT YOUR SUPABASE CLIENT HERE
import { supabase } from '../supabaseClient'; 

export default function CompliancePage() {
  const [complianceList, setComplianceList] = useState([]);
  const [roleCategories, setRoleCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    rtw_checked: false,
    rtw_expiry: ''
  });

  useEffect(() => {
    fetchData();
    fetchRoles();
  }, []);

  // Fetch Roles from staff_role_categories table
  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_role_categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Extract just the names for the dropdown
      const roles = data.map(r => r.name);
      setRoleCategories(roles);
    } catch (error) {
      console.error("Error fetching role categories:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Staff ONLY (Getting all compliance details directly from the staff table)
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*');
      
      if (staffError) throw staffError;

      // 2. Map statuses directly from the staff object
      const processedData = (staffData || []).map(staff => {
        return {
          ...staff,
          dbs_status: getDbsStatus(staff.dbs_expiry, staff.dbs_checked),
          rtw_status: getRtwStatus(staff.rtw_expiry, staff.rtw_checked),
          // Ensure role is consistent
          role_category: staff.role || staff.role_category || 'Unassigned' 
        };
      });

      setComplianceList(processedData);

    } catch (error) {
      console.error("Error fetching compliance data:", error);
      alert("Failed to load compliance data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const getDbsStatus = (expiryDate, isChecked) => {
    if (!isChecked) return 'No Record';
    if (!expiryDate) return 'No Date';
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Valid';
  };

  const getRtwStatus = (expiryDate, isChecked) => {
    if (!isChecked) return 'Not Checked';
    if (!expiryDate) return 'No Date';
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDate);
    return expiry < today ? 'Expired' : 'Valid';
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
      case 'No Record': 
      case 'Not Checked': 
      case 'No Date':
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  // --- SMART DOCUMENT LINKER ---
  const findRelevantDoc = (staff, type) => {
    if (!staff.custom_data || !staff.custom_data.uploaded_documents) return null;
    
    const docs = staff.custom_data.uploaded_documents;
    const keywords = type === 'dbs' 
      ? ['dbs', 'disclosure', 'check', 'certificate'] 
      : ['rtw', 'right', 'work', 'passport', 'visa', 'brp'];

    return docs.find(doc => 
      keywords.some(k => doc.name.toLowerCase().includes(k))
    ) || null;
  };

  // --- FILTER LOGIC ---
  const filteredList = useMemo(() => {
    return complianceList.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (item.first_name && item.first_name.toLowerCase().includes(searchLower)) ||
        (item.last_name && item.last_name.toLowerCase().includes(searchLower)) ||
        (item.email && item.email.toLowerCase().includes(searchLower));
      
      const matchesRole = roleFilter === 'All' || item.role_category === roleFilter;
      const matchesStatus = statusFilter === 'All' || item.dbs_status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [complianceList, searchQuery, roleFilter, statusFilter]);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    const total = complianceList.length;
    const expired = complianceList.filter(s => s.dbs_status === 'Expired').length;
    const expiring = complianceList.filter(s => s.dbs_status === 'Expiring Soon').length;
    const noRecord = complianceList.filter(s => s.dbs_status === 'No Record').length;
    const rtwIssues = complianceList.filter(s => s.rtw_status === 'Expired').length;
    
    const validCount = complianceList.filter(s => s.dbs_status === 'Valid').length;
    const percent = total > 0 ? Math.round((validCount / total) * 100) : 0;

    return { total, expired, expiring, noRecord, rtwIssues, percent };
  }, [complianceList]);

  // --- HANDLERS ---

  const handleEdit = (staff) => {
    setSelectedStaff(staff);
    setFormData({
      staff_id: staff.id,
      dbs_checked: !!staff.dbs_checked,
      dbs_expiry: staff.dbs_expiry || '',
      rtw_checked: !!staff.rtw_checked,
      rtw_expiry: staff.rtw_expiry || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // Prevent saving if ID is missing
    if (!formData.staff_id) {
      alert("Error: Could not identify staff member.");
      return;
    }

    setSaving(true);
    try {
      // ONLY update the columns that actually exist in your staff table
      const payload = {
        dbs_checked: formData.dbs_checked,
        dbs_expiry: formData.dbs_expiry || null,
        rtw_checked: formData.rtw_checked,
        rtw_expiry: formData.rtw_expiry || null
      };

      // Saving directly back to the staff table using the id column
      const { error } = await supabase
        .from('staff')
        .update(payload)
        .eq('id', formData.staff_id);

      if (error) throw error;

      setIsModalOpen(false);
      setSelectedStaff(null);
      fetchData(); 
      alert('Compliance updated successfully');
    } catch (error) {
      console.error("Error saving compliance:", error);
      alert(`Failed to save: ${error.message || 'Unknown error'}`);
    } finally {
      // FINALLY block guarantees the button will NEVER get stuck on "Saving..."
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'DBS Status', 'DBS Expiry', 'RTW Status', 'RTW Expiry'];
    const rows = filteredList.map(s => [
      `${s.first_name} ${s.last_name}`,
      s.email,
      s.role_category,
      s.dbs_status,
      s.dbs_expiry || 'N/A',
      s.rtw_status,
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Compliance Dashboard Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Summary Stats
    const statsText = [
      `Total Staff: ${stats.total}`,
      `Valid DBS: ${stats.percent}%`,
      `Expired DBS: ${stats.expired}`,
      `RTW Issues: ${stats.rtwIssues}`
    ];
    
    let yPos = 40;
    statsText.forEach(text => {
      doc.text(text, 14, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Table Data
    const tableColumn = ["Name", "Role", "DBS Status", "DBS Expiry", "RTW Status", "RTW Expiry"];
    const tableRows = [];

    filteredList.forEach(s => {
      const rowData = [
        `${s.first_name} ${s.last_name}`,
        s.role_category,
        s.dbs_status,
        s.dbs_expiry || '—',
        s.rtw_status,
        s.rtw_expiry || '—'
      ];
      tableRows.push(rowData);
    });

    // ✅ FIX: Pass 'doc' as the first argument for v5
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [26, 95, 186] }, // Blue header
      styles: { fontSize: 8 }
    });

    doc.save("compliance_report.pdf");
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
      
      {/* PAGE HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'DM sans', color: '#0c1f3f', fontWeight: 400 }}>
            Compliance Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#5e7187' }}>
            Monitor DBS checks and Right to Work status
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ textTransform: 'none', borderColor: '#1a5fba', color: '#1a5fba' }}
          >
            CSV
          </Button>
          <Button 
            variant="contained" 
            startIcon={<PdfIcon />}
            onClick={handleExportPDF}
            sx={{ 
              bgcolor: '#1a5fba', 
              textTransform: 'none',
              boxShadow: '0 2px 14px rgba(26,95,186,0.3)',
              '&:hover': { bgcolor: '#0f4d9a' }
            }}
          >
            PDF Report
          </Button>
        </Stack>
      </Box>

      {/* STATS GRID */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Expired DBS', val: stats.expired, color: '#fee2e2', text: '#991b1b', icon: <ErrorOutlineIcon /> },
          { label: 'Expiring Soon', val: stats.expiring, color: '#fef3c7', text: '#b45309', icon: <WarningIcon /> },
          { label: 'No DBS Record', val: stats.noRecord, color: '#f1f5f9', text: '#475569', icon: <BlockIcon /> },
          { label: 'RTW Issues', val: stats.rtwIssues, color: '#fee2e2', text: '#991b1b', icon: <PersonIcon /> },
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
          <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e1e8f4', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
              sx={{ minWidth: 200, flexGrow: 1, maxWidth: 300 }}
            />
            
            <Select
              size="small"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="All">All Roles</MenuItem>
              {roleCategories.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>

            <Select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Valid">Valid DBS</MenuItem>
              <MenuItem value="Expiring Soon">Expiring Soon</MenuItem>
              <MenuItem value="Expired">Expired DBS</MenuItem>
              <MenuItem value="No Record">No DBS Record</MenuItem>
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
                  <TableCell>RTW Status</TableCell>
                  <TableCell>RTW Expiry</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>Loading data...</TableCell></TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>No records found.</TableCell></TableRow>
                ) : (
                  filteredList.map((staff) => {
                    const dbsBadge = getBadgeColor(staff.dbs_status);
                    const rtwBadge = getBadgeColor(staff.rtw_status);
                    const dbsDoc = findRelevantDoc(staff, 'dbs');
                    const rtwDoc = findRelevantDoc(staff, 'rtw');

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
                              bgcolor: dbsBadge.bg, 
                              color: dbsBadge.color, 
                              border: `1px solid ${dbsBadge.border}`,
                              fontWeight: 600,
                              fontSize: 11
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography sx={{ fontSize: 13, color: '#334155' }}>
                              {formatDate(staff.dbs_expiry)}
                            </Typography>
                            {dbsDoc && (
                              <Tooltip title={`Open: ${dbsDoc.name}`}>
                                <IconButton size="small" component={Link} href={dbsDoc.url} target="_blank" sx={{ p: 0.5 }}>
                                  <FileIcon fontSize="small" color="primary" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                           <Chip 
                            label={staff.rtw_status} 
                            size="small" 
                            sx={{ 
                              bgcolor: rtwBadge.bg, 
                              color: rtwBadge.color, 
                              border: `1px solid ${rtwBadge.border}`,
                              fontWeight: 600,
                              fontSize: 11
                            }} 
                          />
                        </TableCell>
                         <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography sx={{ fontSize: 13, color: staff.rtw_status === 'Expired' ? '#dc2626' : '#334155' }}>
                              {formatDate(staff.rtw_expiry)}
                            </Typography>
                            {rtwDoc && (
                              <Tooltip title={`Open: ${rtwDoc.name}`}>
                                <IconButton size="small" component={Link} href={rtwDoc.url} target="_blank" sx={{ p: 0.5 }}>
                                  <FileIcon fontSize="small" color="primary" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
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

        {/* RIGHT: ISSUES OVERVIEW */}
        <Box>
          <Card sx={{ borderRadius: 3, border: '1px solid #e1e8f4', mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1a2535' }}>
                Issues Overview
              </Typography>
              
              <Stack spacing={2}>
                {/* 1. Expired DBS List */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                    Expired DBS ({complianceList.filter(s => s.dbs_status === 'Expired').length})
                  </Typography>
                  <Stack spacing={1}>
                    {complianceList.filter(s => s.dbs_status === 'Expired').slice(0, 3).map(s => (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }} onClick={() => handleEdit(s)}>
                        <span style={{ fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                        <Typography variant="caption" color="error">{formatDate(s.dbs_expiry)}</Typography>
                      </Box>
                    ))}
                    {complianceList.filter(s => s.dbs_status === 'Expired').length === 0 && (
                      <Typography variant="caption" color="#166534">None</Typography>
                    )}
                  </Stack>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* 2. Expiring Soon List */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#d97706', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                    Expiring Soon ({complianceList.filter(s => s.dbs_status === 'Expiring Soon').length})
                  </Typography>
                  <Stack spacing={1}>
                    {complianceList.filter(s => s.dbs_status === 'Expiring Soon').slice(0, 3).map(s => (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }} onClick={() => handleEdit(s)}>
                        <span style={{ fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                        <Typography variant="caption" color="warning.main">{formatDate(s.dbs_expiry)}</Typography>
                      </Box>
                    ))}
                     {complianceList.filter(s => s.dbs_status === 'Expiring Soon').length === 0 && (
                      <Typography variant="caption" color="#166534">None</Typography>
                    )}
                  </Stack>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* 3. No DBS Record */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                    No DBS Record ({complianceList.filter(s => s.dbs_status === 'No Record').length})
                  </Typography>
                  <Stack spacing={1}>
                    {complianceList.filter(s => s.dbs_status === 'No Record').slice(0, 3).map(s => (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }} onClick={() => handleEdit(s)}>
                        <span style={{ fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                        <Typography variant="caption" color="text.secondary">Action Required</Typography>
                      </Box>
                    ))}
                    {complianceList.filter(s => s.dbs_status === 'No Record').length === 0 && (
                      <Typography variant="caption" color="#166534">None</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          
          {/* Small Stat Card for Compliance Rate */}
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#dcfce7', color: '#166534', textAlign: 'center', border: 0 }}>
            <VerifiedUserIcon sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>{stats.percent}%</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Compliance Rate</Typography>
          </Paper>
        </Box>

      </Box>

      {/* EDIT/ADD MODAL */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="modal-title"
        disableEnforceFocus
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          maxWidth: '95vw',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* HEADER */}
          <Box sx={{ 
            bgcolor: '#1a5fba', 
            px: 3, 
            py: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexShrink: 0
          }}>
            <Typography id="modal-title" variant="h6" sx={{ color: '#fff', fontFamily: 'DM sans' }}>
              Update Compliance
            </Typography>
            <IconButton onClick={() => setIsModalOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* SCROLLABLE CONTENT */}
          <Box sx={{ 
            px: 3, 
            pt: 3, 
            pb: 2,
            overflowY: 'auto',
            flex: 1
          }}>
            {selectedStaff && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary">Editing:</Typography>
                <Typography variant="subtitle2" fontWeight="bold">{selectedStaff.first_name} {selectedStaff.last_name}</Typography>
              </Box>
            )}
            
            <Stack spacing={2.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>DBS Details</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 100 }}>DBS Checked:</Typography>
                <Select
                  size="small"
                  value={String(formData.dbs_checked)}
                  onChange={(e) => setFormData({...formData, dbs_checked: e.target.value === 'true'})}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </Box>

              {/* DBS EXPIRY - LABEL OUTSIDE BOX TO PREVENT CALENDAR OVERLAY */}
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, color: '#374151' }}>
                  DBS Expiry Date
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.dbs_expiry}
                  onChange={(e) => setFormData({...formData, dbs_expiry: e.target.value})}
                  onClick={(e) => e.target.showPicker?.()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& input': { cursor: 'pointer' }
                    }
                  }}
                />
              </Box>

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Right to Work</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 100 }}>RTW Checked:</Typography>
                <Select
                  size="small"
                  value={String(formData.rtw_checked)}
                  onChange={(e) => setFormData({...formData, rtw_checked: e.target.value === 'true'})}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </Box>

              {/* RTW EXPIRY - LABEL OUTSIDE BOX TO PREVENT CALENDAR OVERLAY */}
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, color: '#374151' }}>
                  RTW Expiry Date
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.rtw_expiry}
                  onChange={(e) => setFormData({...formData, rtw_expiry: e.target.value})}
                  onClick={(e) => e.target.showPicker?.()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& input': { cursor: 'pointer' }
                    }
                  }}
                />
              </Box>
            </Stack>
          </Box>

          {/* ACTIONS */}
          <Box sx={{ 
            px: 3, 
            py: 2, 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 1,
            borderTop: '1px solid #e1e8f4',
            bgcolor: '#fff',
            flexShrink: 0
          }}>
            <Button 
              onClick={() => setIsModalOpen(false)}
              sx={{ color: '#64748b' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              disabled={saving}
              sx={{ 
                bgcolor: '#1a5fba', 
                '&:hover': { bgcolor: '#0f4d9a' },
                '&:disabled': { bgcolor: '#94a3b8' },
                minWidth: 130
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Modal>

    </Box>
  );
}