/**
 * WizardButton Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests component interface, props validation, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WizardButton } from '../WizardButton';

describe('WizardButton Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with required props', () => {
      render(<WizardButton>Click Me</WizardButton>);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should accept all prop types correctly', () => {
      const onClick = jest.fn();
      render(
        <WizardButton
          variant="primary"
          size="md"
          onClick={onClick}
          disabled={false}
          loading={false}
          fullWidth={false}
          type="button"
          className="custom-class"
        >
          Button Text
        </WizardButton>
      );

      const button = screen.getByText('Button Text');
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Prop Validation', () => {
    it('should support primary variant', () => {
      render(<WizardButton variant="primary">Primary</WizardButton>);
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('should support secondary variant', () => {
      render(<WizardButton variant="secondary">Secondary</WizardButton>);
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('should support all size variants', () => {
      const { rerender } = render(<WizardButton size="sm">Small</WizardButton>);
      expect(screen.getByText('Small')).toBeInTheDocument();

      rerender(<WizardButton size="md">Medium</WizardButton>);
      expect(screen.getByText('Medium')).toBeInTheDocument();

      rerender(<WizardButton size="lg">Large</WizardButton>);
      expect(screen.getByText('Large')).toBeInTheDocument();
    });

    it('should disable button when disabled prop is true', () => {
      render(<WizardButton disabled>Disabled</WizardButton>);
      const button = screen.getByText('Disabled');
      expect(button).toBeDisabled();
    });

    it('should show loading state', () => {
      render(<WizardButton loading>Loading</WizardButton>);
      const button = screen.getByText('Loading');
      expect(button).toBeDisabled();
    });

    it('should support fullWidth prop', () => {
      render(<WizardButton fullWidth>Full Width</WizardButton>);
      expect(screen.getByText('Full Width')).toBeInTheDocument();
    });

    it('should support button types', () => {
      const { rerender } = render(<WizardButton type="button">Button</WizardButton>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');

      rerender(<WizardButton type="submit">Submit</WizardButton>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

      rerender(<WizardButton type="reset">Reset</WizardButton>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const onClick = jest.fn();
      render(<WizardButton onClick={onClick}>Accessible</WizardButton>);

      const button = screen.getByText('Accessible');
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
    });

    it('should not be clickable when disabled', () => {
      const onClick = jest.fn();
      render(<WizardButton disabled onClick={onClick}>Disabled</WizardButton>);

      const button = screen.getByText('Disabled');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should not be clickable when loading', () => {
      const onClick = jest.fn();
      render(<WizardButton loading onClick={onClick}>Loading</WizardButton>);

      const button = screen.getByText('Loading');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should have proper ARIA attributes when disabled', () => {
      render(<WizardButton disabled>Disabled Button</WizardButton>);
      const button = screen.getByText('Disabled Button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Type Safety', () => {
    it('should enforce WizardButtonVariant type', () => {
      // TypeScript compile-time check - these should not cause errors
      const validVariants: Array<'primary' | 'secondary'> = ['primary', 'secondary'];

      validVariants.forEach((variant) => {
        render(<WizardButton variant={variant}>{variant}</WizardButton>);
        expect(screen.getByText(variant)).toBeInTheDocument();
      });
    });

    it('should enforce WizardButtonSize type', () => {
      // TypeScript compile-time check
      const validSizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

      validSizes.forEach((size) => {
        render(<WizardButton size={size}>{size}</WizardButton>);
        expect(screen.getByText(size)).toBeInTheDocument();
      });
    });
  });
});
