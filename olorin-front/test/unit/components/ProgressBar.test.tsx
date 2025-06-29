import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressBar from 'src/js/components/ProgressBar';

describe('ProgressBar', () => {
  const defaultProps = {
    currentStep: 0,
    steps: [{ title: 'Step 1' }, { title: 'Step 2' }, { title: 'Step 3' }],
  };

  it('renders without crashing', () => {
    render(<ProgressBar {...defaultProps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('displays correct number of steps', () => {
    render(<ProgressBar {...defaultProps} />);
    const stepElements = screen.getAllByText(/Step \d/);
    expect(stepElements).toHaveLength(3);
  });

  it('highlights current step', () => {
    render(<ProgressBar {...defaultProps} currentStep={1} />);
    const currentStep = screen.getByText('Step 2').closest('div');
    expect(currentStep).toHaveClass('flex', 'justify-between');
  });

  it('shows step titles', () => {
    render(<ProgressBar {...defaultProps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('handles single step', () => {
    const singleStep = {
      currentStep: 0,
      steps: [{ title: 'Single Step' }],
    };
    render(<ProgressBar {...singleStep} />);
    expect(screen.getByText('Single Step')).toBeInTheDocument();
    expect(screen.getAllByText(/Step/)).toHaveLength(1);
  });

  it('handles empty steps array', () => {
    render(<ProgressBar currentStep={0} steps={[]} />);
    expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
  });

  it('handles long step titles', () => {
    const longTitleStep = {
      currentStep: 0,
      steps: [
        { title: 'This is a very long step title that might need truncation' },
      ],
    };
    render(<ProgressBar {...longTitleStep} />);
    expect(
      screen.getByText(
        'This is a very long step title that might need truncation',
      ),
    ).toBeInTheDocument();
  });

  it('handles special characters in step titles', () => {
    const specialCharStep = {
      currentStep: 0,
      steps: [{ title: 'Step with @#$%^&*()' }],
    };
    render(<ProgressBar {...specialCharStep} />);
    expect(screen.getByText('Step with @#$%^&*()')).toBeInTheDocument();
  });
});
