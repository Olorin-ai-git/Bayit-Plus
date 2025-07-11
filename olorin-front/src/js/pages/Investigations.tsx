import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { preserveUrlParams, isDemoModeActive } from '../utils/urlParams';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  BugReport as BugReportIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';

// Use centralized demo mode detection
const DEMO_MODE = isDemoModeActive(); // Dynamic demo mode based on URL parameter

// Mock data for demo mode
const MOCK_INVESTIGATIONS = [
  {
    id: 'INV-001',
    policy_comments: 'Initial policy review.',
    investigator_comments: 'Looks good so far.',
    overall_risk_score: 0.2,
    entityId: 'test-user-1',
    entityType: 'user_id',
  },
  {
    id: 'INV-002',
    policy_comments: 'Other policy.',
    investigator_comments: 'Other notes.',
    overall_risk_score: 0.1,
    entityId: 'test-device-1',
    entityType: 'device_id',
  },
];

/**
 * Fetches the list of investigations from the backend or mock data.
 * @param {boolean} isDemoMode - Whether demo mode is active
 * @returns {Promise<any[]>} The list of investigations.
 */
const getInvestigations = async (isDemoMode: boolean = false) => {
  if (isDemoMode) {
    return [...MOCK_INVESTIGATIONS];
  }
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return [];
};

/**
 * Creates a new investigation (mock or real).
 * @param {boolean} isDemoMode - Whether demo mode is active
 * @param {any[]} [mockData] - Mock data array.
 * @param {Function} [setMockData] - Setter for mock data.
 * @param {string} [entityId] - Entity ID for the investigation.
 * @param {string} [entityType] - Entity type ('user_id' or 'device_id').
 * @returns {Promise<any>} The created investigation.
 */
const createInvestigation = async (
  isDemoMode: boolean = false,
  mockData?: any[],
  setMockData?: any,
  entityId?: string,
  entityType?: string,
) => {
  if (isDemoMode) {
    const newInv = {
      id: `INV-${Math.floor(Math.random() * 1000)}`,
      policy_comments: 'Demo created policy.',
      investigator_comments: 'Demo created investigator.',
      overall_risk_score: Math.random().toFixed(2),
      entityId: entityId || 'test-entity',
      entityType: entityType || 'user_id',
    };
    setMockData((prev: any[]) => [newInv, ...prev]);
    return newInv;
  }
  const id = `${Math.floor(Math.random() * 10000000000000000)}`;
  // Use a default entityId if not provided (for demo/test)
  const eid = entityId || 'test-entity';
  const etype = entityType || 'user_id';
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return { id, entityId: eid, entityType: etype };
};

/**
 * Edits investigations by ID (mock or real).
 * @param {boolean} isDemoMode - Whether demo mode is active
 * @param {string[]} ids - Investigation IDs to edit.
 * @param {any[]} [mockData] - Mock data array.
 * @param {Function} [setMockData] - Setter for mock data.
 * @returns {Promise<boolean>} True if successful.
 */
const editInvestigations = async (
  isDemoMode: boolean = false,
  ids: string[],
  mockData?: any[],
  setMockData?: any,
) => {
  if (isDemoMode) {
    setMockData((prev: any[]) =>
      prev.map((inv) =>
        ids.includes(inv.id)
          ? {
              ...inv,
              policy_comments: 'Demo edited policy.',
              investigator_comments: 'Demo edited investigator.',
              overall_risk_score: Math.random().toFixed(2),
            }
          : inv,
      ),
    );
    return true;
  }
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return true;
};

/**
 * Deletes investigations by ID (mock or real).
 * @param {boolean} isDemoMode - Whether demo mode is active
 * @param {string[]} ids - Investigation IDs to delete.
 * @param {any[]} [mockData] - Mock data array.
 * @param {Function} [setMockData] - Setter for mock data.
 * @returns {Promise<any>} The response from the backend.
 */
const deleteInvestigations = async (
  isDemoMode: boolean = false,
  ids: string[],
  mockData?: any[],
  setMockData?: any,
) => {
  if (isDemoMode) {
    setMockData((prev: any[]) => prev.filter((inv) => !ids.includes(inv.id)));
    return true;
  }
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return true;
};

interface InvestigationsProps {
  onCreateInvestigation?: (id: string) => void;
}

