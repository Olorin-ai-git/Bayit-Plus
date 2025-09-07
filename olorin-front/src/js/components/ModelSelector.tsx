import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Button,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

interface Model {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  selected: boolean;
  verification: boolean;
}

interface ModelSelectorProps {
  onModelChange?: (modelId: string, isVerification: boolean) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [verificationModel, setVerificationModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Fetch available models
  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/v1/models');
      
      if (response.data.status === 'success') {
        setModels(response.data.models);
        setSelectedModel(response.data.selected_model);
        setVerificationModel(response.data.verification_model);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to load available models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Handle model selection change
  const handleModelChange = async (modelId: string, isVerification: boolean) => {
    try {
      setUpdating(true);
      setError(null);
      
      const response = await api.post('/api/v1/models/select', {
        model_id: modelId,
        is_verification: isVerification,
      });
      
      if (response.data.success) {
        if (isVerification) {
          setVerificationModel(modelId);
        } else {
          setSelectedModel(modelId);
        }
        
        // Notify parent component
        if (onModelChange) {
          onModelChange(modelId, isVerification);
        }
      } else {
        setError(response.data.message || 'Failed to update model selection');
      }
    } catch (err) {
      console.error('Error updating model:', err);
      setError('Failed to update model selection');
    } finally {
      setUpdating(false);
    }
  };

  // Get provider color
  const getProviderColor = (provider: string): string => {
    switch (provider) {
      case 'anthropic':
        return '#6366f1'; // Indigo
      case 'openai':
        return '#10b981'; // Emerald
      case 'google':
        return '#f59e0b'; // Amber
      default:
        return '#6b7280'; // Gray
    }
  };

  // Get provider label
  const getProviderLabel = (provider: string): string => {
    switch (provider) {
      case 'anthropic':
        return 'Anthropic';
      case 'openai':
        return 'OpenAI';
      case 'google':
        return 'Google';
      default:
        return provider;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading model configuration...</Typography>
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
          <PsychologyIcon sx={{ color: 'primary.main' }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: 'text.primary' }}
          >
            LLM Model Selection
          </Typography>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchModels}
            disabled={loading || updating}
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

        <Grid container spacing={3}>
          {/* Primary Model Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={updating}>
              <InputLabel>Primary Model</InputLabel>
              <Select
                value={selectedModel}
                label="Primary Model"
                onChange={(e) => handleModelChange(e.target.value, false)}
              >
                {models.map((model) => (
                  <MenuItem
                    key={model.id}
                    value={model.id}
                    disabled={!model.available}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: '100%',
                      }}
                    >
                      <Typography>{model.name}</Typography>
                      <Chip
                        label={getProviderLabel(model.provider)}
                        size="small"
                        sx={{
                          backgroundColor: getProviderColor(model.provider),
                          color: 'white',
                          height: 20,
                          fontSize: '0.7rem',
                        }}
                      />
                      {model.available ? (
                        <CheckCircleIcon
                          sx={{ ml: 'auto', color: 'success.main', fontSize: 18 }}
                        />
                      ) : (
                        <ErrorIcon
                          sx={{ ml: 'auto', color: 'error.main', fontSize: 18 }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Main model for agent interactions and analysis
            </Typography>
          </Grid>

          {/* Verification Model Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={updating}>
              <InputLabel>Verification Model</InputLabel>
              <Select
                value={verificationModel}
                label="Verification Model"
                onChange={(e) => handleModelChange(e.target.value, true)}
              >
                {models.map((model) => (
                  <MenuItem
                    key={model.id}
                    value={model.id}
                    disabled={!model.available}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: '100%',
                      }}
                    >
                      <Typography>{model.name}</Typography>
                      <Chip
                        label={getProviderLabel(model.provider)}
                        size="small"
                        sx={{
                          backgroundColor: getProviderColor(model.provider),
                          color: 'white',
                          height: 20,
                          fontSize: '0.7rem',
                        }}
                      />
                      {model.available ? (
                        <CheckCircleIcon
                          sx={{ ml: 'auto', color: 'success.main', fontSize: 18 }}
                        />
                      ) : (
                        <ErrorIcon
                          sx={{ ml: 'auto', color: 'error.main', fontSize: 18 }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Secondary model for response verification
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Model Status Info */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Model Configuration Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                <Typography variant="caption">Available</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />
                <Typography variant="caption">API Key Missing</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                {models.filter((m) => m.available).length} of {models.length} models
                available
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Models require valid API keys configured in the
            backend. The primary model handles all agent interactions, while the
            verification model can validate responses for accuracy.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};