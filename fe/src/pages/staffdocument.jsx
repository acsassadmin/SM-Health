import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Card,
  CardContent,
  Divider,
  Grid,
  useTheme,
  useMediaQuery,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { 
  CloudUpload, Visibility, Delete, Add as AddIcon, 
  Description as DescriptionIcon, Folder as FolderIcon,
  AttachFile
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const StaffDocuments = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // -- State --
  const [documents, setDocuments] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  
  // Form State
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  // CHANGE: 'files' is now an Array instead of a single object
  const [files, setFiles] = useState([]); 
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // "Add Field" State
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // -- Effects --
  useEffect(() => {
    fetchDocTypes();
    fetchStaff();
    fetchDocuments();
  }, []);

  // -- Data Fetching --
  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_documents')
      .select(`
        *,
        staff:staff_id (first_name, last_name),
        document_type:document_type_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching docs:', error);
    else setDocuments(data || []);
    setLoading(false);
  };

  const fetchDocTypes = async () => {
    const { data } = await supabase.from('document_types').select('*');
    if (data) setDocTypes(data);
  };

  const fetchStaff = async () => {
    console.log("Fetching staff..."); // Debug log
    const { data, error } = await supabase
      .from('staff') 
      .select('id, first_name, last_name')
      .eq('active', true);

    if (error) {
      console.error("❌ Error fetching staff list (Check RLS Policy):", error);
      setError("Failed to load staff list. Check console for details.");
    } else {
      console.log("✅ Staff fetched:", data); // Debug log
      setStaffList(data || []);
    }
  };

  // -- Actions --
  const handleAddNewType = async () => {
    if (!newTypeName) return;
    const { data, error } = await supabase
      .from('document_types')
      .insert([{ name: newTypeName }])
      .select();
    
    if (error) {
      setError(error.message);
    } else {
      setDocTypes([...docTypes, data[0]]);
      setSelectedTypeId(data[0].id);
      setNewTypeOpen(false);
      setNewTypeName('');
    }
  };

  const handleUpload = async () => {
    if (!selectedStaffId || !selectedTypeId) {
      setError("Please select a Staff Member and Document Type.");
      return;
    }
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Loop through each file and upload
      for (const singleFile of files) {
        const fileName = `${Date.now()}_${singleFile.name}`;
        
        // 1. Upload to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('staff-documents')
          .upload(`documents/${fileName}`, singleFile);

        if (uploadError) {
          console.error(`Failed to upload ${singleFile.name}:`, uploadError);
          continue; // Skip this file but try others
        }

        // 2. Get Public URL
        const { data: publicUrlData } = supabase.storage
          .from('staff-documents')
          .getPublicUrl(`documents/${fileName}`);

        // 3. Insert into DB
        const { error: dbError } = await supabase.from('staff_documents').insert([{
          staff_id: selectedStaffId,
          document_type_id: selectedTypeId,
          file_name: singleFile.name,
          file_url: publicUrlData.publicUrl,
          expiry_date: expiryDate || null
        }]);

        if (dbError) {
          console.error(`Failed to save record for ${singleFile.name}:`, dbError);
        }
      }

      // Reset and Refresh
      setUploadOpen(false);
      setSelectedStaffId('');
      setSelectedTypeId('');
      setFiles([]); // Reset files array
      setExpiryDate('');
      fetchDocuments();

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const urlParts = doc.file_url.split('/staff-documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('staff-documents').remove([filePath]);
      }

      const { error } = await supabase.from('staff_documents').delete().eq('id', doc.id);
      if (error) throw error;

      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert('Error deleting document');
    }
  };

  // -- Mobile Card Component --
  const DocumentMobileCard = ({ doc }) => (
    <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Avatar sx={{ bgcolor: '#1a5fba', width: 40, height: 40 }}>
            <DescriptionIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '1rem', color: '#0c1f3f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {doc.file_name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {doc.staff ? `${doc.staff.first_name} ${doc.staff.last_name}` : 'Unknown Staff'}
            </Typography>
          </Box>
          <Chip label={doc.document_type?.name} size="small" color="primary" variant="outlined" />
        </Box>

        <Divider sx={{ my: 1 }} />

        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="textSecondary" display="block">Uploaded</Typography>
            <Typography variant="body2">{new Date(doc.created_at).toLocaleDateString()}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="textSecondary" display="block">Expires</Typography>
            <Typography variant="body2">{doc.expiry_date || 'N/A'}</Typography>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button 
            size="small" 
            variant="outlined" 
            startIcon={<Visibility />} 
            href={doc.file_url} 
            target="_blank"
          >
            View
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            color="error" 
            startIcon={<Delete />} 
            onClick={() => handleDelete(doc)}
          >
            Delete
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      
      {/* Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#0c1f3f' }}>
            Staff Documents
          </Typography>
          <Typography variant="body2" color="textSecondary">Manage DBS, Passports, and Certificates</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={() => setNewTypeOpen(true)}
            fullWidth={isMobile}
            sx={{ borderColor: '#1a5fba', color: '#1a5fba', height: 42 }}
          >
            Add Type
          </Button>
          <Button 
            variant="contained" 
            startIcon={<CloudUpload />}
            onClick={() => setUploadOpen(true)}
            fullWidth={isMobile}
            sx={{ bgcolor: '#1a5fba', '&:hover': { backgroundColor: '#0f4d9a' }, height: 42 }}
          >
            Upload Documents
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Responsive Container */}
      <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: isMobile ? 0 : 1, bgcolor: isMobile ? 'transparent' : 'white' }}>
        {!isMobile ? (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Document Type</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow> :
                  documents.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{py: 4}}>No documents found</TableCell></TableRow> :
                    documents.map((doc) => (
                      <TableRow key={doc.id} hover>
                        <TableCell>
                          {doc.staff ? `${doc.staff.first_name} ${doc.staff.last_name}` : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Chip label={doc.document_type?.name} color="primary" variant="outlined" size="small" />
                        </TableCell>
                        <TableCell>{doc.file_name}</TableCell>
                        <TableCell>{doc.expiry_date || '-'}</TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton color="primary" size="small" href={doc.file_url} target="_blank">
                            <Visibility />
                          </IconButton>
                          <IconButton color="error" size="small" onClick={() => handleDelete(doc)}>
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 0 }}>
            {loading ? <Typography align="center" sx={{ py: 4 }}>Loading...</Typography> :
              documents.length === 0 ? <Typography align="center" sx={{ py: 4 }}>No documents found</Typography> :
                documents.map((doc) => <DocumentMobileCard key={doc.id} doc={doc} />)}
          </Box>
        )}
      </Paper>

      {/* --- STYLED UPLOAD DIALOG (Multi-File Support) --- */}
      <Dialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 24px 54px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }}
      >
        {/* Gradient Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #1a5fba 0%, #0c1f3f 100%)',
          color: 'white',
          py: 3,
          px: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            p: 1.5,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CloudUpload sx={{ fontSize: 32 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Upload Documents
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, fontWeight: 300 }}>
              Attach multiple compliance files.
            </Typography>
          </Box>
        </Box>

        <DialogContent dividers sx={{ p: 3, bgcolor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Staff Member *</InputLabel>
              <Select
                value={selectedStaffId}
                label="Staff Member *"
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                {staffList.length === 0 ? (
                  <MenuItem disabled>No Staff Found (Check RLS)</MenuItem>
                ) : (
                  staffList.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel>Document Type *</InputLabel>
              <Select
                value={selectedTypeId}
                label="Document Type *"
                onChange={(e) => setSelectedTypeId(e.target.value)}
              >
                {docTypes.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="date"
              label="Expiry Date"
              InputLabelProps={{ shrink: true }}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              fullWidth
            />

            {/* MULTIPLE FILE INPUT */}
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ 
                height: 56, 
                justifyContent: 'flex-start', 
                textTransform: 'none',
                borderStyle: 'dashed'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachFile color="primary" />
                {files.length > 0 
                  ? `${files.length} file${files.length > 1 ? 's' : ''} selected` 
                  : "Choose Files..."}
              </Box>
              {/* 'multiple' attribute allows selecting more than one */}
              <input type="file" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files))} />
            </Button>
            
            {/* List selected files */}
            {files.length > 0 && (
                <List dense sx={{ maxHeight: 100, overflow: 'auto' }}>
                    {files.map((f, idx) => (
                        <ListItem key={idx}>
                            <ListItemIcon sx={{minWidth: 30}}><DescriptionIcon fontSize="small" color="primary"/></ListItemIcon>
                            <ListItemText primary={f.name} primaryTypographyProps={{fontSize: '0.85rem'}} />
                        </ListItem>
                    ))}
                </List>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: '#fff', borderTop: '1px solid #f0f0f0', gap: 1 }}>
          <Button onClick={() => setUploadOpen(false)} sx={{ color: '#6c757d' }}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={uploading}
            sx={{ bgcolor: '#1a5fba', px: 3 }}
          >
            {uploading ? <CircularProgress size={20} color="inherit" /> : `Upload ${files.length} Files`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- STYLED ADD TYPE DIALOG --- */}
      <Dialog
        open={newTypeOpen}
        onClose={() => setNewTypeOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 24px 54px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg, #1a5fba 0%, #0c1f3f 100%)',
          color: 'white',
          py: 2.5,
          px: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            p: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FolderIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>
              New Document Type
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#f8f9fa' }}>
          <TextField
            autoFocus
            margin="dense"
            label="Type Name"
            fullWidth
            variant="outlined"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="e.g. First Aid Certificate"
            sx={{ bgcolor: 'white' }}
          />
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: '#fff', borderTop: '1px solid #f0f0f0', gap: 1 }}>
          <Button onClick={() => setNewTypeOpen(false)} sx={{ color: '#6c757d' }}>Cancel</Button>
          <Button onClick={handleAddNewType} variant="contained" sx={{ bgcolor: '#1a5fba' }}>Add Type</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default StaffDocuments;