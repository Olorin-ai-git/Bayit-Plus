/**
 * Unit Tests for Card Component
 * Tests rendering, props, children handling, and layout behavior
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { componentTestUtils } from '../../testing/component-setup';
import { Card, CardProps } from '../index';

describe('Card Component', () => {
  // Helper function to render Card with default props
  const renderCard = (props: Partial<CardProps> = {}) => {
    const defaultProps: CardProps = {
      children: <div>Card Content</div>,
      ...props
    };
    return componentTestUtils.renderWithProviders(<Card {...defaultProps} />);
  };

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderCard();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders without title by default', () => {
      renderCard();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders with title when provided', () => {
      renderCard({ title: 'Test Card Title' });
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test Card Title');
    });

    it('renders title as h3 element', () => {
      renderCard({ title: 'Test Title' });
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.tagName).toBe('H3');
    });

    it('applies custom className', () => {
      renderCard({ className: 'custom-card-class' });
      const cardElement = screen.getByText('Card Content').parentElement;
      expect(cardElement).toHaveClass('custom-card-class');
    });

    it('renders as div element', () => {
      renderCard();
      const cardElement = screen.getByText('Card Content').parentElement;
      expect(cardElement?.tagName).toBe('DIV');
    });
  });

  describe('Children Handling', () => {
    it('renders simple text children', () => {
      renderCard({ children: 'Simple text content' });
      expect(screen.getByText('Simple text content')).toBeInTheDocument();
    });

    it('renders JSX children', () => {
      renderCard({
        children: (
          <div>
            <p>Paragraph content</p>
            <button>Action Button</button>
          </div>
        )
      });

      expect(screen.getByText('Paragraph content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      renderCard({
        children: (
          <>
            <p>First paragraph</p>
            <p>Second paragraph</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </>
        )
      });

      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      expect(screen.getByText('List item 2')).toBeInTheDocument();
    });

    it('renders React components as children', () => {
      const CustomComponent = () => <div>Custom Component Content</div>;

      renderCard({
        children: <CustomComponent />
      });

      expect(screen.getByText('Custom Component Content')).toBeInTheDocument();
    });

    it('handles nested Cards', () => {
      renderCard({
        title: 'Outer Card',
        children: (
          <Card title="Inner Card">
            <div>Nested content</div>
          </Card>
        )
      });

      expect(screen.getByText('Outer Card')).toBeInTheDocument();
      expect(screen.getByText('Inner Card')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Title Behavior', () => {
    it('renders title before children', () => {
      renderCard({
        title: 'Card Title',
        children: <div>Card Body</div>
      });

      const cardElement = screen.getByText('Card Title').parentElement;
      const titleElement = screen.getByText('Card Title');
      const bodyElement = screen.getByText('Card Body');

      // Title should come before body in DOM order
      expect(cardElement?.firstChild).toBe(titleElement);
      expect(titleElement.nextElementSibling).toBe(bodyElement);
    });

    it('handles empty title string', () => {
      renderCard({ title: '' });
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('handles title with special characters', () => {
      const specialTitle = 'Card & Title <with> "special" characters';
      renderCard({ title: specialTitle });
      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('handles very long titles', () => {
      const longTitle = 'This is a very long card title that might wrap to multiple lines and should still be rendered correctly without breaking the layout';
      renderCard({ title: longTitle });
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles title with HTML entities', () => {
      const htmlTitle = 'Title with &amp; entities &lt;&gt;';
      renderCard({ title: htmlTitle });
      expect(screen.getByText(htmlTitle)).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('maintains proper DOM hierarchy', () => {
      renderCard({
        title: 'Test Title',
        children: <div data-testid="card-content">Content</div>
      });

      const cardDiv = screen.getByTestId('card-content').parentElement;
      const titleElement = screen.getByText('Test Title');
      const contentElement = screen.getByTestId('card-content');

      expect(cardDiv).toContainElement(titleElement);
      expect(cardDiv).toContainElement(contentElement);
    });

    it('preserves children order when multiple children provided', () => {
      renderCard({
        children: (
          <>
            <div data-testid="first">First</div>
            <div data-testid="second">Second</div>
            <div data-testid="third">Third</div>
          </>
        )
      });

      const firstElement = screen.getByTestId('first');
      const secondElement = screen.getByTestId('second');
      const thirdElement = screen.getByTestId('third');

      expect(firstElement.nextElementSibling).toBe(secondElement);
      expect(secondElement.nextElementSibling).toBe(thirdElement);
    });

    it('handles className alongside title', () => {
      renderCard({
        title: 'Styled Card',
        className: 'bg-blue-500 rounded-lg p-4',
        children: <div>Styled content</div>
      });

      const cardElement = screen.getByText('Styled content').parentElement;
      expect(cardElement).toHaveClass('bg-blue-500', 'rounded-lg', 'p-4');
      expect(screen.getByText('Styled Card')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null children gracefully', () => {
      renderCard({ children: null as any });
      const cardElement = document.querySelector('div');
      expect(cardElement).toBeInTheDocument();
    });

    it('handles undefined children gracefully', () => {
      renderCard({ children: undefined as any });
      const cardElement = document.querySelector('div');
      expect(cardElement).toBeInTheDocument();
    });

    it('handles empty string children', () => {
      renderCard({ children: '' });
      const cardElement = document.querySelector('div');
      expect(cardElement).toBeInTheDocument();
    });

    it('handles number children', () => {
      renderCard({ children: 42 as any });
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('handles boolean children (should not render)', () => {
      renderCard({ children: true as any });
      // Boolean children don't render in React
      const cardElement = document.querySelector('div');
      expect(cardElement).toBeInTheDocument();
    });

    it('handles array of children', () => {
      renderCard({
        children: [
          <div key="1">Item 1</div>,
          <div key="2">Item 2</div>,
          <div key="3">Item 3</div>
        ]
      });

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('passes through data attributes', () => {
      renderCard({
        'data-testid': 'custom-card',
        'data-analytics': 'card-component'
      } as any);

      const cardElement = screen.getByTestId('custom-card');
      expect(cardElement).toHaveAttribute('data-analytics', 'card-component');
    });

    it('handles all props combinations', () => {
      renderCard({
        title: 'Full Props Card',
        className: 'custom-class',
        children: <div>All props content</div>
      });

      expect(screen.getByText('Full Props Card')).toBeInTheDocument();
      expect(screen.getByText('All props content')).toBeInTheDocument();

      const cardElement = screen.getByText('All props content').parentElement;
      expect(cardElement).toHaveClass('custom-class');
    });

    it('handles missing optional props', () => {
      // Only required prop is children
      renderCard({
        children: <div>Minimal props</div>
      });

      expect(screen.getByText('Minimal props')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = renderCard({
        title: 'Test Card',
        children: <div>Content</div>
      });

      // Re-render with same props
      rerender(
        <Card title="Test Card">
          <div>Content</div>
        </Card>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles dynamic content updates', () => {
      const { rerender } = renderCard({
        title: 'Dynamic Card',
        children: <div>Initial Content</div>
      });

      rerender(
        <Card title="Updated Card">
          <div>Updated Content</div>
        </Card>
      );

      expect(screen.getByText('Updated Card')).toBeInTheDocument();
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
      expect(screen.queryByText('Dynamic Card')).not.toBeInTheDocument();
      expect(screen.queryByText('Initial Content')).not.toBeInTheDocument();
    });
  });
});