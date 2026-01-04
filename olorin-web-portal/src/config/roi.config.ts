/**
 * ROI Calculator Configuration
 *
 * Configuration-driven ROI calculations with all values
 * loaded from environment variables.
 */

export interface ROIConfig {
  fraudDetectionRate: number;
  falsePositiveReduction: number;
  timeSavingsPercent: number;
  averageFraudCost: number;
  averageInvestigationCostHourly: number;
  averageInvestigationTimeHours: number;
}

export const getROIConfig = (): ROIConfig => ({
  fraudDetectionRate: parseFloat(process.env.REACT_APP_ROI_FRAUD_DETECTION_RATE || '0.95'),
  falsePositiveReduction: parseFloat(process.env.REACT_APP_ROI_FALSE_POSITIVE_REDUCTION || '0.80'),
  timeSavingsPercent: parseFloat(process.env.REACT_APP_ROI_TIME_SAVINGS_PERCENT || '0.90'),
  averageFraudCost: parseFloat(process.env.REACT_APP_ROI_AVG_FRAUD_COST || '150'),
  averageInvestigationCostHourly: parseFloat(
    process.env.REACT_APP_ROI_AVG_INVESTIGATION_COST_HOURLY || '75'
  ),
  averageInvestigationTimeHours: parseFloat(
    process.env.REACT_APP_ROI_AVG_INVESTIGATION_TIME_HOURS || '2'
  ),
});

export interface ROIInputs {
  annualTransactionVolume: number;
  currentFraudRate: number;
  averageTransactionValue: number;
  currentReviewTeamSize: number;
  currentFalsePositiveRate: number;
}

export interface ROIResults {
  projectedFraudSavings: number;
  operationalCostReduction: number;
  falsePositiveReduction: number;
  timeSavingsHours: number;
  paybackPeriodMonths: number;
  totalAnnualSavings: number;
  roi: number;
}

export const calculateROI = (inputs: ROIInputs, config: ROIConfig): ROIResults => {
  const {
    annualTransactionVolume,
    currentFraudRate,
    averageTransactionValue,
    currentReviewTeamSize,
    currentFalsePositiveRate,
  } = inputs;

  // Calculate current fraud losses
  const currentFraudTransactions = annualTransactionVolume * (currentFraudRate / 100);
  const currentFraudLosses = currentFraudTransactions * averageTransactionValue;

  // Projected fraud savings with Olorin (95% detection rate)
  const detectedFraud = currentFraudLosses * config.fraudDetectionRate;
  const projectedFraudSavings = detectedFraud;

  // False positive reduction savings
  const currentFalsePositives = annualTransactionVolume * (currentFalsePositiveRate / 100);
  const reducedFalsePositives = currentFalsePositives * config.falsePositiveReduction;
  const fpSavingsPerTransaction =
    config.averageInvestigationCostHourly * config.averageInvestigationTimeHours;
  const falsePositiveReductionSavings = reducedFalsePositives * fpSavingsPerTransaction;

  // Operational cost reduction (time savings)
  const hoursPerYear = currentReviewTeamSize * 2080; // 40 hours * 52 weeks
  const timeSavingsHours = hoursPerYear * config.timeSavingsPercent;
  const operationalCostReduction = timeSavingsHours * config.averageInvestigationCostHourly;

  // Total savings
  const totalAnnualSavings =
    projectedFraudSavings + falsePositiveReductionSavings + operationalCostReduction;

  // Estimate annual platform cost (simplified)
  const estimatedPlatformCost = 100000; // Base platform cost
  const roi = ((totalAnnualSavings - estimatedPlatformCost) / estimatedPlatformCost) * 100;
  const paybackPeriodMonths = (estimatedPlatformCost / totalAnnualSavings) * 12;

  return {
    projectedFraudSavings,
    operationalCostReduction,
    falsePositiveReduction: falsePositiveReductionSavings,
    timeSavingsHours,
    paybackPeriodMonths: Math.max(0.5, paybackPeriodMonths),
    totalAnnualSavings,
    roi,
  };
};

export default getROIConfig;
