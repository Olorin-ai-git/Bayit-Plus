import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  Upload as ImportIcon
} from '@mui/icons-material';
import { 
  EntityTypeSelector, 
  EntityType, 
  EntityCategory 
} from '../../components/EntityTypeSelector';

// Mock data for demonstration
const mockEntityTypes: EntityType[] = [
  // Financial entities
  {
    id: 'amount',
    name: 'Transaction Amount',
    value: 'amount',
    description: 'The monetary value of the transaction',
    category: 'Financial',
    subcategory: 'Transaction Data',
    examples: ['100.50', '2500.00', '15.99'],
    validationRules: ['Must be positive number', 'Max 2 decimal places', 'Currency precision validation'],
    riskLevel: 'medium',
    isRequired: true,
    dataType: 'number'
  },
  {
    id: 'currency',
    name: 'Currency Code',
    value: 'currency_code',
    description: 'ISO 4217 currency code for the transaction',
    category: 'Financial',
    subcategory: 'Transaction Data',
    examples: ['USD', 'EUR', 'GBP', 'JPY'],
    validationRules: ['Must be valid ISO 4217 code', 'Exactly 3 characters', 'Uppercase only'],
    riskLevel: 'low',
    isRequired: true,
    dataType: 'string'
  },
  {
    id: 'payment_method',
    name: 'Payment Method',
    value: 'payment_method',
    description: 'The method used for payment processing',
    category: 'Financial',
    subcategory: 'Payment Processing',
    examples: ['credit_card', 'paypal', 'bank_transfer', 'cryptocurrency'],
    validationRules: ['Must be from approved list', 'Lowercase with underscores'],
    riskLevel: 'high',
    isRequired: true,
    dataType: 'string'
  },
  {
    id: 'card_bin',
    name: 'Card BIN',
    value: 'card_bin',
    description: 'Bank Identification Number for credit/debit cards',
    category: 'Financial',
    subcategory: 'Payment Processing',
    examples: ['411111', '542418', '378282'],
    validationRules: ['Exactly 6 digits', 'Must be valid BIN', 'Luhn algorithm check'],
    riskLevel: 'high',
    isRequired: false,
    dataType: 'string'
  },
  
  // Security entities
  {
    id: 'email',
    name: 'Email Address',
    value: 'email',
    description: 'User email address for identification and communication',
    category: 'Security',
    subcategory: 'User Identity',
    examples: ['user@example.com', 'test.email@domain.co.uk'],
    validationRules: ['Valid email format', 'Domain validation', 'No temporary domains'],
    riskLevel: 'medium',
    isRequired: true,
    dataType: 'string'
  },
  {
    id: 'ip',
    name: 'IP Address',
    value: 'ip',
    description: 'Client IP address for geolocation and security analysis',
    category: 'Security',
    subcategory: 'Network Analysis',
    examples: ['192.168.1.1', '203.0.113.42', '2001:db8::1'],
    validationRules: ['Valid IPv4 or IPv6', 'Not private range', 'Not blacklisted'],
    riskLevel: 'high',
    isRequired: true,
    dataType: 'string'
  },
  {
    id: 'device_fingerprint',
    name: 'Device Fingerprint',
    value: 'device_fingerprint',
    description: 'Unique device identifier for fraud detection',
    category: 'Security',
    subcategory: 'Device Analysis',
    examples: ['fp_a1b2c3d4e5f6', 'dev_abc123def456'],
    validationRules: ['Minimum 16 characters', 'Alphanumeric only', 'No repetitive patterns'],
    riskLevel: 'critical',
    isRequired: false,
    dataType: 'string'
  },
  
  // Geographic entities
  {
    id: 'country_code',
    name: 'Country Code',
    value: 'country_code',
    description: 'ISO 3166-1 alpha-2 country code',
    category: 'Geographic',
    subcategory: 'Location Data',
    examples: ['US', 'GB', 'DE', 'CA'],
    validationRules: ['Valid ISO 3166-1 code', 'Exactly 2 characters', 'Uppercase only'],
    riskLevel: 'medium',
    isRequired: true,
    dataType: 'string'
  },
  {
    id: 'postal_code',
    name: 'Postal Code',
    value: 'postal_code',
    description: 'Postal or ZIP code for address validation',
    category: 'Geographic',
    subcategory: 'Location Data',
    examples: ['10001', 'SW1A 1AA', 'K1A 0A6'],
    validationRules: ['Country-specific format', 'Valid for region', 'Length validation'],
    riskLevel: 'low',
    isRequired: false,
    dataType: 'string'
  },
  {
    id: 'latitude',
    name: 'Latitude',
    value: 'latitude',
    description: 'Geographic latitude coordinate',
    category: 'Geographic',
    subcategory: 'Coordinates',
    examples: ['40.7128', '-34.6037', '51.5074'],
    validationRules: ['Range: -90 to 90', 'Max 6 decimal places', 'Numeric format'],
    riskLevel: 'low',
    isRequired: false,
    dataType: 'number'
  },
  
  // Temporal entities
  {
    id: 'timestamp',
    name: 'Transaction Timestamp',
    value: 'timestamp',
    description: 'Timestamp when the transaction occurred',
    category: 'Temporal',
    subcategory: 'Transaction Events',
    examples: ['2023-09-06T14:30:00Z', '1693998600000', '2023-09-06 14:30:00'],
    validationRules: ['Valid ISO 8601 format', 'Not future date', 'Reasonable range'],
    riskLevel: 'low',
    isRequired: true,
    dataType: 'date'
  },
  {
    id: 'created_at',
    name: 'Record Created',
    value: 'created_at',
    description: 'When the record was created in the system',
    category: 'Temporal',
    subcategory: 'System Events',
    examples: ['2023-09-06T14:30:00.123Z'],
    validationRules: ['Auto-generated', 'UTC timezone', 'Millisecond precision'],
    riskLevel: 'low',
    isRequired: true,
    dataType: 'date'
  },
  
  // Network entities
  {
    id: 'user_agent',
    name: 'User Agent',
    value: 'user_agent',
    description: 'Browser user agent string for device identification',
    category: 'Network',
    subcategory: 'Browser Data',
    examples: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
    validationRules: ['Not empty', 'No script tags', 'Reasonable length'],
    riskLevel: 'medium',
    isRequired: false,
    dataType: 'string'
  },
  {
    id: 'session_id',
    name: 'Session ID',
    value: 'session_id',
    description: 'Unique session identifier for user activity tracking',
    category: 'Network',
    subcategory: 'Session Management',
    examples: ['sess_a1b2c3d4e5f6g7h8', 'session_123456789'],
    validationRules: ['Minimum 16 characters', 'Unique per session', 'Alphanumeric'],
    riskLevel: 'medium',
    isRequired: true,
    dataType: 'string'
  }
];

