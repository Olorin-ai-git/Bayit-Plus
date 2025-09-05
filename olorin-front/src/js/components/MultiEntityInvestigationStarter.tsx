import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  EntityDefinition,
  EntityType,
  MultiEntityInvestigationRequest,
} from '../types/multiEntityInvestigation';

interface MultiEntityInvestigationStarterProps {
  onInvestigationStart: (request: MultiEntityInvestigationRequest) => void;
  availableEntityTypes: EntityType[];
  existingInvestigations?: string[];
  isLoading?: boolean;
}

const INVESTIGATION_SCOPES = [
  { id: 'device', label: 'Device Analysis', description: 'Analyze device fingerprints and behavior' },
  { id: 'location', label: 'Location Analysis', description: 'Validate geographic data and patterns' },
  { id: 'network', label: 'Network Analysis', description: 'Examine network connections and traffic' },
  { id: 'logs', label: 'Log Analysis', description: 'Review activity logs and events' },
  { id: 'transaction', label: 'Transaction Analysis', description: 'Analyze transaction patterns and flows' },
  { id: 'behavioral', label: 'Behavioral Analysis', description: 'Study user behavior patterns' }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#4caf50' },
  { value: 'normal', label: 'Normal', color: '#ff9800' },
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'critical', label: 'Critical', color: '#9c27b0' }
];

