/**
 * Validated Form Hook
 *
 * React hook for form validation using Zod schemas.
 * Provides type-safe form handling with automatic error management.
 *
 * @module shared/hooks/useValidatedForm
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { ValidationError, validateSafe } from '../validation/validators';

// ============================================================================
// Types
// ============================================================================

export interface UseValidatedFormOptions<T> {
  /** Zod schema for validation */
  schema: z.ZodSchema<T>;
  /** Initial form values */
  initialValues?: Partial<T>;
  /** Called when form is valid and submitted */
  onSubmit: (data: T) => void | Promise<void>;
  /** Called on validation errors */
  onError?: (errors: Record<string, string[]>) => void;
  /** Validate on change (default: false) */
  validateOnChange?: boolean;
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;
  /** Debounce delay for onChange validation in ms (default: 300) */
  debounceMs?: number;
}

export interface UseValidatedFormReturn<T> {
  /** Current form values */
  values: Partial<T>;
  /** Validation errors by field */
  errors: Record<string, string[]>;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Whether form has been touched */
  touched: Record<string, boolean>;
  /** Set single field value */
  setValue: (field: keyof T, value: any) => void;
  /** Set multiple field values */
  setValues: (values: Partial<T>) => void;
  /** Get field error message (first error) */
  getFieldError: (field: keyof T) => string | undefined;
  /** Check if field has errors */
  hasFieldError: (field: keyof T) => boolean;
  /** Mark field as touched */
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  /** Validate single field */
  validateField: (field: keyof T) => Promise<boolean>;
  /** Validate entire form */
  validateForm: () => Promise<boolean>;
  /** Handle form submission */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Reset form to initial values */
  reset: () => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Check if form is valid (no errors) */
  isValid: boolean;
  /** Check if form has been modified */
  isDirty: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for form validation with Zod schemas
 *
 * @example
 * ```tsx
 * const { values, errors, handleSubmit, setValue, getFieldError } = useValidatedForm({
 *   schema: investigationSettingsSchema,
 *   initialValues: { name: '', entities: [] },
 *   onSubmit: async (data) => {
 *     await createInvestigation(data);
 *   }
 * });
 *
 * return (
 *   <form onSubmit={handleSubmit}>
 *     <input
 *       value={values.name || ''}
 *       onChange={(e) => setValue('name', e.target.value)}
 *     />
 *     {getFieldError('name') && (
 *       <p className="error">{getFieldError('name')}</p>
 *     )}
 *   </form>
 * );
 * ```
 */
export function useValidatedForm<T>({
  schema,
  initialValues = {} as Partial<T>,
  onSubmit,
  onError,
  validateOnChange = false,
  validateOnBlur = true,
  debounceMs = 300
}: UseValidatedFormOptions<T>): UseValidatedFormReturn<T> {
  // State
  const [values, setValuesState] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValuesState] = useState(initialValues);

  // Debounce timer ref
  const debounceTimer = useState<NodeJS.Timeout | null>(null)[0];

  // ============================================================================
  // Computed Properties
  // ============================================================================

  const isValid = Object.keys(errors).length === 0;

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesState);

  // ============================================================================
  // Validation Functions
  // ============================================================================

  /**
   * Validate entire form
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    const result = validateSafe(schema, values);

    if (result.success) {
      setErrors({});
      return true;
    }

    setErrors(result.errors);
    if (onError) {
      onError(result.errors);
    }
    return false;
  }, [schema, values, onError]);

  /**
   * Validate single field
   */
  const validateField = useCallback(
    async (field: keyof T): Promise<boolean> => {
      // Create partial schema for single field validation
      const fieldValue = values[field];

      // Try to validate just this field
      const result = validateSafe(schema, values);

      if (result.success) {
        // Remove errors for this field
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field as string];
          return next;
        });
        return true;
      }

      // Set errors for this field only
      const fieldErrors = result.errors[field as string];
      if (fieldErrors) {
        setErrors((prev) => ({
          ...prev,
          [field as string]: fieldErrors
        }));
        return false;
      }

      // Remove errors if no errors for this field
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
      return true;
    },
    [schema, values]
  );

  // ============================================================================
  // Field Management
  // ============================================================================

  /**
   * Set single field value
   */
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState((prev) => ({
        ...prev,
        [field]: value
      }));

      // Validate on change if enabled
      if (validateOnChange) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
          validateField(field);
        }, debounceMs);

        debounceTimer !== null && Object.assign(debounceTimer, timer);
      }
    },
    [validateOnChange, validateField, debounceMs, debounceTimer]
  );

  /**
   * Set multiple field values
   */
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({
      ...prev,
      ...newValues
    }));
  }, []);

  /**
   * Mark field as touched
   */
  const setFieldTouched = useCallback(
    (field: keyof T, isTouched: boolean = true) => {
      setTouched((prev) => ({
        ...prev,
        [field as string]: isTouched
      }));

      // Validate on blur if enabled
      if (isTouched && validateOnBlur) {
        validateField(field);
      }
    },
    [validateOnBlur, validateField]
  );

  // ============================================================================
  // Error Helpers
  // ============================================================================

  /**
   * Get first error message for field
   */
  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return errors[field as string]?.[0];
    },
    [errors]
  );

  /**
   * Check if field has errors
   */
  const hasFieldError = useCallback(
    (field: keyof T): boolean => {
      return Boolean(errors[field as string]?.length);
    },
    [errors]
  );

  // ============================================================================
  // Form Submission
  // ============================================================================

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true
        }),
        {}
      );
      setTouched(allTouched);

      // Validate form
      const isFormValid = await validateForm();

      if (!isFormValid) {
        return;
      }

      // Submit
      setIsSubmitting(true);
      try {
        await onSubmit(values as T);
      } catch (error) {
        console.error('Form submission error:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit]
  );

  // ============================================================================
  // Form Reset
  // ============================================================================

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    values,
    errors,
    isSubmitting,
    touched,
    setValue,
    setValues,
    getFieldError,
    hasFieldError,
    setFieldTouched,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    clearErrors,
    isValid,
    isDirty
  };
}
