/**
 * useToast Hook - Toast notification system
 * Re-exports from ToastProvider for backward compatibility
 * NOTE: Components should import useToast from this file, ToastProvider from ToastProvider.tsx
 */

export { useToast, type ToastVariant, type ToastMessage } from '../components/common/ToastProvider';

