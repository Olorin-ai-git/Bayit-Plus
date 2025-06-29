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
  const overallRiskScore = riskStep?.details?.risk_score || 0;
  const llmThoughts = riskStep?.details?.llm_thoughts || '';

  // Calculate individual domain scores from steps
  const domainScores = steps
    .filter(
      (step) =>
        step.id !== InvestigationStepId.INIT &&
        step.id !== InvestigationStepId.RISK &&
        step.status === StepStatus.COMPLETED
    )
    .map((step) => ({
      name: step.agent || step.title,
      score: step.details?.risk_score || 0,
      llmThoughts: step.details?.llm_thoughts || ''
    }));

  // Determine risk level based on score
  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'HIGH', color: theme.palette.error.main };
    if (score >= 40) return { label: 'MEDIUM', color: theme.palette.warning.main };
    return { label: 'LOW', color: theme.palette.success.main };
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

  // If there's no risk assessment yet, show loading/placeholder
  if (!riskStep) {
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
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Risk Assessment Pending...
        </Typography>
      </Box>
    );
  }

  // If no risk score is available, show a message
  if (overallRiskScore === 0) {
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
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Risk Assessment Not Available
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
        {/* Overall Risk Score Card */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Fade in={true} timeout={600}>
            <Card
              sx={{
                width: 240,
                textAlign: 'center',
                cursor: llmThoughts ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                '&:hover': llmThoughts ? {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                } : {}
              }}
              onClick={() => {
                if (llmThoughts) {
                  openDetailsModal('AI Risk Assessment Analysis', llmThoughts);
                }
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Overall Risk Score
                </Typography>
                <Typography 
                  variant="h2" 
                  sx={{ 
                    fontWeight: 700, 
                    color: overallRisk.color,
                    mb: 1
                  }}
                >
                  {overallRiskScore}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: overallRisk.color,
                    fontWeight: 600
                  }}
                >
                  {overallRisk.label} RISK
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        </Box>

        {/* Domain Scores */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, position: 'relative' }}>
          {domainScores.map((domain, index) => {
            const risk = getRiskLevel(domain.score);
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
                    cursor: domain.llmThoughts ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    '&:hover': domain.llmThoughts ? {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
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
                          fontWeight: 500, 
                          mb: 1,
                          color: risk.color
                        }}
                      >
                        {domain.name}
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 600,
                          color: risk.color
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
