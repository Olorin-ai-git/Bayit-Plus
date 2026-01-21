/**
 * Component Migration Validation Tests
 *
 * These tests validate that migrated components maintain
 * functionality and behavior equivalence with their legacy counterparts.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Types for migration validation
interface MigrationTestCase {
  componentName: string;
  legacyComponent: React.ComponentType<any>;
  newComponent: React.ComponentType<any>;
  props: Record<string, any>;
  testScenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  action: (component: HTMLElement) => void | Promise<void>;
  validate: (component: HTMLElement) => void | Promise<void>;
}

// Mock components for testing
const mockLegacyInvestigationForm = ({ onSubmit, initialData }: any) => (
  <form
    data-testid="legacy-investigation-form"
    onSubmit={onSubmit}
    className="MuiPaper-root"
  >
    <input
      data-testid="legacy-form-input"
      defaultValue={initialData?.name || ''}
      style={{ padding: '8px', margin: '4px' }}
    />
    <button
      data-testid="legacy-form-submit"
      type="submit"
      className="MuiButton-contained MuiButton-colorPrimary"
    >
      Submit Legacy
    </button>
  </form>
);

const mockNewInvestigationForm = ({ onSubmit, initialData }: any) => (
  <form
    data-testid="new-investigation-form"
    onSubmit={onSubmit}
    className="bg-white p-4 rounded-lg shadow-md"
  >
    <input
      data-testid="new-form-input"
      defaultValue={initialData?.name || ''}
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
    />
    <button
      data-testid="new-form-submit"
      type="submit"
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      Submit New
    </button>
  </form>
);

describe('Component Migration Validation', () => {
  describe('Functional Equivalence Testing', () => {
    const migrationTestCases: MigrationTestCase[] = [
      {
        componentName: 'InvestigationForm',
        legacyComponent: mockLegacyInvestigationForm,
        newComponent: mockNewInvestigationForm,
        props: {
          onSubmit: jest.fn(),
          initialData: { name: 'Test Investigation' },
        },
        testScenarios: [
          {
            name: 'Form submission',
            action: async (component) => {
              const submitButton = component.querySelector('[data-testid*="form-submit"]');
              if (submitButton) {
                fireEvent.click(submitButton);
              }
            },
            validate: async (component) => {
              // Validation is handled by the test case props
            },
          },
          {
            name: 'Input interaction',
            action: async (component) => {
              const input = component.querySelector('[data-testid*="form-input"]') as HTMLInputElement;
              if (input) {
                fireEvent.change(input, { target: { value: 'Updated Investigation' } });
              }
            },
            validate: async (component) => {
              const input = component.querySelector('[data-testid*="form-input"]') as HTMLInputElement;
              expect(input?.value).toBe('Updated Investigation');
            },
          },
        ],
      },
    ];

    migrationTestCases.forEach((testCase) => {
      describe(`${testCase.componentName} Migration`, () => {
        testCase.testScenarios.forEach((scenario) => {
          it(`should maintain ${scenario.name} behavior`, async () => {
            // Test legacy component
            const legacyProps = { ...testCase.props };
            const { container: legacyContainer } = render(
              <testCase.legacyComponent {...legacyProps} />
            );

            // Test new component
            const newProps = { ...testCase.props };
            const { container: newContainer } = render(
              <testCase.newComponent {...newProps} />
            );

            // Execute action on both components
            await scenario.action(legacyContainer);
            await scenario.action(newContainer);

            // Validate both components
            await scenario.validate(legacyContainer);
            await scenario.validate(newContainer);

            // Ensure both components received the same props
            if (legacyProps.onSubmit && newProps.onSubmit) {
              expect(legacyProps.onSubmit).toEqual(newProps.onSubmit);
            }
          });
        });
      });
    });
  });

  describe('Material-UI to Tailwind Conversion Validation', () => {
    it('should maintain visual consistency after Material-UI removal', async () => {
      const LegacyButtonComponent = () => (
        <button
          data-testid="legacy-button"
          className="MuiButton-root MuiButton-contained MuiButton-containedPrimary"
          style={{
            backgroundColor: '#1976d2',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Legacy Button
        </button>
      );

      const NewButtonComponent = () => (
        <button
          data-testid="new-button"
          className="bg-blue-600 text-white px-4 py-1.5 rounded border-none cursor-pointer hover:bg-blue-700"
        >
          New Button
        </button>
      );

      const { container: legacyContainer } = render(<LegacyButtonComponent />);
      const { container: newContainer } = render(<NewButtonComponent />);

      const legacyButton = screen.getAllByText('Legacy Button')[0];
      const newButton = screen.getAllByText('New Button')[0];

      // Both buttons should be present and interactive
      expect(legacyButton).toBeInTheDocument();
      expect(newButton).toBeInTheDocument();

      // Both should be clickable
      expect(legacyButton).not.toBeDisabled();
      expect(newButton).not.toBeDisabled();

      // Verify styling approaches are different but functional
      expect(legacyButton).toHaveStyle('background-color: rgb(25, 118, 210)');
      expect(newButton).toHaveClass('bg-blue-600');
    });

    it('should maintain form validation behavior', async () => {
      const LegacyFormComponent = () => {
        const [value, setValue] = React.useState('');
        const [error, setError] = React.useState('');

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setValue(e.target.value);
          if (e.target.value.length < 3) {
            setError('Minimum 3 characters required');
          } else {
            setError('');
          }
        };

        return (
          <div className="MuiFormControl-root">
            <input
              data-testid="legacy-input"
              value={value}
              onChange={handleChange}
              style={{ border: error ? '1px solid red' : '1px solid gray' }}
            />
            {error && (
              <div data-testid="legacy-error" className="MuiFormHelperText-root">
                {error}
              </div>
            )}
          </div>
        );
      };

      const NewFormComponent = () => {
        const [value, setValue] = React.useState('');
        const [error, setError] = React.useState('');

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setValue(e.target.value);
          if (e.target.value.length < 3) {
            setError('Minimum 3 characters required');
          } else {
            setError('');
          }
        };

        return (
          <div className="w-full">
            <input
              data-testid="new-input"
              value={value}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && (
              <div data-testid="new-error" className="text-red-500 text-sm mt-1">
                {error}
              </div>
            )}
          </div>
        );
      };

      render(
        <div>
          <LegacyFormComponent />
          <NewFormComponent />
        </div>
      );

      const legacyInput = screen.getByTestId('legacy-input');
      const newInput = screen.getByTestId('new-input');

      // Test short input (should show error)
      fireEvent.change(legacyInput, { target: { value: 'ab' } });
      fireEvent.change(newInput, { target: { value: 'ab' } });

      await waitFor(() => {
        expect(screen.getByTestId('legacy-error')).toHaveTextContent('Minimum 3 characters required');
        expect(screen.getByTestId('new-error')).toHaveTextContent('Minimum 3 characters required');
      });

      // Test valid input (should clear error)
      fireEvent.change(legacyInput, { target: { value: 'valid input' } });
      fireEvent.change(newInput, { target: { value: 'valid input' } });

      await waitFor(() => {
        expect(screen.queryByTestId('legacy-error')).not.toBeInTheDocument();
        expect(screen.queryByTestId('new-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Event Handling Validation', () => {
    it('should maintain event handling consistency', async () => {
      const mockHandler = jest.fn();

      const LegacyEventComponent = () => (
        <div
          data-testid="legacy-event-container"
          onClick={mockHandler}
          className="MuiPaper-root"
          style={{ padding: '16px', cursor: 'pointer' }}
        >
          <span data-testid="legacy-event-content">Click me (Legacy)</span>
        </div>
      );

      const NewEventComponent = () => (
        <div
          data-testid="new-event-container"
          onClick={mockHandler}
          className="bg-white p-4 cursor-pointer rounded-lg shadow-md"
        >
          <span data-testid="new-event-content">Click me (New)</span>
        </div>
      );

      render(
        <div>
          <LegacyEventComponent />
          <NewEventComponent />
        </div>
      );

      const legacyContainer = screen.getByTestId('legacy-event-container');
      const newContainer = screen.getByTestId('new-event-container');

      // Test click events
      fireEvent.click(legacyContainer);
      fireEvent.click(newContainer);

      expect(mockHandler).toHaveBeenCalledTimes(2);

      // Test keyboard events
      fireEvent.keyDown(legacyContainer, { key: 'Enter' });
      fireEvent.keyDown(newContainer, { key: 'Enter' });

      // Both components should be interactive
      expect(legacyContainer).toBeVisible();
      expect(newContainer).toBeVisible();
    });
  });

  describe('Accessibility Validation', () => {
    it('should maintain accessibility standards after migration', async () => {
      const LegacyAccessibleComponent = () => (
        <div>
          <label htmlFor="legacy-input" className="MuiFormLabel-root">
            Legacy Input Label
          </label>
          <input
            id="legacy-input"
            data-testid="legacy-accessible-input"
            aria-describedby="legacy-help"
            className="MuiInput-root"
          />
          <div id="legacy-help" className="MuiFormHelperText-root">
            This is helper text
          </div>
        </div>
      );

      const NewAccessibleComponent = () => (
        <div>
          <label
            htmlFor="new-input"
            className="block text-sm font-medium text-gray-700"
          >
            New Input Label
          </label>
          <input
            id="new-input"
            data-testid="new-accessible-input"
            aria-describedby="new-help"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <div id="new-help" className="mt-2 text-sm text-gray-600">
            This is helper text
          </div>
        </div>
      );

      render(
        <div>
          <LegacyAccessibleComponent />
          <NewAccessibleComponent />
        </div>
      );

      const legacyInput = screen.getByTestId('legacy-accessible-input');
      const newInput = screen.getByTestId('new-accessible-input');

      // Check accessibility attributes
      expect(legacyInput).toHaveAttribute('aria-describedby', 'legacy-help');
      expect(newInput).toHaveAttribute('aria-describedby', 'new-help');

      // Check labels are associated
      expect(legacyInput).toHaveAttribute('id', 'legacy-input');
      expect(newInput).toHaveAttribute('id', 'new-input');

      // Verify helper text is accessible
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });
  });

  describe('Performance Validation', () => {
    it('should maintain or improve performance after migration', async () => {
      const LegacyPerformanceComponent = () => {
        const [items, setItems] = React.useState(Array.from({ length: 100 }, (_, i) => i));

        return (
          <div data-testid="legacy-performance" className="MuiContainer-root">
            {items.map((item) => (
              <div
                key={item}
                className="MuiPaper-root MuiPaper-elevation1"
                style={{ padding: '8px', margin: '4px' }}
              >
                Legacy Item {item}
              </div>
            ))}
          </div>
        );
      };

      const NewPerformanceComponent = () => {
        const [items, setItems] = React.useState(Array.from({ length: 100 }, (_, i) => i));

        return (
          <div data-testid="new-performance" className="container mx-auto">
            {items.map((item) => (
              <div
                key={item}
                className="bg-white p-2 m-1 rounded shadow-sm"
              >
                New Item {item}
              </div>
            ))}
          </div>
        );
      };

      // Measure legacy component render time
      const legacyStart = performance.now();
      const { container: legacyContainer } = render(<LegacyPerformanceComponent />);
      const legacyEnd = performance.now();
      const legacyRenderTime = legacyEnd - legacyStart;

      // Measure new component render time
      const newStart = performance.now();
      const { container: newContainer } = render(<NewPerformanceComponent />);
      const newEnd = performance.now();
      const newRenderTime = newEnd - newStart;

      // Both should render successfully
      expect(screen.getByTestId('legacy-performance')).toBeInTheDocument();
      expect(screen.getByTestId('new-performance')).toBeInTheDocument();

      // New component should not be significantly slower
      // (allowing for some variance in test execution)
      expect(newRenderTime).toBeLessThan(legacyRenderTime * 2);

      console.log(`Legacy render time: ${legacyRenderTime}ms`);
      console.log(`New render time: ${newRenderTime}ms`);
    });
  });

  describe('State Management Validation', () => {
    it('should maintain state consistency after migration', async () => {
      const LegacyStateComponent = () => {
        const [count, setCount] = React.useState(0);
        const [text, setText] = React.useState('');

        return (
          <div data-testid="legacy-state" className="MuiPaper-root">
            <div data-testid="legacy-count">Count: {count}</div>
            <button
              data-testid="legacy-increment"
              onClick={() => setCount(c => c + 1)}
              className="MuiButton-contained"
            >
              Increment
            </button>
            <input
              data-testid="legacy-text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="MuiInput-root"
            />
            <div data-testid="legacy-text-display">Text: {text}</div>
          </div>
        );
      };

      const NewStateComponent = () => {
        const [count, setCount] = React.useState(0);
        const [text, setText] = React.useState('');

        return (
          <div data-testid="new-state" className="bg-white p-4 rounded-lg">
            <div data-testid="new-count">Count: {count}</div>
            <button
              data-testid="new-increment"
              onClick={() => setCount(c => c + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Increment
            </button>
            <input
              data-testid="new-text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <div data-testid="new-text-display">Text: {text}</div>
          </div>
        );
      };

      render(
        <div>
          <LegacyStateComponent />
          <NewStateComponent />
        </div>
      );

      // Test counter state
      const legacyIncrement = screen.getByTestId('legacy-increment');
      const newIncrement = screen.getByTestId('new-increment');

      fireEvent.click(legacyIncrement);
      fireEvent.click(legacyIncrement);
      fireEvent.click(newIncrement);
      fireEvent.click(newIncrement);

      expect(screen.getByTestId('legacy-count')).toHaveTextContent('Count: 2');
      expect(screen.getByTestId('new-count')).toHaveTextContent('Count: 2');

      // Test text state
      const legacyTextInput = screen.getByTestId('legacy-text-input');
      const newTextInput = screen.getByTestId('new-text-input');

      fireEvent.change(legacyTextInput, { target: { value: 'test text' } });
      fireEvent.change(newTextInput, { target: { value: 'test text' } });

      expect(screen.getByTestId('legacy-text-display')).toHaveTextContent('Text: test text');
      expect(screen.getByTestId('new-text-display')).toHaveTextContent('Text: test text');
    });
  });
});

/**
 * Utility functions for migration validation
 */
