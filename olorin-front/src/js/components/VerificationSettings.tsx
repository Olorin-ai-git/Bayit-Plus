import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Box,
  Grid,
  Alert,
  Divider,
  Chip,
  CircularProgress,
  Button,
  Tooltip,
} from '@mui/material';
import {
  VerifiedUser as VerifiedUserIcon,
  Shield as ShieldIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

interface VerificationConfig {
  enabled: boolean;
  mode: 'blocking' | 'shadow';
  sample_percent: number;
  threshold_default: number;
}

interface VerificationSettingsProps {
  onSettingsChange?: (config: VerificationConfig) => void;
}

export const VerificationSettings: React.FC<VerificationSettingsProps> = ({
  onSettingsChange,
}) => {
  const [config, setConfig] = useState<VerificationConfig>({
    enabled: false,
    mode: 'shadow',
    sample_percent: 100,
    threshold_default: 85,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current verification settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/health');
      
      if (response.data && response.data.verification) {
        const verificationData = response.data.verification;
        setConfig({
          enabled: verificationData.enabled || false,
          mode: verificationData.mode || 'shadow',
          sample_percent: verificationData.sample_percent * 100 || 100, // Convert to percentage
          threshold_default: verificationData.threshold_default * 100 || 85, // Convert to percentage
        });
      }
    } catch (err) {
      console.error('Error fetching verification settings:', err);
      setError('Failed to load verification settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save settings to backend
  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await api.post('/api/v1/verification/settings', {
        enabled: config.enabled,
        mode: config.mode,
        sample_percent: config.sample_percent / 100, // Convert to decimal
        threshold_default: config.threshold_default / 100, // Convert to decimal
      });
      
      if (response.data.success) {
        setSuccessMessage('Verification settings saved successfully');
        if (onSettingsChange) {
          onSettingsChange(config);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving verification settings:', err);
      setError('Failed to save verification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, enabled: event.target.checked }));
  };

  const handleModeChange = (event: any) => {
    setConfig((prev) => ({ ...prev, mode: event.target.value }));
  };

  const handleSamplePercentChange = (event: any, newValue: number | number[]) => {
    setConfig((prev) => ({ ...prev, sample_percent: newValue as number }));
  };

  const handleThresholdChange = (event: any, newValue: number | number[]) => {
    setConfig((prev) => ({ ...prev, threshold_default: newValue as number }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading verification settings...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <VerifiedUserIcon sx={{ color: 'primary.main' }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: 'text.primary' }}
          >
            LLM Verification System
          </Typography>
          <Tooltip title="Verification uses a secondary model to validate primary model responses">
            <InfoIcon sx={{ fontSize: 18, color: 'text.secondary', ml: 1 }} />
          </Tooltip>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchSettings}
            disabled={loading || saving}
            sx={{ ml: 'auto' }}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Master Switch */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={handleEnabledChange}
                  color="primary"
                  disabled={saving}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Enable Verification System</Typography>
                  <Chip
                    label={config.enabled ? 'Active' : 'Inactive'}
                    size="small"
                    color={config.enabled ? 'success' : 'default'}
                    sx={{ height: 20 }}
                  />
                </Box>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 6 }}>
              Master switch to enable/disable the dual-model verification system
            </Typography>
          </Grid>

          {/* Verification Mode */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!config.enabled || saving}>
              <InputLabel>Verification Mode</InputLabel>
              <Select
                value={config.mode}
                label="Verification Mode"
                onChange={handleModeChange}
              >
                <MenuItem value="blocking">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon sx={{ fontSize: 18, color: 'error.main' }} />
                    <Typography>Blocking</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="shadow">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon sx={{ fontSize: 18, color: 'info.main' }} />
                    <Typography>Shadow</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {config.mode === 'blocking'
                ? 'Synchronous verification with automatic retries on failure'
                : 'Asynchronous monitoring without blocking the main flow'}
            </Typography>
          </Grid>

          {/* Sample Percentage */}
          <Grid item xs={12} md={6}>
            <Box sx={{ opacity: config.enabled ? 1 : 0.5 }}>
              <Typography gutterBottom>
                Sample Rate: {config.sample_percent}%
              </Typography>
              <Slider
                value={config.sample_percent}
                onChange={handleSamplePercentChange}
                valueLabelDisplay="auto"
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                min={0}
                max={100}
                disabled={!config.enabled || saving}
              />
              <Typography variant="caption" color="text.secondary">
                Percentage of requests to verify (for gradual rollout)
              </Typography>
            </Box>
          </Grid>

          {/* Threshold */}
          <Grid item xs={12}>
            <Box sx={{ opacity: config.enabled ? 1 : 0.5 }}>
              <Typography gutterBottom>
                Pass Threshold: {config.threshold_default}%
              </Typography>
              <Slider
                value={config.threshold_default}
                onChange={handleThresholdChange}
                valueLabelDisplay="auto"
                step={5}
                marks={[
                  { value: 50, label: '50%' },
                  { value: 70, label: '70%' },
                  { value: 85, label: '85%' },
                  { value: 95, label: '95%' },
                ]}
                min={50}
                max={100}
                disabled={!config.enabled || saving}
              />
              <Typography variant="caption" color="text.secondary">
                Minimum verification score required to pass (higher = stricter)
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Current Configuration Summary */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Current Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {config.enabled ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Mode
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {config.mode === 'blocking' ? 'Blocking' : 'Shadow'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Sample Rate
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {config.sample_percent}%
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Pass Threshold
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {config.threshold_default}%
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Verification System:</strong> Uses Claude Opus 4.1 to verify
            OpenAI model responses. The system evaluates correctness, completeness,
            adherence, grounding, and safety. In blocking mode, failed verifications
            trigger automatic retries with improved prompts.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};