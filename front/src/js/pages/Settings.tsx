import React, { ChangeEvent } from 'react';
import { allPossibleSteps } from '../utils/investigationStepsConfig';
import { useSettings } from '../hooks/useSettings';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Card,
  CardContent,
  Grid,
  Divider,
  Alert,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/** Settings page for default investigation preferences */
const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useSettings();
  const theme = useTheme();
  const {
    defaultEntityType,
    selectedAgents,
    commentPrefix,
    agentToolsMapping,
  } = settings;
  const agents = allPossibleSteps.map((s) => s.agent);

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

  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Settings
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Configure default preferences for new investigations
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Default Entity Type */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            '&:hover': { 
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PersonIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
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
          <Card sx={{ 
            height: '100%',
            '&:hover': { 
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 3 }}>
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
          <Card sx={{ 
            '&:hover': { 
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <BugReportIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Default Agents
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          <Card sx={{ 
            '&:hover': { 
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <BuildIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Tools per Agent
                </Typography>
              </Box>
              <Grid container spacing={3}>
                {selectedAgents.map((agent) => (
                  <Grid item xs={12} md={6} key={agent}>
                    <Card variant="outlined" sx={{ backgroundColor: 'grey.50' }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                          {agent}
                        </Typography>
                        <Grid container spacing={1}>
                          {['Splunk', 'OII', 'CHRONOS', 'NELI', 'DI BB', 'DATA LAKE'].map(
                            (tool) => (
                              <Grid item xs={6} key={tool}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={
                                        agentToolsMapping[agent]?.includes(tool) || false
                                      }
                                      onChange={() => toggleTool(agent, tool)}
                                      size="small"
                                      sx={{ color: 'primary.main' }}
                                    />
                                  }
                                  label={
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                      {tool}
                                    </Typography>
                                  }
                                />
                              </Grid>
                            ),
                          )}
                        </Grid>
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
                color: 'primary.main'
              }
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Settings Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              These settings will be applied to new investigations. Changes are automatically saved to your browser's local storage.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
