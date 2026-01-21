/**
 * EntitySelector Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests entity type selector component interface and validation.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EntitySelector } from '../EntitySelector';
import { EntityType } from '@shared/types/entities.types';

describe('EntitySelector Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with required props', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue(EntityType.EMAIL);
    });

    it('should accept all prop types correctly', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.USER_ID}
          onChange={onChange}
          label="Select Entity"
          disabled={false}
          error="Error message"
        />
      );

      expect(screen.getByText('Select Entity')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Prop Validation', () => {
    it('should display all entity types as options', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options).map(opt => opt.value);

      expect(options).toContain(EntityType.USER_ID);
      expect(options).toContain(EntityType.EMAIL);
      expect(options).toContain(EntityType.IP_ADDRESS);
      expect(options).toContain(EntityType.DEVICE_ID);
      expect(options).toContain(EntityType.PHONE_NUMBER);
      expect(options).toContain(EntityType.TRANSACTION_ID);
      expect(options).toContain(EntityType.ACCOUNT_ID);
    });

    it('should call onChange with selected entity type', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: EntityType.IP_ADDRESS } });

      expect(onChange).toHaveBeenCalledWith(EntityType.IP_ADDRESS);
    });

    it('should render optional label', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
          label="Entity Type"
        />
      );

      expect(screen.getByText('Entity Type')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should display error message when error prop provided', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
          error="Please select a valid entity type"
        />
      );

      expect(screen.getByText('Please select a valid entity type')).toBeInTheDocument();
    });

    it('should update value when prop changes', () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe(EntityType.EMAIL);

      rerender(
        <EntitySelector
          value={EntityType.USER_ID}
          onChange={onChange}
        />
      );

      expect(select.value).toBe(EntityType.USER_ID);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
        />
      );

      const select = screen.getByRole('combobox');
      select.focus();
      expect(select).toHaveFocus();

      fireEvent.change(select, { target: { value: EntityType.DEVICE_ID } });
      expect(onChange).toHaveBeenCalledWith(EntityType.DEVICE_ID);
    });

    it('should not be interactive when disabled', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: EntityType.USER_ID } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should associate label with select element', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
          label="Choose Entity"
        />
      );

      const label = screen.getByText('Choose Entity');
      const select = screen.getByRole('combobox');

      expect(label).toBeInTheDocument();
      expect(select).toBeInTheDocument();
    });

    it('should display error icon with error message', () => {
      const onChange = jest.fn();
      const { container } = render(
        <EntitySelector
          value={EntityType.EMAIL}
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
  });

  describe('Type Safety', () => {
    it('should enforce EntityType enum for value', () => {
      const onChange = jest.fn();
      const validTypes: EntityType[] = [
        EntityType.USER_ID,
        EntityType.EMAIL,
        EntityType.IP_ADDRESS,
        EntityType.DEVICE_ID,
        EntityType.PHONE_NUMBER,
        EntityType.TRANSACTION_ID,
        EntityType.ACCOUNT_ID
      ];

      validTypes.forEach((type) => {
        const { unmount } = render(
          <EntitySelector
            value={type}
            onChange={onChange}
          />
        );

        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe(type);
        unmount();
      });
    });

    it('should enforce EntityType enum in onChange callback', () => {
      const onChange = jest.fn((type: EntityType) => {
        expect(Object.values(EntityType)).toContain(type);
      });

      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: EntityType.IP_ADDRESS } });

      expect(onChange).toHaveBeenCalledWith(EntityType.IP_ADDRESS);
    });

    it('should accept optional string props', () => {
      const onChange = jest.fn();
      render(
        <EntitySelector
          value={EntityType.EMAIL}
          onChange={onChange}
          label="Optional Label"
          error="Optional Error"
        />
      );

      expect(screen.getByText('Optional Label')).toBeInTheDocument();
      expect(screen.getByText('Optional Error')).toBeInTheDocument();
    });
  });
});