/**
 * Investigations page component for listing and managing investigations.
 * @param {InvestigationsProps} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
const Investigations: React.FC<InvestigationsProps> = ({
  onCreateInvestigation,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Dynamic demo mode detection from URL
  const [isDemoMode, setIsDemoMode] = useState(isDemoModeActive());

  useEffect(() => {
    const handleLocationChange = () => {
      setIsDemoMode(isDemoModeActive());
    };

    // Listen for URL changes
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const [investigations, setInvestigations] = useState<any[]>(
    isDemoMode ? MOCK_INVESTIGATIONS : [],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches investigations and updates state.
   */
  const fetchInvestigations = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        setInvestigations([...MOCK_INVESTIGATIONS]);
      } else {
        const data = await getInvestigations(isDemoMode);
        setInvestigations(data);
      }
      setSelected([]);
    } catch (err: any) {
      setError('fetch error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvestigations();
  }, [isDemoMode]);

  /**
   * Handles select all checkbox.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(investigations.map((inv) => inv.id));
    } else {
      setSelected([]);
    }
  };

  /**
   * Handles selection of a single investigation.
   * @param {string} id - The investigation ID.
   */
  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  /**
   * Handles creation of a new investigation.
   */
  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      let newId = `INV-${Math.floor(Math.random() * 10000000000000000)}`;
      if (isDemoMode) {
        const newInv = await createInvestigation(
          isDemoMode,
          investigations,
          setInvestigations,
        );
        newId = newInv.id;
      } else {
        const newInv = await createInvestigation(isDemoMode);
        newId = newInv.id;
      }
      if (onCreateInvestigation) {
        onCreateInvestigation(newId);
      }
    } catch (err: any) {
      setError('create error');
    }
    setLoading(false);
  };

  /**
   * Handles editing of selected investigations.
   */
  const handleEdit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        await editInvestigations(
          isDemoMode,
          selected,
          investigations,
          setInvestigations,
        );
      } else {
        await editInvestigations(isDemoMode, selected);
      }
      setSelected([]);
    } catch (err: any) {
      setError('edit error');
    }
    setLoading(false);
  };

  /**
   * Handles deletion of selected investigations.
   */
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        await deleteInvestigations(
          isDemoMode,
          selected,
          investigations,
          setInvestigations,
        );
      } else {
        await deleteInvestigations(isDemoMode, selected);
        setInvestigations((prev) =>
          prev.filter((inv) => !selected.includes(inv.id)),
        );
      }
      setSelected([]);
    } catch (err: any) {
      setError('delete error');
    }
    setLoading(false);
  };

  const handleRefresh = fetchInvestigations;

  /**
   * Navigates to the investigation page to view a specific investigation.
   * @param {string} id - The investigation ID.
   */
  const handleViewInvestigation = (id: string) => {
    const pathWithParams = preserveUrlParams(`/investigation/${id}`);
    navigate(pathWithParams);
  };

  /**
   * Navigates to create a new investigation.
   */
  const handleNewInvestigation = () => {
    const pathWithParams = preserveUrlParams('/investigation');
    navigate(pathWithParams);
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 0.7) return 'error';
    if (score >= 0.4) return 'warning';
    return 'success';
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'user_id':
        return <PersonIcon fontSize="small" />;
      case 'device_id':
        return <ComputerIcon fontSize="small" />;
      default:
        return <BugReportIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}
            >
              Investigations
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and monitor your fraud investigations
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewInvestigation}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(147, 51, 234, 0.4)',
              },
            }}
          >
            New Investigation
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 100%)',
                border: '1px solid',
                borderColor: 'primary.200',
              }}
            >
              <CardContent>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}
                >
                  {investigations.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Investigations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                border: '1px solid',
                borderColor: 'error.200',
              }}
            >
              <CardContent>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}
                >
                  {
                    investigations.filter(
                      (inv) => inv.overall_risk_score >= 0.7,
                    ).length
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Risk Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fed7aa 100%)',
                border: '1px solid',
                borderColor: 'warning.200',
              }}
            >
              <CardContent>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}
                >
                  {
                    investigations.filter(
                      (inv) =>
                        inv.overall_risk_score >= 0.4 &&
                        inv.overall_risk_score < 0.7,
                    ).length
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Medium Risk Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
                border: '1px solid',
                borderColor: 'success.200',
              }}
            >
              <CardContent>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}
                >
                  {
                    investigations.filter((inv) => inv.overall_risk_score < 0.4)
                      .length
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Low Risk Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Create
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            disabled={loading || selected.length === 0}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Edit ({selected.length})
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={loading || selected.length === 0}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Delete ({selected.length})
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading Progress */}
      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Investigations Table */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      selected.length === investigations.length &&
                      investigations.length > 0
                    }
                    indeterminate={
                      selected.length > 0 &&
                      selected.length < investigations.length
                    }
                    onChange={handleSelectAll}
                    sx={{ color: 'primary.main' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  ID
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Entity
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Type
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Policy Comments
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Investigator Comments
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Risk Score
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {investigations.map((inv) => (
                <TableRow
                  key={inv.id}
                  hover
                  sx={{
                    '&:hover': {
                      backgroundColor: 'primary.50',
                      '& .MuiTableCell-root': {
                        borderBottom: '1px solid ' + theme.palette.primary.main,
                      },
                    },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(inv.id)}
                      onChange={() => handleSelect(inv.id)}
                      sx={{ color: 'primary.main' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: 'text.primary' }}
                    >
                      {inv.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {inv.entityId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getEntityTypeIcon(inv.entityType)}
                      <Typography variant="body2" color="text.secondary">
                        {inv.entityType}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ maxWidth: 200 }}
                    >
                      {inv.policy_comments}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ maxWidth: 200 }}
                    >
                      {inv.investigator_comments}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${(inv.overall_risk_score * 100).toFixed(0)}%`}
                      color={getRiskScoreColor(inv.overall_risk_score)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleViewInvestigation(inv.id)}
                      size="small"
                      sx={{
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.50',
                          color: 'primary.dark',
                        },
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Empty State */}
      {investigations.length === 0 && !loading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: 'grey.50',
            borderRadius: 3,
            border: '2px dashed',
            borderColor: 'grey.300',
          }}
        >
          <BugReportIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No investigations found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first investigation to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewInvestigation}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Create Investigation
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Investigations;
