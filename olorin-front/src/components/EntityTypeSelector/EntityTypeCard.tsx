import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  CheckCircle as SelectedIcon,
  RadioButtonUnchecked as UnselectedIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircleOutline as ValidIcon,
  AccountBalance as FinancialIcon,
  LocationOn as GeographicIcon,
  Schedule as TemporalIcon,
  NetworkCheck as NetworkIcon,
  Code as DataTypeIcon
} from '@mui/icons-material';
import { EntityType } from './EntityTypeSelector';

// Props interface
export interface EntityTypeCardProps {
  entity: EntityType;
  isSelected: boolean;
  onToggle: () => void;
  showDescription?: boolean;
  showValidation?: boolean;
  compact?: boolean;
  showExamples?: boolean;
  showRules?: boolean;
  validationResult?: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
    score?: number;
  };
}

// Risk level color mapping
const getRiskLevelColor = (riskLevel?: string) => {
  switch (riskLevel) {
    case 'critical': return 'error';
    case 'high': return 'warning';
    case 'medium': return 'info';
    case 'low': return 'success';
    default: return 'default';
  }
};

// Data type icon mapping
const getDataTypeIcon = (dataType?: string) => {
  switch (dataType) {
    case 'number': return '123';
    case 'boolean': return 'T/F';
    case 'date': return '📅';
    case 'object': return '{}';
    case 'array': return '[]';
    default: return 'Aa';
  }
};

// Category icon mapping
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'financial':
    case 'payment':
      return <FinancialIcon fontSize="small" color="primary" />;
    case 'security':
    case 'fraud':
      return <SecurityIcon fontSize="small" color="error" />;
    case 'geographic':
    case 'location':
      return <GeographicIcon fontSize="small" color="success" />;
    case 'temporal':
    case 'time':
      return <TemporalIcon fontSize="small" color="warning" />;
    case 'network':
    case 'device':
      return <NetworkIcon fontSize="small" color="info" />;
    default:
      return <DataTypeIcon fontSize="small" color="action" />;
  }
};