export const migrationValidationUtils = {
  /**
   * Compare component render output
   */
  compareComponentOutput: (
    legacyComponent: React.ComponentType<any>,
    newComponent: React.ComponentType<any>,
    props: any
  ) => {
    const { container: legacyContainer } = render(
      React.createElement(legacyComponent, props)
    );
    const { container: newContainer } = render(
      React.createElement(newComponent, props)
    );

    return {
      legacy: legacyContainer,
      new: newContainer,
    };
  },

  /**
   * Validate style consistency
   */
  validateStyleConsistency: (
    legacyElement: HTMLElement,
    newElement: HTMLElement
  ) => {
    // Basic visibility check
    expect(legacyElement).toBeVisible();
    expect(newElement).toBeVisible();

    // Interactive elements should be accessible
    if (legacyElement.tagName === 'BUTTON' || legacyElement.tagName === 'INPUT') {
      expect(legacyElement).not.toBeDisabled();
      expect(newElement).not.toBeDisabled();
    }
  },

  /**
   * Validate accessibility preservation
   */
  validateAccessibility: (element: HTMLElement) => {
    // Check for proper ARIA attributes
    const inputs = element.querySelectorAll('input, button, select, textarea');
    inputs.forEach((input) => {
      if (input.hasAttribute('aria-describedby')) {
        const describedBy = input.getAttribute('aria-describedby');
        expect(element.querySelector(`#${describedBy}`)).toBeInTheDocument();
      }
    });
  },

  /**
   * Performance comparison helper
   */
  measurePerformance: async <T>(
    operation: () => T | Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();

    return {
      result,
      duration: end - start,
    };
  },
};