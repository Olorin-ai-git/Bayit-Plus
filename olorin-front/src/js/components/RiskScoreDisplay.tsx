import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  useTheme,
} from '@mui/material';
import { InvestigationStep } from '../types/RiskAssessment';
import { InvestigationStepId, StepStatus } from '../constants/definitions';
import { AGENT_COLORS, DEFAULT_AGENT_COLOR } from '../constants/definitions';

interface RiskScoreDisplayProps {
  steps: InvestigationStep[];
}

/**
 * Component to display individual agent risk scores and overall risk score
 * @param {RiskScoreDisplayProps} props - Component props
 * @returns {JSX.Element} The rendered risk score display component
 */
const RiskScoreDisplay: React.FC<RiskScoreDisplayProps> = ({ steps }) => {
  const theme = useTheme();
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{
    title: string;
    content: string;
  } | null>(null);

  // Extract risk assessment step
  const riskStep = steps.find((step) => step.id === InvestigationStepId.RISK);
  const rawOverallRiskScore = riskStep?.details?.risk_score || 0;
  const llmThoughts = riskStep?.details?.llm_thoughts || '';

  // Calculate individual domain scores from steps
  const domainScores = steps
    .filter(
      (step) =>
        step.id !== InvestigationStepId.INIT &&
        step.id !== InvestigationStepId.RISK &&
        step.status === StepStatus.COMPLETED
    )
    .map((step) => {
      const rawScore = step.details?.risk_score || 0;
      // Convert decimal risk scores (0.85) to percentage (85) with 2 decimal places
      const score = rawScore <= 1 ? Math.round(rawScore * 10000) / 100 : Math.round(rawScore * 100) / 100;
      
      return {
        name: step.agent || step.title,
        score: score,
        llmThoughts: step.details?.llm_thoughts || ''
      };
    });

  // Calculate overall risk score - use Risk Assessment Agent score if available, otherwise calculate from individual agents
  let overallRiskScore = 0;
  if (rawOverallRiskScore > 0) {
    // Use Risk Assessment Agent's score
    overallRiskScore = rawOverallRiskScore <= 1 ? Math.round(rawOverallRiskScore * 10000) / 100 : Math.round(rawOverallRiskScore * 100) / 100;
  } else if (domainScores.length > 0) {
    // Calculate average from completed individual agents
    const totalScore = domainScores.reduce((sum, domain) => sum + domain.score, 0);
    overallRiskScore = Math.round((totalScore / domainScores.length) * 100) / 100;
  }

  // Determine risk level based on score
  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'HIGH', color: theme.palette.error.main };
    if (score >= 40) return { label: 'MEDIUM', color: theme.palette.warning.main };
    return { label: 'LOW', color: theme.palette.success.main };
  };

  // Get agent color from constants
  const getAgentColor = (agentName: string) => {
    const tailwindColor = AGENT_COLORS[agentName] || DEFAULT_AGENT_COLOR;
    // Convert Tailwind colors to Material-UI theme colors
    switch (tailwindColor) {
      case 'text-purple-600': return theme.palette.primary.main;
      case 'text-indigo-600': return '#3f51b5'; // indigo
      case 'text-pink-600': return '#e91e63'; // pink
      case 'text-orange-600': return '#ff9800'; // orange
      case 'text-red-600': return theme.palette.error.main;
      case 'text-blue-600': return theme.palette.info.main;
      default: return theme.palette.text.primary;
    }
  };

  const overallRisk = getRiskLevel(overallRiskScore);

  /**
   * Opens the details modal with the given title and content
   * @param {string} title - The title of the details
   * @param {string} content - The content to display
   */
  const openDetailsModal = (title: string, content: string) => {
    setSelectedDetails({ title, content });
    setDetailsModalOpen(true);
  };

  // If there are no domain scores and no overall risk assessment, show loading/placeholder
  if (domainScores.length === 0 && !riskStep) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        mb: 4,
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2
      }}>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
          Risk Assessment Pending...
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Scorecards will appear as each agent completes their analysis
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        mb: 4,
        mx: 'auto'
      }}>
        {/* Overall Risk Score Card - show if we have domain scores or a risk step */}
        {(domainScores.length > 0 || riskStep) && overallRiskScore >= 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Fade in={true} timeout={600}>
              <Card
                sx={{
                  width: 192,
                  textAlign: 'center',
                  cursor: llmThoughts ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  border: `2px solid ${getAgentColor('Risk Assessment Agent')}`,
                  boxShadow: 2,
                  '&:hover': llmThoughts ? {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    borderWidth: '3px'
                  } : {}
                }}
                onClick={() => {
                  if (llmThoughts) {
                    openDetailsModal('AI Risk Assessment Analysis', llmThoughts);
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: getAgentColor('Risk Assessment Agent') }}>
                    Overall Risk Assessment
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: getAgentColor('Risk Assessment Agent'),
                      mb: 1
                    }}
                  >
                    {overallRiskScore}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: getAgentColor('Risk Assessment Agent'),
                      fontWeight: 600,
                      letterSpacing: 0.5
                    }}
                  >
                    {overallRisk.label} RISK
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Box>
        )}

        {/* Domain Scores - show if we have any domain scores */}
        {domainScores.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, position: 'relative' }}>
            {domainScores.map((domain, index) => {
              // const risk = getRiskLevel(domain.score);
              const agentColor = getAgentColor(domain.name);
              return (
                <Fade
                  key={domain.name}
                  in={true}
                  timeout={600}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <Card
                    sx={{
                      width: 192,
                      textAlign: 'center',
                      backgroundColor: 'background.paper',
                      border: `2px solid ${agentColor}`,
                      cursor: domain.llmThoughts ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      '&:hover': domain.llmThoughts ? {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                        borderWidth: '3px'
                      } : {}
                    }}
                    onClick={() => {
                      if (domain.llmThoughts) {
                        openDetailsModal(
                          `${domain.name} Analysis`,
                          domain.llmThoughts,
                        );
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 1,
                            color: agentColor
                          }}
                        >
                          {domain.name}
                        </Typography>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 700,
                            color: agentColor
                          }}
                        >
                          {domain.score}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedDetails && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>
              {selectedDetails.title}
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ whiteSpace: 'pre-line', color: 'text.primary' }}>
                {selectedDetails.content}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setDetailsModalOpen(false)}
                variant="contained"
                color="primary"
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default RiskScoreDisplay;
