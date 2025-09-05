import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Hub as RelationshipIcon,
  AutoGraph as GraphIcon
} from '@mui/icons-material';
import {
  EntityDefinition,
  EntityRelationship,
  RelationshipType
} from '../types/multiEntityInvestigation';

interface EntityRelationshipBuilderProps {
  entities: EntityDefinition[];
  relationships: EntityRelationship[];
  onRelationshipsChange: (relationships: EntityRelationship[]) => void;
  readonly?: boolean;
}

interface RelationshipFormData {
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  strength: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

const RELATIONSHIP_TYPES = [
  { value: RelationshipType.INITIATED, label: 'Initiated', description: 'Entity A initiated action on Entity B' },
  { value: RelationshipType.OCCURRED_AT, label: 'Occurred At', description: 'Event occurred at location/time' },
  { value: RelationshipType.ASSOCIATED_WITH, label: 'Associated With', description: 'General association between entities' },
  { value: RelationshipType.OWNS, label: 'Owns', description: 'Entity A owns Entity B' },
  { value: RelationshipType.USES, label: 'Uses', description: 'Entity A uses Entity B' },
  { value: RelationshipType.LOCATED_IN, label: 'Located In', description: 'Entity A is located in Entity B' },
  { value: RelationshipType.PROCESSED_BY, label: 'Processed By', description: 'Entity A was processed by Entity B' },
  { value: RelationshipType.BELONGS_TO, label: 'Belongs To', description: 'Entity A belongs to Entity B' }
];

const EntityRelationshipBuilder: React.FC<EntityRelationshipBuilderProps> = ({
  entities,
  relationships,
  onRelationshipsChange,
  readonly = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<EntityRelationship | null>(null);
  const [formData, setFormData] = useState<RelationshipFormData>({
    source_entity_id: '',
    target_entity_id: '',
    relationship_type: RelationshipType.ASSOCIATED_WITH,
    strength: 0.5,
    confidence: 0.8
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [showVisualization, setShowVisualization] = useState(false);

  // Initialize form when adding/editing
  useEffect(() => {
    if (editingRelationship) {
      setFormData({
        source_entity_id: editingRelationship.source_entity_id,
        target_entity_id: editingRelationship.target_entity_id,
        relationship_type: editingRelationship.relationship_type,
        strength: editingRelationship.strength,
        confidence: editingRelationship.confidence,
        metadata: editingRelationship.metadata
      });
    } else {
      setFormData({
        source_entity_id: entities[0]?.entity_id || '',
        target_entity_id: entities[1]?.entity_id || '',
        relationship_type: RelationshipType.ASSOCIATED_WITH,
        strength: 0.5,
        confidence: 0.8
      });
    }
  }, [editingRelationship, entities]);

  const openAddDialog = useCallback(() => {
    setEditingRelationship(null);
    setShowAddDialog(true);
    setErrors([]);
  }, []);

  const openEditDialog = useCallback((relationship: EntityRelationship) => {
    setEditingRelationship(relationship);
    setShowAddDialog(true);
    setErrors([]);
  }, []);

  const closeDialog = useCallback(() => {
    setShowAddDialog(false);
    setEditingRelationship(null);
    setErrors([]);
  }, []);

  const validateRelationship = useCallback((data: RelationshipFormData): string[] => {
    const validationErrors: string[] = [];

    if (!data.source_entity_id) {
      validationErrors.push('Source entity is required');
    }

    if (!data.target_entity_id) {
      validationErrors.push('Target entity is required');
    }

    if (data.source_entity_id === data.target_entity_id) {
      validationErrors.push('Source and target entities must be different');
    }

    if (data.strength < 0 || data.strength > 1) {
      validationErrors.push('Relationship strength must be between 0 and 1');
    }

    // Check for duplicate relationships (same source, target, type)
    const isDuplicate = relationships.some(rel => 
      rel !== editingRelationship &&
      rel.source_entity_id === data.source_entity_id &&
      rel.target_entity_id === data.target_entity_id &&
      rel.relationship_type === data.relationship_type
    );

    if (isDuplicate) {
      validationErrors.push('A relationship of this type already exists between these entities');
    }

    return validationErrors;
  }, [relationships, editingRelationship]);

  const saveRelationship = useCallback(() => {
    const validationErrors = validateRelationship(formData);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newRelationship: EntityRelationship = {
      source_entity_id: formData.source_entity_id,
      target_entity_id: formData.target_entity_id,
      relationship_type: formData.relationship_type,
      strength: formData.strength,
      confidence: formData.confidence,
      metadata: formData.metadata || {}
    };

    let updatedRelationships: EntityRelationship[];

    if (editingRelationship) {
      // Update existing relationship
      updatedRelationships = relationships.map(rel =>
        rel === editingRelationship ? newRelationship : rel
      );
    } else {
      // Add new relationship
      updatedRelationships = [...relationships, newRelationship];
    }

    onRelationshipsChange(updatedRelationships);
    closeDialog();
  }, [formData, relationships, editingRelationship, validateRelationship, onRelationshipsChange, closeDialog]);

  const deleteRelationship = useCallback((relationship: EntityRelationship) => {
    const updatedRelationships = relationships.filter(rel => rel !== relationship);
    onRelationshipsChange(updatedRelationships);
  }, [relationships, onRelationshipsChange]);

  const getEntityDisplayName = useCallback((entityId: string): string => {
    const entity = entities.find(e => e.entity_id === entityId);
    return entity?.display_name || entity?.entity_id || entityId;
  }, [entities]);

  const getEntityTypeColor = useCallback((entityId: string): string => {
    const entity = entities.find(e => e.entity_id === entityId);
    const colors = {
      user: '#2196f3',
      device: '#4caf50',
      location: '#ff9800',
      network: '#9c27b0',
      account: '#f44336',
      transaction: '#607d8b'
    };
    return entity ? colors[entity.entity_type as keyof typeof colors] || '#666' : '#666';
  }, [entities]);

  const getRelationshipTypeLabel = useCallback((type: RelationshipType): string => {
    return RELATIONSHIP_TYPES.find(rt => rt.value === type)?.label || type;
  }, []);

  const generateSuggestedRelationships = useCallback(() => {
    const suggestions: EntityRelationship[] = [];
    
    // Auto-suggest common relationships based on entity types
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];
        
        let suggestedType = RelationshipType.ASSOCIATED_WITH;
        
        // Smart suggestions based on entity types
        if (entityA.entity_type === 'user' && entityB.entity_type === 'device') {
          suggestedType = RelationshipType.USES;
        } else if (entityA.entity_type === 'transaction' && entityB.entity_type === 'user') {
          suggestedType = RelationshipType.INITIATED;
        } else if (entityA.entity_type === 'device' && entityB.entity_type === 'location') {
          suggestedType = RelationshipType.LOCATED_IN;
        }

        // Check if relationship already exists
        const exists = relationships.some(rel =>
          (rel.source_entity_id === entityA.entity_id && rel.target_entity_id === entityB.entity_id) ||
          (rel.source_entity_id === entityB.entity_id && rel.target_entity_id === entityA.entity_id)
        );

        if (!exists) {
          suggestions.push({
            source_entity_id: entityA.entity_id,
            target_entity_id: entityB.entity_id,
            relationship_type: suggestedType,
            strength: 0.6,
            confidence: 0.7
          });
        }
      }
    }

    if (suggestions.length > 0) {
      onRelationshipsChange([...relationships, ...suggestions]);
    }
  }, [entities, relationships, onRelationshipsChange]);

  // Render relationship visualization
  const renderVisualization = useCallback(() => {
    if (!showVisualization || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;

    // Draw entities in circle
    entities.forEach((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Draw entity circle
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = getEntityTypeColor(entity.entity_id);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw entity label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(getEntityDisplayName(entity.entity_id), x, y + 35);
    });

    // Draw relationships
    relationships.forEach(relationship => {
      const sourceIndex = entities.findIndex(e => e.entity_id === relationship.source_entity_id);
      const targetIndex = entities.findIndex(e => e.entity_id === relationship.target_entity_id);

      if (sourceIndex >= 0 && targetIndex >= 0) {
        const sourceAngle = (sourceIndex / entities.length) * 2 * Math.PI;
        const targetAngle = (targetIndex / entities.length) * 2 * Math.PI;
        
        const sourceX = centerX + Math.cos(sourceAngle) * radius;
        const sourceY = centerY + Math.sin(sourceAngle) * radius;
        const targetX = centerX + Math.cos(targetAngle) * radius;
        const targetY = centerY + Math.sin(targetAngle) * radius;

        // Draw relationship line
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = `rgba(0, 0, 0, ${relationship.strength})`;
        ctx.lineWidth = 2 + relationship.strength * 3;
        ctx.stroke();

        // Draw arrow
        const arrowLength = 10;
        const arrowAngle = Math.atan2(targetY - sourceY, targetX - sourceX);
        
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(
          targetX - arrowLength * Math.cos(arrowAngle - Math.PI / 6),
          targetY - arrowLength * Math.sin(arrowAngle - Math.PI / 6)
        );
        ctx.lineTo(
          targetX - arrowLength * Math.cos(arrowAngle + Math.PI / 6),
          targetY - arrowLength * Math.sin(arrowAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 0, 0, ${relationship.strength})`;
        ctx.fill();
      }
    });
  }, [showVisualization, entities, relationships, getEntityDisplayName, getEntityTypeColor]);

  useEffect(() => {
    renderVisualization();
  }, [renderVisualization]);

  if (entities.length < 2) {
    return (
      <Alert severity="info">
        At least 2 entities are required to build relationships.
      </Alert>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RelationshipIcon />
        Entity Relationships ({relationships.length})
      </Typography>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {!readonly && (
          <>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openAddDialog}
              disabled={entities.length < 2}
            >
              Add Relationship
            </Button>
            <Button
              variant="outlined"
              onClick={generateSuggestedRelationships}
              disabled={entities.length < 2}
            >
              Auto-Suggest
            </Button>
          </>
        )}
        <Button
          variant="outlined"
          startIcon={<GraphIcon />}
          onClick={() => setShowVisualization(!showVisualization)}
        >
          {showVisualization ? 'Hide' : 'Show'} Graph
        </Button>
      </Box>

      {/* Relationship Visualization */}
      {showVisualization && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Relationship Graph
            </Typography>
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '100%',
                maxWidth: '400px'
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Relationships List */}
      <Grid container spacing={2}>
        {relationships.map((relationship, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="subtitle2">
                    {getRelationshipTypeLabel(relationship.relationship_type)}
                  </Typography>
                  {!readonly && (
                    <Box>
                      <IconButton size="small" onClick={() => openEditDialog(relationship)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteRelationship(relationship)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={getEntityDisplayName(relationship.source_entity_id)}
                    size="small"
                    sx={{ backgroundColor: getEntityTypeColor(relationship.source_entity_id), color: 'white' }}
                  />
                  <Typography variant="body2" color="text.secondary">→</Typography>
                  <Chip
                    label={getEntityDisplayName(relationship.target_entity_id)}
                    size="small"
                    sx={{ backgroundColor: getEntityTypeColor(relationship.target_entity_id), color: 'white' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Strength: {(relationship.strength * 100).toFixed(0)}%
                  </Typography>
                  {relationship.confidence && (
                    <Typography variant="caption" color="text.secondary">
                      Confidence: {(relationship.confidence * 100).toFixed(0)}%
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {relationships.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No relationships defined. Add relationships to improve cross-entity analysis.
        </Alert>
      )}

      {/* Add/Edit Relationship Dialog */}
      <Dialog open={showAddDialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRelationship ? 'Edit Relationship' : 'Add Relationship'}
        </DialogTitle>
        <DialogContent>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Source Entity</InputLabel>
                <Select
                  value={formData.source_entity_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_entity_id: e.target.value }))}
                  label="Source Entity"
                >
                  {entities.map(entity => (
                    <MenuItem key={entity.entity_id} value={entity.entity_id}>
                      {getEntityDisplayName(entity.entity_id)} ({entity.entity_type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Target Entity</InputLabel>
                <Select
                  value={formData.target_entity_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_entity_id: e.target.value }))}
                  label="Target Entity"
                >
                  {entities.map(entity => (
                    <MenuItem key={entity.entity_id} value={entity.entity_id}>
                      {getEntityDisplayName(entity.entity_id)} ({entity.entity_type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Relationship Type</InputLabel>
                <Select
                  value={formData.relationship_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, relationship_type: e.target.value as RelationshipType }))}
                  label="Relationship Type"
                >
                  {RELATIONSHIP_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography variant="body2">{type.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <Typography gutterBottom>Relationship Strength</Typography>
              <Slider
                value={formData.strength}
                onChange={(_, value) => setFormData(prev => ({ ...prev, strength: value as number }))}
                min={0}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography gutterBottom>Confidence</Typography>
              <Slider
                value={formData.confidence || 0.8}
                onChange={(_, value) => setFormData(prev => ({ ...prev, confidence: value as number }))}
                min={0}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={saveRelationship} variant="contained">
            {editingRelationship ? 'Update' : 'Add'} Relationship
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EntityRelationshipBuilder;