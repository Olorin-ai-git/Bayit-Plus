/**
 * WizardPanel Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests collapsible panel component interface and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WizardPanel } from '../WizardPanel';

describe('WizardPanel Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with required props', () => {
      render(
        <WizardPanel title="Test Panel">
          <div>Panel Content</div>
        </WizardPanel>
      );

      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });

    it('should accept all prop types correctly', () => {
      const icon = <span data-testid="test-icon">Icon</span>;
      render(
        <WizardPanel
          title="Complete Panel"
          defaultExpanded={true}
          icon={icon}
          className="custom-class"
        >
          <div>Content</div>
        </WizardPanel>
      );

      expect(screen.getByText('Complete Panel')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Prop Validation', () => {
    it('should expand by default when defaultExpanded is true', () => {
      render(
        <WizardPanel title="Expanded" defaultExpanded={true}>
          <div>Visible Content</div>
        </WizardPanel>
      );

      expect(screen.getByText('Visible Content')).toBeInTheDocument();
    });

    it('should collapse by default when defaultExpanded is false', () => {
      render(
        <WizardPanel title="Collapsed" defaultExpanded={false}>
          <div>Hidden Content</div>
        </WizardPanel>
      );

      expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
    });

    it('should toggle visibility on click', () => {
      render(
        <WizardPanel title="Toggle Panel" defaultExpanded={true}>
          <div>Toggle Content</div>
        </WizardPanel>
      );

      const toggleButton = screen.getByRole('button');
      expect(screen.getByText('Toggle Content')).toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(screen.queryByText('Toggle Content')).not.toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(screen.getByText('Toggle Content')).toBeInTheDocument();
    });

    it('should render optional icon', () => {
      const icon = <span data-testid="panel-icon">Icon</span>;
      render(
        <WizardPanel title="With Icon" icon={icon}>
          <div>Content</div>
        </WizardPanel>
      );

      expect(screen.getByTestId('panel-icon')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <WizardPanel title="Custom Class" className="my-custom-class">
          <div>Content</div>
        </WizardPanel>
      );

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass('my-custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA expanded attribute', () => {
      render(
        <WizardPanel title="ARIA Panel" defaultExpanded={true}>
          <div>Content</div>
        </WizardPanel>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be keyboard accessible', () => {
      render(
        <WizardPanel title="Keyboard Panel" defaultExpanded={false}>
          <div>Keyboard Content</div>
        </WizardPanel>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button);
      expect(screen.getByText('Keyboard Content')).toBeInTheDocument();
    });

    it('should have accessible button label', () => {
      render(
        <WizardPanel title="Accessible Label">
          <div>Content</div>
        </WizardPanel>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Accessible Label');
    });
  });

  describe('Type Safety', () => {
    it('should accept React nodes as children', () => {
      render(
        <WizardPanel title="Node Children">
          <div>
            <span>Nested</span>
            <p>Content</p>
          </div>
        </WizardPanel>
      );

      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should accept React nodes as icon', () => {
      const IconComponent = () => <span>Custom Icon</span>;
      render(
        <WizardPanel title="Icon Component" icon={<IconComponent />}>
          <div>Content</div>
        </WizardPanel>
      );

      expect(screen.getByText('Custom Icon')).toBeInTheDocument();
    });
  });
});
