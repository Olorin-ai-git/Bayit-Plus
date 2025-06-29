import * as React from 'react';

/**
 * Mock Button component for tests.
 * @returns {JSX.Element} The rendered button.
 */
export const Button = function Button({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return React.createElement('button', { onClick, type: 'button' }, children);
};

/**
 * Mock Badge component for tests.
 * @returns {JSX.Element} The rendered badge.
 */
export const Badge = function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return React.createElement('span', { role: 'status' }, children);
};
