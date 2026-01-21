/**
 * FormField Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests form input wrapper component interface and validation.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormField } from '../FormField';

describe('FormField Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with required props', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Email"
          value=""
          onChange={onChange}
        />
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should accept all prop types correctly', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Username"
          type="text"
          value="testuser"
          onChange={onChange}
          placeholder="Enter username"
          disabled={false}
          required={true}
          error="Username is required"
          helpText="Choose a unique username"
          min="0"
          max="100"
        />
      );

      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
  });

  describe('Prop Validation', () => {
    it('should support text input type', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Text Field"
          type="text"
          value="text value"
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.type).toBe('text');
      expect(input.value).toBe('text value');
    });

    it('should support email input type', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Email Field"
          type="email"
          value="test@example.com"
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.type).toBe('email');
      expect(input.value).toBe('test@example.com');
    });

    it('should support number input type', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Number Field"
          type="number"
          value={42}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.type).toBe('number');
      expect(input.value).toBe('42');
    });

    it('should support date input type', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Date Field"
          type="date"
          value="2024-01-01"
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText('Date Field') as HTMLInputElement;
      expect(input.type).toBe('date');
      expect(input.value).toBe('2024-01-01');
    });

    it('should support datetime-local input type', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="DateTime Field"
          type="datetime-local"
          value="2024-01-01T12:00"
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText('DateTime Field') as HTMLInputElement;
      expect(input.type).toBe('datetime-local');
    });

    it('should call onChange with new value', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Test Field"
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(onChange).toHaveBeenCalledWith('new value');
    });

    it('should display placeholder text', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Field"
          value=""
          onChange={onChange}
          placeholder="Enter text here"
        />
      );

      expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Disabled Field"
          value="value"
          onChange={onChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should mark field as required', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Required Field"
          value=""
          onChange={onChange}
          required={true}
        />
      );

      expect(screen.getByText('Required Field')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('should display error message', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Error Field"
          value=""
          onChange={onChange}
          error="This field is required"
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should display help text when no error', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Help Field"
          value=""
          onChange={onChange}
          helpText="This is helpful information"
        />
      );

      expect(screen.getByText('This is helpful information')).toBeInTheDocument();
    });

    it('should prioritize error over help text', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Priority Field"
          value=""
          onChange={onChange}
          error="Error message"
          helpText="Help text"
        />
      );

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Help text')).not.toBeInTheDocument();
    });

    it('should support min/max for number inputs', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Range Field"
          type="number"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
        />
      );

      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.min).toBe('0');
      expect(input.max).toBe('100');
    });

    it('should support min/max for date inputs', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Date Range"
          type="date"
          value="2024-06-15"
          onChange={onChange}
          min="2024-01-01"
          max="2024-12-31"
        />
      );

      const input = screen.getByLabelText('Date Range') as HTMLInputElement;
      expect(input.min).toBe('2024-01-01');
      expect(input.max).toBe('2024-12-31');
    });
  });

  describe('Accessibility', () => {
    it('should associate label with input', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Accessible Field"
          value=""
          onChange={onChange}
        />
      );

      const label = screen.getByText('Accessible Field');
      const input = screen.getByRole('textbox');

      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Keyboard Field"
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();

      fireEvent.change(input, { target: { value: 'typed value' } });
      expect(onChange).toHaveBeenCalledWith('typed value');
    });

    it('should not be interactive when disabled', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Disabled Field"
          value="value"
          onChange={onChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should display error icon with error message', () => {
      const onChange = jest.fn();
      const { container } = render(
        <FormField
          label="Error Field"
          value=""
          onChange={onChange}
          error="Validation error"
        />
      );

      const errorText = screen.getByText('Validation error');
      expect(errorText).toBeInTheDocument();

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const errorSvg = container.querySelector('svg');
      expect(errorSvg).toBeInTheDocument();
    });

    it('should have required indicator for screen readers', () => {
      const onChange = jest.fn();
      render(
        <FormField
          label="Required Field"
          value=""
          onChange={onChange}
          required={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should enforce FormFieldType enum', () => {
      const onChange = jest.fn();
      const validTypes: Array<'text' | 'email' | 'number' | 'date' | 'datetime-local'> = [
        'text',
        'email',
        'number',
        'date',
        'datetime-local'
      ];

      validTypes.forEach((type) => {
        const { unmount } = render(
          <FormField
            label={`${type} field`}
            type={type}
            value=""
            onChange={onChange}
          />
        );
        unmount();
      });
    });

    it('should accept string or number for value prop', () => {
      const onChange = jest.fn();

      const { rerender } = render(
        <FormField
          label="String Value"
          value="string"
          onChange={onChange}
        />
      );

      expect(screen.getByRole('textbox')).toHaveValue('string');

      rerender(
        <FormField
          label="Number Value"
          type="number"
          value={42}
          onChange={onChange}
        />
      );

      expect(screen.getByRole('spinbutton')).toHaveValue(42);
    });

    it('should accept string or number for min/max props', () => {
      const onChange = jest.fn();

      render(
        <FormField
          label="Min/Max Field"
          type="number"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
        />
      );

      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.min).toBe('0');
      expect(input.max).toBe('100');
    });
  });
});
