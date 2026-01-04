/**
 * LoadingSpinner Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests loading spinner component interface and variants.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with default props', () => {
      const { container } = render(<LoadingSpinner />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should accept all prop types correctly', () => {
      const { container } = render(
        <LoadingSpinner
          size="lg"
          message="Loading data..."
          centered={true}
        />
      );

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });

  describe('Prop Validation', () => {
    it('should support small size variant', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('should support medium size variant', () => {
      const { container } = render(<LoadingSpinner size="md" />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8');
    });

    it('should support large size variant', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-12', 'h-12');
    });

    it('should support extra large size variant', () => {
      const { container } = render(<LoadingSpinner size="xl" />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-16', 'h-16');
    });

    it('should display message when provided', () => {
      render(<LoadingSpinner message="Please wait..." />);

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('should not display message when not provided', () => {
      const { container } = render(<LoadingSpinner />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const messageSpan = container.querySelector('span');
      expect(messageSpan).not.toBeInTheDocument();
    });

    it('should center spinner when centered is true', () => {
      const { container } = render(<LoadingSpinner centered={true} />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const centerDiv = container.querySelector('.min-h-screen');
      expect(centerDiv).toBeInTheDocument();
      expect(centerDiv).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should not center spinner when centered is false', () => {
      const { container } = render(<LoadingSpinner centered={false} />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const centerDiv = container.querySelector('.min-h-screen');
      expect(centerDiv).not.toBeInTheDocument();
    });

    it('should have spinning animation', () => {
      const { container } = render(<LoadingSpinner />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('should have pulsing animation for message', () => {
      render(<LoadingSpinner message="Loading..." />);

      const message = screen.getByText('Loading...');
      expect(message).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have proper SVG structure', () => {
      const { container } = render(<LoadingSpinner />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // eslint-disable-next-line testing-library/no-node-access
      const circle = svg?.querySelector('circle');
      expect(circle).toBeInTheDocument();

      // eslint-disable-next-line testing-library/no-node-access
      const path = svg?.querySelector('path');
      expect(path).toBeInTheDocument();
    });

    it('should use corporate accent color', () => {
      const { container } = render(<LoadingSpinner />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-corporate-accentPrimary');
    });

    it('should have appropriate text color for message', () => {
      render(<LoadingSpinner message="Loading..." />);

      const message = screen.getByText('Loading...');
      expect(message).toHaveClass('text-corporate-textSecondary');
    });

    it('should maintain aspect ratio', () => {
      const { container } = render(<LoadingSpinner size="md" />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8');
    });

    it('should be visible and not hidden', () => {
      const { container } = render(<LoadingSpinner />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toBeVisible();
    });
  });

  describe('Type Safety', () => {
    it('should enforce LoadingSpinnerSize type', () => {
      const validSizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];

      validSizes.forEach((size) => {
        const { unmount, container } = render(<LoadingSpinner size={size} />);
        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        unmount();
      });
    });

    it('should accept optional string for message', () => {
      const messages = [
        'Loading...',
        'Please wait',
        'Fetching data',
        'Processing...'
      ];

      messages.forEach((message) => {
        const { unmount } = render(<LoadingSpinner message={message} />);
        expect(screen.getByText(message)).toBeInTheDocument();
        unmount();
      });
    });

    it('should enforce boolean type for centered', () => {
      const { rerender, container } = render(<LoadingSpinner centered={true} />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      let centerDiv = container.querySelector('.min-h-screen');
      expect(centerDiv).toBeInTheDocument();

      rerender(<LoadingSpinner centered={false} />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      centerDiv = container.querySelector('.min-h-screen');
      expect(centerDiv).not.toBeInTheDocument();
    });

    it('should have proper default values', () => {
      const { container } = render(<LoadingSpinner />);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8'); // Default size is 'md'

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const centerDiv = container.querySelector('.min-h-screen');
      expect(centerDiv).not.toBeInTheDocument(); // Default centered is false
    });
  });

  describe('Integration', () => {
    it('should work with all props combined', () => {
      const { container } = render(
        <LoadingSpinner
          size="lg"
          message="Loading investigation data..."
          centered={true}
        />
      );

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-12', 'h-12');
      expect(svg).toHaveClass('animate-spin');

      const message = screen.getByText('Loading investigation data...');
      expect(message).toBeInTheDocument();
      expect(message).toHaveClass('animate-pulse');

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const centerDiv = container.querySelector('.min-h-screen');
      expect(centerDiv).toBeInTheDocument();
    });

    it('should maintain consistent styling across sizes', () => {
      const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];

      sizes.forEach((size) => {
        const { unmount, container } = render(<LoadingSpinner size={size} />);

        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
        expect(svg).toHaveClass('animate-spin');
        expect(svg).toHaveClass('text-corporate-accentPrimary');

        unmount();
      });
    });
  });
});
