import React, { useState, useCallback, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
  Security as SecurityIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  MultiEntityInvestigationResult,
  EntityInvestigationResult,
  EntityDefinition,
  CrossEntityAnalysis,
  MultiEntityRiskAssessment,
  TimelineEvent
} from '../types/multiEntityInvestigation';

interface MultiEntityResultsProps {
  investigationResult: MultiEntityInvestigationResult;
  onEntityDrillDown: (entityId: string) => void;
  showCrossEntityInsights?: boolean;
  onExport?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div role="tabpanel" hidden={value !== index} {...other}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const MultiEntityResults: React.FC<MultiEntityResultsProps> = ({
  investigationResult,
  onEntityDrillDown,
  showCrossEntityInsights = true,
  onExport
}) => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);

  const {
    investigation_id,
    status,
    entities,
    entity_results,
    cross_entity_analysis,
    overall_risk_assessment,
    investigation_timeline,
    started_at,
    completed_at,
    duration_ms
  } = investigationResult;

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalEntities = entities.length;
    const completedEntities = Object.values(entity_results).filter(r => r.status === 'completed').length;
    const failedEntities = Object.values(entity_results).filter(r => r.status === 'failed').length;
    const highRiskEntities = overall_risk_assessment.high_risk_entities.length;
    
    return {
      totalEntities,
      completedEntities,
      failedEntities,
      highRiskEntities,
      completionRate: totalEntities > 0 ? (completedEntities / totalEntities) * 100 : 0
    };
  }, [entities, entity_results, overall_risk_assessment]);

  const getRiskColor = useCallback((riskScore: number): string => {
    if (riskScore >= 0.8) return theme.palette.error.main;
    if (riskScore >= 0.6) return theme.palette.warning.main;
    if (riskScore >= 0.4) return theme.palette.info.main;
    return theme.palette.success.main;
  }, [theme]);

  const getRiskLabel = useCallback((riskScore: number): string => {
    if (riskScore >= 0.8) return 'Critical';
    if (riskScore >= 0.6) return 'High';
    if (riskScore >= 0.4) return 'Medium';
    return 'Low';
  }, []);

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

  const getEntityDisplayName = useCallback((entityId: string): string => {
    const entity = entities.find(e => e.entity_id === entityId);
    return entity?.display_name || entity?.entity_id || entityId;
  }, [entities]);

  const formatDuration = useCallback((ms?: number): string => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, []);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  }, []);

  const handleEntityClick = useCallback((entityId: string) => {
    setSelectedEntity(entityId);
  }, []);

  const handleEntityDrillDown = useCallback((entityId: string) => {
    onEntityDrillDown(entityId);
  }, [onEntityDrillDown]);

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {summaryStats.totalEntities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Entities
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {summaryStats.completedEntities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {summaryStats.highRiskEntities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Risk
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">
                  {formatDuration(duration_ms)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Overall Risk Assessment */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              Overall Risk Assessment
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ flexGrow: 1, mr: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={overall_risk_assessment.overall_risk_score * 100}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getRiskColor(overall_risk_assessment.overall_risk_score)
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {(overall_risk_assessment.overall_risk_score * 100).toFixed(0)}%
              </Typography>
            </Box>
            <Chip 
              label={getRiskLabel(overall_risk_assessment.overall_risk_score)}
              sx={{ 
                backgroundColor: getRiskColor(overall_risk_assessment.overall_risk_score),
                color: 'white',
                mb: 2
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {overall_risk_assessment.summary}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Investigation Status */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Investigation Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip 
                label={status.toUpperCase()}
                color={status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'primary'}
                icon={
                  status === 'completed' ? <CheckCircleIcon /> :
                  status === 'failed' ? <ErrorIcon /> :
                  <TrendingUpIcon />
                }
              />
              <Typography variant="body2">
                {summaryStats.completionRate.toFixed(0)}% Complete
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Started: {new Date(started_at).toLocaleString()}
            </Typography>
            {completed_at && (
              <Typography variant="body2" color="text.secondary">
                Completed: {new Date(completed_at).toLocaleString()}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderEntitiesTab = () => (
    <Grid container spacing={3}>
      {entities.map(entity => {
        const result = entity_results[entity.entity_id];
        const riskScore = result?.risk_assessment?.risk_level || 0;
        
        return (
          <Grid item xs={12} md={6} key={entity.entity_id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">
                      {getEntityDisplayName(entity.entity_id)}
                    </Typography>
                    <Chip
                      label={entity.entity_type}
                      size="small"
                      sx={{
                        backgroundColor: getEntityTypeColor(entity.entity_id),
                        color: 'white',
                        mb: 1
                      }}
                    />
                  </Box>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleEntityDrillDown(entity.entity_id)}
                  >
                    View Details
                  </Button>
                </Box>

                {result ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ flexGrow: 1, mr: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={riskScore * 100}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: theme.palette.grey[200],
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getRiskColor(riskScore)
                            }
                          }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {(riskScore * 100).toFixed(0)}%
                      </Typography>
                    </Box>

                    <Chip
                      label={result.status.toUpperCase()}
                      size="small"
                      color={
                        result.status === 'completed' ? 'success' :
                        result.status === 'failed' ? 'error' : 'primary'
                      }
                      sx={{ mb: 1 }}
                    />

                    {result.risk_assessment?.summary && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {result.risk_assessment.summary}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Alert severity="info">No investigation results available</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderCrossAnalysisTab = () => (
    <Grid container spacing={3}>
      {/* Patterns Detected */}
      <Grid item xs={12}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              Patterns Detected ({cross_entity_analysis.patterns_detected.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {cross_entity_analysis.patterns_detected.length > 0 ? (
              <List>
                {cross_entity_analysis.patterns_detected.map((pattern, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InsightsIcon color={pattern.risk_level >= 0.7 ? 'error' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={pattern.description}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Risk Level: {(pattern.risk_level * 100).toFixed(0)}% | 
                            Confidence: {(pattern.confidence * 100).toFixed(0)}%
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {pattern.entities_involved.map(entityId => (
                              <Chip
                                key={entityId}
                                label={getEntityDisplayName(entityId)}
                                size="small"
                                sx={{
                                  backgroundColor: getEntityTypeColor(entityId),
                                  color: 'white',
                                  mr: 1,
                                  mb: 0.5
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">No cross-entity patterns detected</Alert>
            )}
          </AccordionDetails>
        </Accordion>
      </Grid>

      {/* Risk Correlations */}
      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              Risk Correlations ({cross_entity_analysis.risk_correlations.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {cross_entity_analysis.risk_correlations.length > 0 ? (
              <List>
                {cross_entity_analysis.risk_correlations.map((correlation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color={correlation.risk_amplification >= 0.7 ? 'error' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={correlation.description}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Correlation: {(correlation.correlation_strength * 100).toFixed(0)}% | 
                            Risk Amplification: {(correlation.risk_amplification * 100).toFixed(0)}%
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {correlation.entities.map(entityId => (
                              <Chip
                                key={entityId}
                                label={getEntityDisplayName(entityId)}
                                size="small"
                                sx={{
                                  backgroundColor: getEntityTypeColor(entityId),
                                  color: 'white',
                                  mr: 1,
                                  mb: 0.5
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">No risk correlations found</Alert>
            )}
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  );

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Multi-Entity Investigation Results
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<TimelineIcon />}
            onClick={() => setShowTimelineDialog(true)}
            disabled={!investigation_timeline || investigation_timeline.length === 0}
          >
            Timeline
          </Button>
          {onExport && (
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={onExport}
            >
              Export
            </Button>
          )}
        </Box>
      </Box>

      {/* Investigation ID */}
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Investigation ID: {investigation_id}
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab 
            label={
              <Badge badgeContent={summaryStats.highRiskEntities} color="error">
                Entities ({entities.length})
              </Badge>
            } 
          />
          {showCrossEntityInsights && (
            <Tab 
              label={
                <Badge 
                  badgeContent={cross_entity_analysis.patterns_detected.length} 
                  color="primary"
                >
                  Cross-Entity Analysis
                </Badge>
              } 
            />
          )}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={selectedTab} index={0}>
        {renderOverviewTab()}
      </TabPanel>
      <TabPanel value={selectedTab} index={1}>
        {renderEntitiesTab()}
      </TabPanel>
      {showCrossEntityInsights && (
        <TabPanel value={selectedTab} index={2}>
          {renderCrossAnalysisTab()}
        </TabPanel>
      )}

      {/* Timeline Dialog */}
      <Dialog 
        open={showTimelineDialog} 
        onClose={() => setShowTimelineDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Investigation Timeline</DialogTitle>
        <DialogContent>
          {investigation_timeline && investigation_timeline.length > 0 ? (
            <List>
              {investigation_timeline.map((event, index) => (
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
                            Type: {event.event_type} | 
                            Risk Impact: {(event.risk_impact * 100).toFixed(0)}%
                          </Typography>
                          {event.entities_involved.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              {event.entities_involved.map(entityId => (
                                <Chip
                                  key={entityId}
                                  label={getEntityDisplayName(entityId)}
                                  size="small"
                                  sx={{
                                    backgroundColor: getEntityTypeColor(entityId),
                                    color: 'white',
                                    mr: 1,
                                    mb: 0.5
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < investigation_timeline.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Alert severity="info">No timeline events available</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTimelineDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default MultiEntityResults;