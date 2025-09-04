import React, { ChangeEvent, useState, useEffect } from 'react';
import { allPossibleSteps } from '../utils/investigationStepsConfig';
import { useSettings } from '../hooks/useSettings';
import {
  getCategorizedTools,
  CategorizedToolsResponse,
} from '../services/SettingsService';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  Card,
  CardContent,
  Grid,
  Alert,
  SelectChangeEvent,
  CircularProgress,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';

/** Settings page for default investigation preferences */
const SettingsPage: React.FC = () => {
  const [
    settings,
    setSettings,
    isLoadingSettings,
    settingsError,
    hasSessionOverrides,
    commitToServer,
    resetToServer,
  ] = useSettings();
  const [categorizedTools, setCategorizedTools] =
    useState<CategorizedToolsResponse>({
      olorin_tools: [],
      mcp_tools: [],
    });
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const {
    defaultEntityType,
    selectedAgents,
    commentPrefix,
    agentToolsMapping,
  } = settings;
  const agents = allPossibleSteps.map((s) => s.agent);

  // Fetch categorized tools from the server
  useEffect(() => {
    const loadTools = async () => {
      try {
        setToolsLoading(true);
        setToolsError(null);

        const tools = await getCategorizedTools();
        setCategorizedTools(tools);
      } catch (err) {
        console.error('Error loading tools:', err);
        setToolsError(
          err instanceof Error ? err.message : 'Failed to load tools',
        );
      } finally {
        setToolsLoading(false);
      }
    };

    loadTools();
  }, []);

  const handleEntityChange = (e: SelectChangeEvent<string>) => {
    setSettings((prev) => ({
      ...prev,
      defaultEntityType: e.target.value as 'user_id' | 'device_id',
    }));
  };

  const toggleAgent = (agent: string) => {
    setSettings((prev) => {
      const nextAgents = prev.selectedAgents.includes(agent)
        ? prev.selectedAgents.filter((a) => a !== agent)
        : [...prev.selectedAgents, agent];
      return { ...prev, selectedAgents: nextAgents };
    });
  };

  const handlePrefixChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSettings((prev) => ({ ...prev, commentPrefix: e.target.value }));
  };

  const toggleTool = (agent: string, tool: string) => {
    setSettings((prev) => {
      const prevTools = prev.agentToolsMapping[agent] || [];
      const nextTools = prevTools.includes(tool)
        ? prevTools.filter((t) => t !== tool)
        : [...prevTools, tool];
      return {
        ...prev,
        agentToolsMapping: { ...prev.agentToolsMapping, [agent]: nextTools },
      };
    });
  };

  const getAgentIcon = (agent: string) => {
    if (agent.toLowerCase().includes('user')) return <PersonIcon />;
    if (agent.toLowerCase().includes('device')) return <ComputerIcon />;
    return <BugReportIcon />;
  };

  const renderToolsForAgent = (agent: string) => {
    if (toolsLoading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading tools...
          </Typography>
        </Box>
      );
    }

    if (toolsError) {
      return (
        <Typography
          variant="body2"
          color="error.main"
          sx={{ fontStyle: 'italic', py: 2 }}
        >
          Error loading tools: {toolsError}
        </Typography>
      );
    }

    return (
      <Box sx={{ space: 2 }}>
        {/* Olorin Investigation Tools */}
        {categorizedTools.olorin_tools.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon sx={{ color: 'primary.main', fontSize: '1rem' }} />
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: 'primary.main' }}
              >
                🔍 Investigation Tools ({categorizedTools.olorin_tools.length})
              </Typography>
            </Box>
            <Grid container spacing={1}>
              {categorizedTools.olorin_tools.map((tool) => (
                <Grid item xs={12} sm={6} key={tool.name}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={
                          agentToolsMapping[agent]?.includes(tool.name) || false
                        }
                        onChange={() => toggleTool(agent, tool.name)}
                        size="small"
                        sx={{ color: 'primary.main' }}
                      />
                    }
                    label={
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'primary.main',
                          }}
                        >
                          {tool.display_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({tool.name})
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Standard MCP Tools */}
        {categorizedTools.mcp_tools.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ExtensionIcon
                  sx={{ color: 'text.secondary', fontSize: '1rem' }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  🛠️ Standard Tools ({categorizedTools.mcp_tools.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1}>
                {categorizedTools.mcp_tools.map((tool) => (
                  <Grid item xs={12} sm={6} key={tool.name}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            agentToolsMapping[agent]?.includes(tool.name) ||
                            false
                          }
                          onChange={() => toggleTool(agent, tool.name)}
                          size="small"
                          sx={{ color: 'primary.main' }}
                        />
                      }
                      label={
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: '0.875rem' }}
                          >
                            {tool.display_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({tool.name})
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: 'text.primary' }}
          >
            Settings
          </Typography>
          {hasSessionOverrides && (
            <Chip
              icon={<WarningIcon />}
              label="Session Changes"
              color="warning"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Configure default preferences for new investigations
        </Typography>

        {/* Session Override Controls */}
        {hasSessionOverrides && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Alert severity="info" sx={{ flex: 1 }}>
              You have unsaved changes in this session. These changes will be
              lost when you close the browser.
            </Alert>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={commitToServer}
              color="primary"
            >
              Save to Server
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={resetToServer}
              color="secondary"
            >
              Reset to Server
            </Button>
          </Box>
        )}

        {/* Loading State */}
        {isLoadingSettings && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading settings from server...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {settingsError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Error loading settings: {settingsError}
          </Alert>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* Default Entity Type */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
              >
                <PersonIcon sx={{ color: 'primary.main' }} />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: 'text.primary' }}
                >
                  Default Entity Type
                </Typography>
              </Box>
              <FormControl fullWidth>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={defaultEntityType}
                  label="Entity Type"
                  onChange={handleEntityChange}
                >
                  <MenuItem value="user_id">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" />
                      User ID
                    </Box>
                  </MenuItem>
                  <MenuItem value="device_id">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ComputerIcon fontSize="small" />
                      Device ID
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Comment Prefix */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: 'text.primary', mb: 3 }}
              >
                Comment Prefix
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Prefix for comments"
                value={commentPrefix}
                onChange={handlePrefixChange}
                placeholder="Enter a prefix to automatically add to all comments..."
                variant="outlined"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Default Agents */}
        <Grid item xs={12}>
          <Card
            sx={{
              '&:hover': {
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
              >
                <BugReportIcon sx={{ color: 'primary.main' }} />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: 'text.primary' }}
                >
                  Default Olorin AI Agents
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {agents.map((agent) => (
                  <Grid item xs={12} sm={6} md={4} key={agent}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedAgents.includes(agent)}
                          onChange={() => toggleAgent(agent)}
                          sx={{ color: 'primary.main' }}
                        />
                      }
                      label={
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          {getAgentIcon(agent)}
                          <Typography variant="body2">{agent}</Typography>
                        </Box>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Tools per Agent */}
        <Grid item xs={12}>
          <Card
            sx={{
              '&:hover': {
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
              >
                <BuildIcon sx={{ color: 'primary.main' }} />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: 'text.primary' }}
                >
                  Tools per Agent
                </Typography>
              </Box>
              <Alert
                severity="info"
                sx={{
                  mb: 3,
                  backgroundColor: 'primary.50',
                  borderColor: 'primary.200',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  <strong>Investigation Tools</strong> are specialized for fraud
                  detection and security analysis.
                  <strong>Standard Tools</strong> provide general functionality
                  like web search and file operations.
                </Typography>
              </Alert>
              <Grid container spacing={3}>
                {selectedAgents.map((agent) => (
                  <Grid item xs={12} md={6} key={agent}>
                    <Card
                      variant="outlined"
                      sx={{ backgroundColor: 'grey.50' }}
                    >
                      <CardContent>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
                        >
                          {agent}
                        </Typography>
                        {renderToolsForAgent(agent)}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Information Alert */}
        <Grid item xs={12}>
          <Alert
            severity="info"
            icon={<InfoIcon />}
            sx={{
              backgroundColor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.200',
              '& .MuiAlert-icon': {
                color: 'primary.main',
              },
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}
            >
              Settings Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hasSessionOverrides
                ? "These settings will be applied to new investigations. Changes are stored in your session and will be lost when you close the browser. Use 'Save to Server' to make them permanent."
                : 'These settings will be applied to new investigations. Changes are loaded from the server and can be saved permanently.'}
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
