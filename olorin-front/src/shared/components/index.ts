/**
 * Shared Components for Olorin Microservices
 * Common UI components used across all microservices
 */

import React from 'react';

// Placeholder components - will be expanded in next phases
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant,
  size,
  disabled,
  loading,
  onClick,
  className,
  ...props
}) => {
  return React.createElement('button', {
    ...props,
    variant,
    size,
    disabled,
    loading: loading ? 'true' : undefined,
    onClick,
    className
  }, children);
};

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className, ...props }) => {
  return React.createElement(
    'div',
    { ...props, className },
    title && React.createElement('h3', null, title),
    children
  );
};

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', message }) => {
  return React.createElement(
    'div',
    null,
    React.createElement('div', null, 'Loading...'),
    message && React.createElement('p', null, message)
  );
};

export default {
  Button,
  Card,
  Loading
};