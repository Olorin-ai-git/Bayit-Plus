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

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return <button {...props}>{children}</button>;
};

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={className}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
};

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', message }) => {
  return (
    <div>
      <div>Loading...</div>
      {message && <p>{message}</p>}
    </div>
  );
};

export default {
  Button,
  Card,
  Loading
};