export const EntityTypeCard: React.FC<EntityTypeCardProps> = ({
  entity,
  isSelected,
  onToggle,
  showDescription = true,
  showValidation = false,
  compact = false,
  showExamples = false,
  showRules = false,
  validationResult
}) => {
  // State for expanded details
  const [showDetails, setShowDetails] = useState(false);
  
  // Determine validation status
  const hasValidation = showValidation && validationResult;
  const validationStatus = hasValidation ? (
    validationResult.isValid ? 'valid' : 
    validationResult.errors?.length ? 'error' : 
    validationResult.warnings?.length ? 'warning' : 'unknown'
  ) : null;
  
  return (
    <Card
      sx={{
        mb: 1,
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        backgroundColor: isSelected ? 'primary.light' : 'background.paper',
        color: isSelected ? 'primary.contrastText' : 'text.primary',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2
        }
      }}
      onClick={onToggle}
    >
      <CardContent sx={{ pb: compact ? 1 : 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          {/* Left side - Entity info */}
          <Box flex={1} minWidth={0}>
            {/* Header with selection indicator */}
            <Box display="flex" alignItems="center" gap={1} mb={compact ? 0.5 : 1}>
              {/* Selection indicator */}
              <IconButton
                size="small"
                sx={{ 
                  p: 0.5,
                  color: isSelected ? 'inherit' : 'action.active'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
              >
                {isSelected ? <SelectedIcon /> : <UnselectedIcon />}
              </IconButton>
              
              {/* Category icon */}
              <Avatar 
                sx={{ 
                  width: compact ? 24 : 32, 
                  height: compact ? 24 : 32,
                  bgcolor: 'transparent'
                }}
              >
                {getCategoryIcon(entity.category)}
              </Avatar>
              
              {/* Entity name */}
              <Typography 
                variant={compact ? 'body2' : 'h6'} 
                component="div" 
                fontWeight="medium"
                sx={{ 
                  flexGrow: 1,
                  color: 'inherit'
                }}
              >
                {entity.name}
              </Typography>
              
              {/* Required indicator */}
              {entity.isRequired && (
                <Chip 
                  label="Required" 
                  size="small" 
                  color="error" 
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{ 
                    height: compact ? 20 : 24,
                    fontSize: compact ? '0.7rem' : '0.75rem'
                  }}
                />
              )}
            </Box>
            
            {/* Entity value and description */}
            <Box ml={compact ? 4 : 5}>
              <Typography 
                variant="caption" 
                color={isSelected ? 'inherit' : 'textSecondary'}
                fontFamily="monospace"
                sx={{ opacity: isSelected ? 0.8 : 0.7 }}
              >
                {entity.value}
              </Typography>
              
              {showDescription && entity.description && !compact && (
                <Typography 
                  variant="body2" 
                  color={isSelected ? 'inherit' : 'textSecondary'}
                  sx={{ mt: 0.5, opacity: isSelected ? 0.9 : 0.8 }}
                >
                  {entity.description}
                </Typography>
              )}
            </Box>
          </Box>
          
          {/* Right side - Chips and indicators */}
          <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5} ml={2}>
            {/* Data type chip */}
            <Tooltip title={`Data type: ${entity.dataType || 'string'}`}>
              <Chip
                label={getDataTypeIcon(entity.dataType)}
                size="small"
                variant={isSelected ? 'filled' : 'outlined'}
                sx={{ 
                  minWidth: 40,
                  height: compact ? 20 : 24,
                  fontSize: compact ? '0.7rem' : '0.75rem',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent'
                }}
              />
            </Tooltip>
            
            {/* Risk level chip */}
            <Chip
              label={entity.riskLevel || 'low'}
              size="small"
              color={getRiskLevelColor(entity.riskLevel) as any}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={{ 
                height: compact ? 20 : 24,
                fontSize: compact ? '0.7rem' : '0.75rem',
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent'
              }}
            />
            
            {/* Validation indicator */}
            {hasValidation && (
              <Tooltip title={`Validation: ${validationStatus}`}>
                <IconButton size="small" sx={{ p: 0.25 }}>
                  {validationStatus === 'valid' && <ValidIcon fontSize="small" color="success" />}
                  {validationStatus === 'warning' && <WarningIcon fontSize="small" color="warning" />}
                  {validationStatus === 'error' && <ErrorIcon fontSize="small" color="error" />}
                </IconButton>
              </Tooltip>
            )}
            
            {/* Details expand button */}
            {(showExamples || showRules || hasValidation) && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
                sx={{
                  transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: 'inherit'
                }}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        
        {/* Expanded details */}
        <Collapse in={showDetails}>
          <Box mt={2} ml={compact ? 4 : 5}>
            {/* Examples */}
            {showExamples && entity.examples && entity.examples.length > 0 && (
              <Box mb={1}>
                <Typography variant="caption" fontWeight="medium" color="textSecondary">
                  Examples:
                </Typography>
                <Box mt={0.5}>
                  {entity.examples.map((example, index) => (
                    <Chip
                      key={index}
                      label={example}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {/* Validation rules */}
            {showRules && entity.validationRules && entity.validationRules.length > 0 && (
              <Box mb={1}>
                <Typography variant="caption" fontWeight="medium" color="textSecondary">
                  Validation Rules:
                </Typography>
                <List dense sx={{ mt: 0.5 }}>
                  {entity.validationRules.map((rule, index) => (
                    <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                      <ListItemText
                        primary={rule}
                        primaryTypographyProps={{
                          variant: 'caption',
                          color: 'textSecondary'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {/* Validation results */}
            {hasValidation && validationResult && (
              <Box mb={1}>
                <Typography variant="caption" fontWeight="medium" color="textSecondary">
                  Validation Status:
                </Typography>
                
                {validationResult.score !== undefined && (
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Typography variant="caption">Score:</Typography>
                    <Chip
                      label={`${Math.round(validationResult.score * 100)}%`}
                      size="small"
                      color={validationResult.score > 0.8 ? 'success' : validationResult.score > 0.6 ? 'warning' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                )}
                
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                    <Typography variant="caption">
                      {validationResult.errors.join(', ')}
                    </Typography>
                  </Alert>
                )}
                
                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                    <Typography variant="caption">
                      {validationResult.warnings.join(', ')}
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
      
      {/* Card actions for non-compact mode */}
      {!compact && (showExamples || showRules || hasValidation) && (
        <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            }
          >
            {showDetails ? 'Less' : 'More'} Details
          </Button>
        </CardActions>
      )}
    </Card>
  );
};