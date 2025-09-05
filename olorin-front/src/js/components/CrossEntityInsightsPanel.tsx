import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Insights as InsightsIcon,
  Timeline as TimelineIcon,
  Hub as NetworkIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  ZoomIn as ZoomInIcon,
  FilterList as FilterIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  CrossEntityAnalysis,
  EntityPattern,
  RelationshipInsight,
  RiskCorrelation,
  TimelineEvent,
  EntityDefinition,
  EntityRelationship
} from '../types/multiEntityInvestigation';

interface CrossEntityInsightsPanelProps {
  insights: CrossEntityAnalysis;
  entities: EntityDefinition[];
  relationships: EntityRelationship[];
  relationshipGraph?: any; // Will be enhanced with proper graph type later
  onPatternHighlight: (pattern: string) => void;
  onEntityFocus?: (entityId: string) => void;
  onRelationshipFocus?: (relationshipId: string) => void;
}

interface EntityGraphNode {
  id: string;
  label: string;
  type: string;
  riskLevel: number;
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  strength: number;
}

const CrossEntityInsightsPanel: React.FC<CrossEntityInsightsPanelProps> = ({
  insights,
  entities,
  relationships,
  onPatternHighlight,
  onEntityFocus,
  onRelationshipFocus
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPattern, setSelectedPattern] = useState<EntityPattern | null>(null);
  const [showPatternDialog, setShowPatternDialog] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  const [highlightHighRisk, setHighlightHighRisk] = useState(true);
  const [graphNodes, setGraphNodes] = useState<EntityGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);

  const {
    patterns_detected,
    relationship_insights,
    risk_correlations,
    timeline_reconstruction,
    anomaly_summary,
    confidence_score
  } = insights;

  // Initialize graph data
  useEffect(() => {
    const nodes: EntityGraphNode[] = entities.map((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI;
      const radius = 120;
      const centerX = 200;
      const centerY = 150;
      
      // Get risk level from patterns or correlations
      let riskLevel = 0.3; // Default
      patterns_detected.forEach(pattern => {
        if (pattern.entities_involved.includes(entity.entity_id)) {
          riskLevel = Math.max(riskLevel, pattern.risk_level);
        }
      });

      return {
        id: entity.entity_id,
        label: entity.display_name || entity.entity_id,
        type: entity.entity_type,
        riskLevel,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });

    const edges: GraphEdge[] = relationships.map(rel => ({
      source: rel.source_entity_id,
      target: rel.target_entity_id,
      relationship: rel.relationship_type,
      strength: rel.strength
    }));

    setGraphNodes(nodes);
    setGraphEdges(edges);
  }, [entities, relationships, patterns_detected]);

  const getRiskColor = useCallback((riskLevel: number): string => {
    if (riskLevel >= 0.8) return theme.palette.error.main;
    if (riskLevel >= 0.6) return theme.palette.warning.main;
    if (riskLevel >= 0.4) return theme.palette.info.main;
    return theme.palette.success.main;
  }, [theme]);

  const getEntityTypeColor = useCallback((entityType: string): string => {
    const colors = {
      user: '#2196f3',
      device: '#4caf50',
      location: '#ff9800',
      network: '#9c27b0',
      account: '#f44336',
      transaction: '#607d8b'
    };
    return colors[entityType as keyof typeof colors] || '#666';
  }, []);

  const renderGraph = useCallback(() => {
    if (!showGraph || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges first
    graphEdges.forEach(edge => {
      const sourceNode = graphNodes.find(n => n.id === edge.source);
      const targetNode = graphNodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = `rgba(0, 0, 0, ${edge.strength * 0.7})`;
        ctx.lineWidth = 1 + edge.strength * 2;
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
        const arrowLength = 8;
        ctx.beginPath();
        ctx.moveTo(targetNode.x, targetNode.y);
        ctx.lineTo(
          targetNode.x - arrowLength * Math.cos(angle - Math.PI / 6),
          targetNode.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          targetNode.x - arrowLength * Math.cos(angle + Math.PI / 6),
          targetNode.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 0, 0, ${edge.strength * 0.7})`;
        ctx.fill();
      }
    });

    // Draw nodes
    graphNodes.forEach(node => {
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15 + (highlightHighRisk && node.riskLevel > 0.6 ? 5 : 0), 0, 2 * Math.PI);
      ctx.fillStyle = highlightHighRisk ? getRiskColor(node.riskLevel) : getEntityTypeColor(node.type);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Risk indicator
      if (highlightHighRisk && node.riskLevel > 0.6) {
        ctx.beginPath();
        ctx.arc(node.x + 12, node.y - 12, 6, 0, 2 * Math.PI);
        ctx.fillStyle = theme.palette.error.main;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Node label
      ctx.fillStyle = '#333';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 30);
    });
  }, [showGraph, graphNodes, graphEdges, highlightHighRisk, getRiskColor, getEntityTypeColor, theme]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  const handlePatternClick = useCallback((pattern: EntityPattern) => {
    setSelectedPattern(pattern);
    setShowPatternDialog(true);
    onPatternHighlight(pattern.pattern_id);
  }, [onPatternHighlight]);

  const handleNodeClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked node
    const clickedNode = graphNodes.find(node => {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return distance <= 20; // Node radius + margin
    });

    if (clickedNode && onEntityFocus) {
      onEntityFocus(clickedNode.id);
    }
  }, [graphNodes, onEntityFocus]);

  const getPatternSeverityIcon = useCallback((pattern: EntityPattern) => {
    if (pattern.risk_level >= 0.8) return <SecurityIcon color="error" />;
    if (pattern.risk_level >= 0.6) return <WarningIcon color="warning" />;
    return <InsightsIcon color="primary" />;
  }, []);

  const formatConfidenceScore = useCallback((score: number): string => {
    return `${(score * 100).toFixed(0)}%`;
  }, []);

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InsightsIcon />
          Cross-Entity Insights
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={highlightHighRisk}
                onChange={(e) => setHighlightHighRisk(e.target.checked)}
                size="small"
              />
            }
            label="Highlight Risk"
          />
          <Button
            size="small"
            startIcon={<ShareIcon />}
            variant="outlined"
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Summary Card */}
      <Card sx={{ mb: 3, bgcolor: theme.palette.grey[50] }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="body1" gutterBottom>
                {anomaly_summary}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Analysis Confidence: {formatConfidenceScore(confidence_score)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <LinearProgress
                  variant="determinate"
                  value={confidence_score * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    width: '100%',
                    backgroundColor: theme.palette.grey[300],
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: confidence_score >= 0.8 ? theme.palette.success.main : 
                                      confidence_score >= 0.6 ? theme.palette.warning.main : theme.palette.error.main
                    }
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Relationship Graph */}
      {showGraph && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NetworkIcon />
                Entity Relationship Graph
              </Typography>
              <IconButton onClick={() => setShowGraph(false)} size="small">
                <VisibilityIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={canvasRef}
                width={400}
                height={300}
                onClick={handleNodeClick}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  maxWidth: '100%'
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Click on nodes to focus entities. Line thickness represents relationship strength.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Detected Patterns */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InsightsIcon />
                Detected Patterns ({patterns_detected.length})
              </Typography>
              
              {patterns_detected.length > 0 ? (
                <List dense>
                  {patterns_detected.slice(0, 3).map((pattern, index) => (
                    <React.Fragment key={pattern.pattern_id}>
                      <ListItem 
                        button 
                        onClick={() => handlePatternClick(pattern)}
                        sx={{ px: 0 }}
                      >
                        <ListItemIcon>
                          {getPatternSeverityIcon(pattern)}
                        </ListItemIcon>
                        <ListItemText
                          primary={pattern.description}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Risk: {formatConfidenceScore(pattern.risk_level)} | 
                                Confidence: {formatConfidenceScore(pattern.confidence)}
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {pattern.entities_involved.slice(0, 3).map(entityId => {
                                  const entity = entities.find(e => e.entity_id === entityId);
                                  return (
                                    <Chip
                                      key={entityId}
                                      label={entity?.display_name || entityId}
                                      size="small"
                                      sx={{
                                        backgroundColor: getEntityTypeColor(entity?.entity_type || 'unknown'),
                                        color: 'white',
                                        mr: 0.5,
                                        fontSize: '0.7rem'
                                      }}
                                    />
                                  );
                                })}
                                {pattern.entities_involved.length > 3 && (
                                  <Typography variant="caption" color="text.secondary">
                                    +{pattern.entities_involved.length - 3} more
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(patterns_detected.length, 3) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {patterns_detected.length > 3 && (
                    <ListItem>
                      <ListItemText>
                        <Typography variant="body2" color="primary" sx={{ textAlign: 'center' }}>
                          +{patterns_detected.length - 3} more patterns
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  )}
                </List>
              ) : (
                <Alert severity="info">No suspicious patterns detected</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Correlations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon />
                Risk Correlations ({risk_correlations.length})
              </Typography>
              
              {risk_correlations.length > 0 ? (
                <List dense>
                  {risk_correlations.slice(0, 3).map((correlation, index) => (
                    <React.Fragment key={correlation.correlation_id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <WarningIcon 
                            color={correlation.risk_amplification >= 0.7 ? 'error' : 'warning'} 
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={correlation.description}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Correlation: {formatConfidenceScore(correlation.correlation_strength)} | 
                                Risk Impact: {formatConfidenceScore(correlation.risk_amplification)}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={correlation.risk_amplification * 100}
                                sx={{
                                  height: 4,
                                  borderRadius: 2,
                                  mt: 0.5,
                                  backgroundColor: theme.palette.grey[300],
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: getRiskColor(correlation.risk_amplification)
                                  }
                                }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(risk_correlations.length, 3) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {risk_correlations.length > 3 && (
                    <ListItem>
                      <ListItemText>
                        <Typography variant="body2" color="primary" sx={{ textAlign: 'center' }}>
                          +{risk_correlations.length - 3} more correlations
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  )}
                </List>
              ) : (
                <Alert severity="info">No risk correlations found</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Relationship Insights */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Relationship Insights ({relationship_insights.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {relationship_insights.length > 0 ? (
                <Grid container spacing={2}>
                  {relationship_insights.map((insight, index) => (
                    <Grid item xs={12} md={6} key={insight.insight_id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            {insight.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip
                              label={entities.find(e => e.entity_id === insight.source_entity)?.display_name || insight.source_entity}
                              size="small"
                              sx={{ fontSize: '0.7rem' }}
                            />
                            <Typography variant="caption">→</Typography>
                            <Chip
                              label={entities.find(e => e.entity_id === insight.target_entity)?.display_name || insight.target_entity}
                              size="small"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Strength: {formatConfidenceScore(insight.relationship_strength)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Risk Impact: {formatConfidenceScore(insight.risk_impact)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">No relationship insights available</Alert>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Timeline Reconstruction */}
        {timeline_reconstruction.length > 0 && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon />
                  Timeline Reconstruction ({timeline_reconstruction.length} events)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {timeline_reconstruction.slice(0, 5).map((event, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemIcon>
                          <TimelineIcon color={event.risk_impact >= 0.7 ? 'error' : 'primary'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={event.description}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {new Date(event.timestamp).toLocaleString()} | 
                                Risk Impact: {formatConfidenceScore(event.risk_impact)}
                              </Typography>
                              {event.entities_involved.length > 0 && (
                                <Box sx={{ mt: 0.5 }}>
                                  {event.entities_involved.map(entityId => {
                                    const entity = entities.find(e => e.entity_id === entityId);
                                    return (
                                      <Chip
                                        key={entityId}
                                        label={entity?.display_name || entityId}
                                        size="small"
                                        sx={{
                                          backgroundColor: getEntityTypeColor(entity?.entity_type || 'unknown'),
                                          color: 'white',
                                          mr: 0.5,
                                          fontSize: '0.7rem'
                                        }}
                                      />
                                    );
                                  })}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(timeline_reconstruction.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {timeline_reconstruction.length > 5 && (
                    <Alert severity="info">
                      Showing first 5 events. {timeline_reconstruction.length - 5} more events in timeline.
                    </Alert>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>

      {/* Pattern Detail Dialog */}
      <Dialog 
        open={showPatternDialog} 
        onClose={() => setShowPatternDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Pattern Details</DialogTitle>
        <DialogContent>
          {selectedPattern && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedPattern.description}
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Pattern Type: {selectedPattern.pattern_type}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Risk Level: {formatConfidenceScore(selectedPattern.risk_level)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Confidence: {formatConfidenceScore(selectedPattern.confidence)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Entities Involved: {selectedPattern.entities_involved.length}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" gutterBottom>
                Supporting Evidence:
              </Typography>
              <List dense>
                {selectedPattern.supporting_evidence.map((evidence, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={evidence} />
                  </ListItem>
                ))}
              </List>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Involved Entities:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedPattern.entities_involved.map(entityId => {
                  const entity = entities.find(e => e.entity_id === entityId);
                  return (
                    <Chip
                      key={entityId}
                      label={`${entity?.display_name || entityId} (${entity?.entity_type})`}
                      sx={{
                        backgroundColor: getEntityTypeColor(entity?.entity_type || 'unknown'),
                        color: 'white'
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPatternDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => selectedPattern && onPatternHighlight(selectedPattern.pattern_id)}
          >
            Highlight in Graph
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CrossEntityInsightsPanel;