// Mock categories
const mockCategories: EntityCategory[] = [
  {
    id: 'Financial',
    name: 'Financial',
    description: 'Financial and payment-related entities',
    count: 4,
    color: '#1976d2',
    icon: '💰'
  },
  {
    id: 'Security',
    name: 'Security',
    description: 'Security and fraud detection entities',
    count: 3,
    color: '#d32f2f',
    icon: '🔒'
  },
  {
    id: 'Geographic',
    name: 'Geographic',
    description: 'Location and geographic entities',
    count: 3,
    color: '#2e7d32',
    icon: '🌍'
  },
  {
    id: 'Temporal',
    name: 'Temporal',
    description: 'Time and date-related entities',
    count: 2,
    color: '#ed6c02',
    icon: '⏰'
  },
  {
    id: 'Network',
    name: 'Network',
    description: 'Network and session entities',
    count: 2,
    color: '#0288d1',
    icon: '🌐'
  }
];

export const EntityTypeDemo: React.FC = () => {
  // State
  const [selectedEntities, setSelectedEntities] = useState<EntityType[]>([]);
  const [validationEnabled, setValidationEnabled] = useState(true);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  
  // Handle entity selection changes
  const handleSelectionChange = (entities: EntityType[]) => {
    setSelectedEntities(entities);
    
    // Mock validation results
    if (validationEnabled) {
      const results: Record<string, any> = {};
      entities.forEach(entity => {
        results[entity.id] = {
          isValid: Math.random() > 0.3,
          errors: Math.random() > 0.7 ? [`Invalid ${entity.name.toLowerCase()} format`] : [],
          warnings: Math.random() > 0.5 ? [`${entity.name} needs verification`] : [],
          score: Math.random() * 0.4 + 0.6 // 0.6 to 1.0
        };
      });
      setValidationResults(results);
    }
  };
  
  // Export selected entities
  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      selectedEntities: selectedEntities.map(e => ({
        id: e.id,
        name: e.name,
        value: e.value,
        category: e.category,
        riskLevel: e.riskLevel,
        isRequired: e.isRequired
      })),
      totalSelected: selectedEntities.length,
      categoryCounts: selectedEntities.reduce((acc, entity) => {
        acc[entity.category] = (acc[entity.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entity-selection-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Calculate statistics
  const stats = {
    totalEntities: mockEntityTypes.length,
    selectedCount: selectedEntities.length,
    categoryBreakdown: selectedEntities.reduce((acc, entity) => {
      acc[entity.category] = (acc[entity.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    riskBreakdown: selectedEntities.reduce((acc, entity) => {
      acc[entity.riskLevel || 'low'] = (acc[entity.riskLevel || 'low'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    requiredFields: selectedEntities.filter(e => e.isRequired).length
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Entity Type Selector Demo
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Interactive demonstration of the comprehensive entity type selector with search, 
          autocomplete, filtering, and validation capabilities.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          This demo showcases the entity selector with {mockEntityTypes.length} sample entity types 
          across {mockCategories.length} categories. Try searching, filtering, and selecting entities 
          to see the advanced functionality in action.
        </Alert>
      </Box>
      
      <Grid container spacing={3}>
        {/* Main Entity Selector */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 700 }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <EntityTypeSelector
                entities={mockEntityTypes}
                selectedEntities={selectedEntities}
                onSelectionChange={handleSelectionChange}
                searchEnabled={true}
                autocompleteEnabled={true}
                categoryFilterEnabled={true}
                multiSelectEnabled={true}
                maxDisplayItems={50}
                enableVirtualization={true}
                showDescriptions={true}
                showCategories={true}
                searchPlaceholder="Search 300+ entity types..."
                allowCustomEntities={false}
                validationEnabled={validationEnabled}
                onValidationChange={setValidationResults}
              />
            </CardContent>
          </Card>
        </Grid>
        
        {/* Statistics and Controls Sidebar */}
        <Grid item xs={12} lg={4}>
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Controls */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Controls
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setSelectedEntities([]);
                      setValidationResults({});
                    }}
                    variant="outlined"
                    fullWidth
                  >
                    Clear Selection
                  </Button>
                  
                  <Button
                    startIcon={<ExportIcon />}
                    onClick={handleExport}
                    variant="contained"
                    fullWidth
                    disabled={selectedEntities.length === 0}
                  >
                    Export Selected
                  </Button>
                </Box>
              </CardContent>
            </Card>
            
            {/* Statistics */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selection Statistics
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography variant="body2">
                    <strong>Selected:</strong> {stats.selectedCount} of {stats.totalEntities}
                  </Typography>
                  
                  <Typography variant="body2">
                    <strong>Required Fields:</strong> {stats.requiredFields}
                  </Typography>
                  
                  {Object.keys(stats.categoryBreakdown).length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" fontWeight="bold">
                        By Category:
                      </Typography>
                      {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                        <Box key={category} display="flex" justifyContent="space-between" ml={1}>
                          <Typography variant="caption">{category}:</Typography>
                          <Typography variant="caption">{count}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  
                  {Object.keys(stats.riskBreakdown).length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" fontWeight="bold">
                        By Risk Level:
                      </Typography>
                      {Object.entries(stats.riskBreakdown).map(([risk, count]) => (
                        <Box key={risk} display="flex" justifyContent="space-between" ml={1}>
                          <Chip 
                            label={risk} 
                            size="small" 
                            color={
                              risk === 'critical' ? 'error' :
                              risk === 'high' ? 'warning' :
                              risk === 'medium' ? 'info' : 'success'
                            }
                          />
                          <Typography variant="caption">{count}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
            
            {/* Validation Results */}
            {validationEnabled && Object.keys(validationResults).length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Validation Results
                  </Typography>
                  
                  <List dense>
                    {Object.entries(validationResults).map(([entityId, result]) => {
                      const entity = selectedEntities.find(e => e.id === entityId);
                      if (!entity) return null;
                      
                      return (
                        <ListItem key={entityId}>
                          <ListItemText
                            primary={entity.name}
                            secondary={
                              <Box>
                                <Chip
                                  label={result.isValid ? 'Valid' : 'Invalid'}
                                  size="small"
                                  color={result.isValid ? 'success' : 'error'}
                                  sx={{ mr: 1 }}
                                />
                                {result.score && (
                                  <Chip
                                    label={`${Math.round(result.score * 100)}%`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
      
      {/* Feature Overview */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Feature Overview
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">🔍 Search & Autocomplete</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    Advanced search functionality with fuzzy matching, autocomplete suggestions, 
                    and search history. Supports searching across entity names, descriptions, 
                    categories, and values.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Features:</strong> Real-time suggestions, search statistics, 
                    popular searches, recent history, and highlighted matches.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">📁 Category Filtering</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    Hierarchical category tree with expandable subcategories, 
                    entity counts, and visual organization. Filter entities by category 
                    or browse the complete taxonomy.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Features:</strong> Category icons, entity counts, 
                    expandable tree structure, and category statistics.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">⚡ Virtual Scrolling</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    High-performance virtual scrolling handles large datasets efficiently. 
                    Renders only visible items for smooth scrolling with thousands of entities.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Features:</strong> Optimized rendering, smooth scrolling, 
                    configurable item heights, and infinite scroll support.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">✅ Advanced Validation</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    Real-time validation with comprehensive rule checking, 
                    security analysis, and detailed error reporting. Integrates with 
                    the backend validation framework.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Features:</strong> Rule validation, security checks, 
                    risk assessment, and detailed error messages.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};