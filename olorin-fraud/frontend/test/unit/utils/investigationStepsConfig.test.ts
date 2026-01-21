import {
  allPossibleSteps,
  defaultSelectedInvestigationSteps,
  createStep,
} from '../../../src/js/utils/investigationStepsConfig';
import {
  InvestigationStepId,
  StepStatus,
} from '../../../src/js/types/RiskAssessment';

describe('investigationStepsConfig', () => {
  it('allPossibleSteps contains all expected steps', () => {
    expect(allPossibleSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: InvestigationStepId.NETWORK }),
        expect.objectContaining({ id: InvestigationStepId.LOCATION }),
        expect.objectContaining({ id: InvestigationStepId.DEVICE }),
        expect.objectContaining({ id: InvestigationStepId.LOG }),
      ]),
    );
  });

  it('defaultSelectedInvestigationSteps contains INIT and RISK', () => {
    expect(defaultSelectedInvestigationSteps[0].id).toBe(
      InvestigationStepId.INIT,
    );
    expect(
      defaultSelectedInvestigationSteps[
        defaultSelectedInvestigationSteps.length - 1
      ].id,
    ).toBe(InvestigationStepId.RISK);
  });

  it('createStep creates a step with correct params', () => {
    const params = {
      id: InvestigationStepId.NETWORK,
      agent: 'Network Agent',
      title: 'Network',
      description: 'desc',
    };
    const step = createStep(params, StepStatus.COMPLETED, { foo: 'bar' });
    expect(step).toMatchObject({
      ...params,
      status: StepStatus.COMPLETED,
      details: { foo: 'bar' },
    });
    expect(typeof step.timestamp).toBe('string');
  });
});

describe('investigationStepsConfig additional coverage', () => {
  it('createStep uses default status and details', () => {
    const params = {
      id: InvestigationStepId.DEVICE,
      agent: 'Device Agent',
      title: 'Device',
      description: 'desc',
    };
    const step = createStep(params);
    expect(step.status).toBe(StepStatus.PENDING);
    expect(step.details).toEqual({});
  });

  it('allPossibleSteps have required fields', () => {
    allPossibleSteps.forEach((step) => {
      expect(step).toHaveProperty('id');
      expect(step).toHaveProperty('agent');
      expect(step).toHaveProperty('title');
      expect(step).toHaveProperty('description');
      expect(step).toHaveProperty('status');
      expect(step).toHaveProperty('details');
      expect(step).toHaveProperty('timestamp');
    });
  });

  it('defaultSelectedInvestigationSteps includes all allPossibleSteps', () => {
    allPossibleSteps.forEach((step) => {
      expect(defaultSelectedInvestigationSteps).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: step.id })]),
      );
    });
  });

  it('createStep handles empty details', () => {
    const params = {
      id: InvestigationStepId.LOG,
      agent: 'Log Agent',
      title: 'Log',
      description: 'desc',
    };
    const step = createStep(params, StepStatus.COMPLETED);
    expect(step.details).toEqual({});
  });
});
