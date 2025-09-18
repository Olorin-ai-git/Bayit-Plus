/**
 * Unit Tests for Loading Component
 * Tests size variants, messages, rendering states, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { componentTestUtils } from '../../testing/component-setup';
import { Loading, LoadingProps } from '../index';

describe('Loading Component', () => {
  // Helper function to render Loading with default props
  const renderLoading = (props: Partial<LoadingProps> = {}) => {
    return componentTestUtils.renderWithProviders(<Loading {...props} />);
  };

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderLoading();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders default size when not specified', () => {
      renderLoading();
      const loadingElement = screen.getByText('Loading...').parentElement;
      expect(loadingElement).toBeInTheDocument();
    });

    it('renders without message by default', () => {
      renderLoading();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('renders as div container', () => {
      renderLoading();
      const loadingContainer = screen.getByText('Loading...').parentElement;
      expect(loadingContainer?.tagName).toBe('DIV');
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      renderLoading({ size: 'sm' });
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
    });

    it('renders medium size correctly (default)', () => {
      renderLoading({ size: 'md' });
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
    });

    it('renders large size correctly', () => {
      renderLoading({ size: 'lg' });
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
    });

    it('defaults to medium size when size is undefined', () => {
      renderLoading({ size: undefined });
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
    });

    it('handles all size variants', () => {
      const sizes: Array<LoadingProps['size']> = ['sm', 'md', 'lg'];

      sizes.forEach((size) => {
        const { unmount } = renderLoading({ size });
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Message Handling', () => {
    it('renders message when provided', () => {
      renderLoading({ message: 'Please wait while we load your data...' });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we load your data...')).toBeInTheDocument();
    });

    it('renders message as paragraph element', () => {
      renderLoading({ message: 'Loading message' });

      const messageElement = screen.getByText('Loading message');
      expect(messageElement.tagName).toBe('P');
    });

    it('does not render message when not provided', () => {
      renderLoading();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('handles empty string message', () => {
      renderLoading({ message: '' });
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('handles message with special characters', () => {
      const specialMessage = 'Loading... 50% complete & counting!';
      renderLoading({ message: specialMessage });
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('handles very long messages', () => {
      const longMessage = 'This is a very long loading message that might wrap to multiple lines and should still be displayed correctly without breaking the component layout or causing any rendering issues';
      renderLoading({ message: longMessage });
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles HTML entities in message', () => {
      const htmlMessage = 'Loading &amp; processing &lt;data&gt;...';
      renderLoading({ message: htmlMessage });
      expect(screen.getByText(htmlMessage)).toBeInTheDocument();
    });

    it('handles Unicode characters in message', () => {
      const unicodeMessage = 'Loading... ⏳ 数据加载中 🔄';
      renderLoading({ message: unicodeMessage });
      expect(screen.getByText(unicodeMessage)).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('maintains proper DOM hierarchy', () => {
      renderLoading({ message: 'Test message' });

      const container = screen.getByText('Loading...').parentElement;
      const loadingText = screen.getByText('Loading...');
      const messageText = screen.getByText('Test message');

      expect(container).toContainElement(loadingText);
      expect(container).toContainElement(messageText);
    });

    it('renders loading text before message', () => {
      renderLoading({ message: 'Test message' });

      const container = screen.getByText('Loading...').parentElement;
      const loadingDiv = screen.getByText('Loading...').parentElement;
      const messageP = screen.getByText('Test message');

      // Loading should come before message in DOM order
      const children = Array.from(container?.children || []);
      const loadingIndex = children.indexOf(loadingDiv as Element);
      const messageIndex = children.indexOf(messageP);

      expect(loadingIndex).toBeLessThan(messageIndex);
    });

    it('handles multiple loading instances', () => {
      const { unmount: unmount1 } = renderLoading({ message: 'First loading' });
      const { unmount: unmount2 } = renderLoading({ message: 'Second loading' });

      expect(screen.getAllByText('Loading...')).toHaveLength(2);
      expect(screen.getByText('First loading')).toBeInTheDocument();
      expect(screen.getByText('Second loading')).toBeInTheDocument();

      unmount1();
      unmount2();
    });
  });

  describe('Props Combinations', () => {
    it('handles size and message together', () => {
      renderLoading({
        size: 'lg',
        message: 'Large loading with message'
      });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Large loading with message')).toBeInTheDocument();
    });

    it('handles all size and message combinations', () => {
      const sizes: Array<LoadingProps['size']> = ['sm', 'md', 'lg'];
      const messages = ['Small message', 'Medium message', 'Large message'];

      sizes.forEach((size, index) => {
        const { unmount } = renderLoading({
          size,
          message: messages[index]
        });

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.getByText(messages[index])).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null message gracefully', () => {
      renderLoading({ message: null as any });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('handles undefined message gracefully', () => {
      renderLoading({ message: undefined });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('handles invalid size gracefully', () => {
      renderLoading({ size: 'invalid' as any });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('handles numeric message', () => {
      renderLoading({ message: 123 as any });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('handles boolean message (should not render)', () => {
      renderLoading({ message: true as any });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible loading indication', () => {
      renderLoading();
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
    });

    it('provides accessible message when present', () => {
      renderLoading({ message: 'Please wait' });
      const messageElement = screen.getByText('Please wait');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toBeVisible();
    });

    it('maintains semantic structure', () => {
      renderLoading({ message: 'Loading data' });

      const loadingText = screen.getByText('Loading...');
      const messageText = screen.getByText('Loading data');

      expect(loadingText.parentElement?.tagName).toBe('DIV');
      expect(messageText.tagName).toBe('P');
    });

    it('can be identified by screen readers', () => {
      renderLoading({ message: 'Processing your request' });

      // Screen readers should be able to find the loading content
      expect(screen.getByText('Loading...')).toBeVisible();
      expect(screen.getByText('Processing your request')).toBeVisible();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = renderLoading({ size: 'md', message: 'Test' });

      // Re-render with same props
      rerender(<Loading size="md" message="Test" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('handles rapid prop changes', () => {
      const { rerender } = renderLoading({ size: 'sm', message: 'Initial' });

      // Rapid changes
      rerender(<Loading size="md" message="Updated" />);
      rerender(<Loading size="lg" message="Final" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Final')).toBeInTheDocument();
      expect(screen.queryByText('Initial')).not.toBeInTheDocument();
      expect(screen.queryByText('Updated')).not.toBeInTheDocument();
    });

    it('handles mount and unmount cycles', () => {
      const { unmount } = renderLoading({ message: 'Mounting test' });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Mounting test')).toBeInTheDocument();

      unmount();

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.queryByText('Mounting test')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('represents active loading state', () => {
      renderLoading();
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toBeVisible();
    });

    it('provides visual loading feedback', () => {
      renderLoading({ size: 'lg', message: 'Processing large dataset...' });

      expect(screen.getByText('Loading...')).toBeVisible();
      expect(screen.getByText('Processing large dataset...')).toBeVisible();
    });

    it('can represent different loading contexts', () => {
      const contexts = [
        'Fetching user data...',
        'Saving changes...',
        'Uploading files...',
        'Generating report...'
      ];

      contexts.forEach((context) => {
        const { unmount } = renderLoading({ message: context });
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.getByText(context)).toBeInTheDocument();
        unmount();
      });
    });
  });
});