const MultiEntityInvestigationStarter: React.FC<MultiEntityInvestigationStarterProps> = ({
  onInvestigationStart,
  availableEntityTypes = Object.values(EntityType),
  existingInvestigations = [],
  isLoading = false
}) => {
  const theme = useTheme();
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [newEntityId, setNewEntityId] = useState('');
  const [newEntityType, setNewEntityType] = useState<EntityType>(EntityType.USER);
  const [newEntityDisplayName, setNewEntityDisplayName] = useState('');
  const [booleanLogic, setBooleanLogic] = useState('AND');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['device', 'location', 'network', 'logs']);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addEntity = useCallback(() => {
    if (!newEntityId.trim()) {
      setErrors(['Entity ID is required']);
      return;
    }

    if (entities.some(e => e.entity_id === newEntityId.trim())) {
      setErrors(['Entity ID must be unique']);
      return;
    }

    const entity: EntityDefinition = {
      entity_id: newEntityId.trim(),
      entity_type: newEntityType,
      display_name: newEntityDisplayName.trim() || undefined
    };

    setEntities(prev => [...prev, entity]);
    setNewEntityId('');
    setNewEntityDisplayName('');
    setErrors([]);
  }, [newEntityId, newEntityType, newEntityDisplayName, entities]);

  const removeEntity = useCallback((entityId: string) => {
    setEntities(prev => prev.filter(e => e.entity_id !== entityId));
  }, []);

  const handleScopeToggle = useCallback((scopeId: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeId)
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  }, []);

  const validateInvestigation = useCallback((): string[] => {
    const validationErrors: string[] = [];

    if (entities.length < 2) {
      validationErrors.push('At least 2 entities are required for multi-entity investigation');
    }

    if (entities.length > 10) {
      validationErrors.push('Maximum 10 entities allowed per investigation');
    }

    if (selectedScopes.length === 0) {
      validationErrors.push('At least one investigation scope must be selected');
    }

    if (!booleanLogic.trim()) {
      validationErrors.push('Boolean logic is required');
    }

    return validationErrors;
  }, [entities, selectedScopes, booleanLogic]);

  const startInvestigation = useCallback(() => {
    const validationErrors = validateInvestigation();
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const request: MultiEntityInvestigationRequest = {
      investigation_id: `multi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entities,
      relationships: [], // Will be built by EntityRelationshipBuilder
      boolean_logic: booleanLogic,
      investigation_scope: selectedScopes,
      priority,
      metadata: {
        created_at: new Date().toISOString(),
        created_by: 'user', // TODO: Get from auth context
        advanced_mode: advancedMode
      }
    };

    onInvestigationStart(request);
    setErrors([]);
  }, [entities, booleanLogic, selectedScopes, priority, advancedMode, validateInvestigation, onInvestigationStart]);

  const getEntityTypeColor = (type: EntityType): string => {
    const colors: Record<EntityType, string> = {
      [EntityType.USER]: '#2196f3',
      [EntityType.DEVICE]: '#4caf50',
      [EntityType.LOCATION]: '#ff9800',
      [EntityType.NETWORK]: '#9c27b0',
      [EntityType.ACCOUNT]: '#f44336',
      [EntityType.TRANSACTION]: '#607d8b',
      [EntityType.TIMESTAMP]: '#795548',
      [EntityType.EVENT]: '#9e9e9e',
      [EntityType.TRANSACTION_ID]: '#3f51b5',
      [EntityType.REQUEST]: '#00bcd4',
      [EntityType.USER_IDENTITY]: '#009688',
      [EntityType.AUTHORIZATION]: '#4caf50',
      [EntityType.CURRENCY]: '#8bc34a',
      [EntityType.MERCHANT_CATEGORY]: '#cddc39',
      [EntityType.DATETIME_PATTERN]: '#ffeb3b',
      [EntityType.SEQUENCE]: '#ffc107',
      [EntityType.BATCH]: '#ff9800',
      [EntityType.BUSINESS_RULE]: '#ff5722',
      [EntityType.COMPLIANCE_STATUS]: '#f44336',
      [EntityType.REVIEW_QUEUE]: '#e91e63'
    };
    return colors[type] || '#666';
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Multi-Entity Investigation Starter
        <Tooltip title="Launch investigations across multiple related entities with Boolean logic">
          <HelpIcon fontSize="small" color="action" />
        </Tooltip>
      </Typography>

      {/* Error Display */}
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      {/* Entity Builder */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add Entities
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Entity ID"
                value={newEntityId}
                onChange={(e) => setNewEntityId(e.target.value)}
                placeholder="user123, device456, etc."
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value as EntityType)}
                  label="Entity Type"
                >
                  {availableEntityTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Display Name (Optional)"
                value={newEntityDisplayName}
                onChange={(e) => setNewEntityDisplayName(e.target.value)}
                size="small"
                placeholder="Friendly name"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={addEntity}
                disabled={!newEntityId.trim()}
              >
                Add
              </Button>
            </Grid>
          </Grid>

          {/* Current Entities */}
          {entities.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Entities ({entities.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {entities.map(entity => (
                  <Chip
                    key={entity.entity_id}
                    label={`${entity.display_name || entity.entity_id} (${entity.entity_type})`}
                    onDelete={() => removeEntity(entity.entity_id)}
                    deleteIcon={<DeleteIcon />}
                    sx={{
                      backgroundColor: getEntityTypeColor(entity.entity_type),
                      color: 'white',
                      '& .MuiChip-deleteIcon': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          color: 'white'
                        }
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Boolean Logic */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Boolean Logic
          </Typography>
          <TextField
            fullWidth
            label="Boolean Logic Expression"
            value={booleanLogic}
            onChange={(e) => setBooleanLogic(e.target.value)}
            placeholder="AND, OR, (entity1 AND entity2) OR entity3, etc."
            helperText="Define how entities should be combined in the investigation"
            size="small"
          />
        </CardContent>
      </Card>

      {/* Investigation Scope */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Investigation Scope
          </Typography>
          <Grid container spacing={2}>
            {INVESTIGATION_SCOPES.map(scope => (
              <Grid item xs={12} sm={6} md={4} key={scope.id}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedScopes.includes(scope.id)}
                      onChange={() => handleScopeToggle(scope.id)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {scope.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {scope.description}
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Investigation Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  label="Priority"
                >
                  {PRIORITY_LEVELS.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: level.color
                          }}
                        />
                        {level.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={advancedMode}
                    onChange={(e) => setAdvancedMode(e.target.checked)}
                    color="primary"
                  />
                }
                label="Advanced Mode (Include relationship building)"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary */}
      {entities.length >= 2 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Ready to investigate {entities.length} entities using {booleanLogic} logic 
            across {selectedScopes.length} analysis scope{selectedScopes.length !== 1 ? 's' : ''}.
          </Typography>
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
        <Button
          variant="outlined"
          onClick={() => {
            setEntities([]);
            setBooleanLogic('AND');
            setErrors([]);
          }}
        >
          Clear All
        </Button>
        <Button
          variant="contained"
          startIcon={<StartIcon />}
          onClick={startInvestigation}
          disabled={isLoading || entities.length < 2}
          sx={{
            bgcolor: theme.palette.primary.main,
            '&:hover': {
              bgcolor: theme.palette.primary.dark
            }
          }}
        >
          {isLoading ? 'Starting...' : 'Start Investigation'}
        </Button>
      </Box>
    </Paper>
  );
};

export default MultiEntityInvestigationStarter;