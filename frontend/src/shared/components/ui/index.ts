/**
 * Shared UI Components - Central Export
 *
 * All reusable UI components built with Tailwind CSS
 * for use across all microservices
 */

export { Button } from './Button';
export { Input } from './Input';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Card } from './Card';
export type { CardProps } from './Card';
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { Toast } from './Toast';
export type { ToastProps } from './Toast';
export { Spinner, LoadingOverlay, InlineLoading } from './Spinner';
export type { SpinnerProps, LoadingOverlayProps, InlineLoadingProps } from './Spinner';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { ErrorBoundary } from '../ErrorBoundary';
export { Table, useTableState } from '../Table';
export type {
  TableProps,
  TableConfig,
  TableColumn,
  TableSort,
  TableSelection,
  TablePagination
} from '../Table';
