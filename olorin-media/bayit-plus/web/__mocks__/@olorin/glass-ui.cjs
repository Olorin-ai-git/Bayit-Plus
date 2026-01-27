const React = require('react');

const GlassCard = ({ children, className, ...props }) =>
  React.createElement('div', { className, ...props, 'data-testid': 'glass-card' }, children);

const GlassButton = ({ children, onPress, onClick, variant, className, ...props }) =>
  React.createElement(
    'button',
    { onClick: onPress || onClick, className, 'data-variant': variant, ...props },
    children
  );

const GlassSelect = ({ placeholder, options, onChange, value, ...props }) =>
  React.createElement(
    'select',
    {
      placeholder,
      onChange: (e) => onChange?.(e.target.value),
      value: value || '',
      'data-testid': 'glass-select',
      ...props,
    },
    React.createElement('option', { value: '' }, placeholder),
    options?.map((opt) =>
      React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
    )
  );

const GlassInput = ({ placeholder, value, onChangeText, onChange, ...props }) =>
  React.createElement('input', {
    placeholder,
    value,
    onChange: (e) => (onChangeText ? onChangeText(e.target.value) : onChange?.(e)),
    ...props,
  });

const GlassModal = ({ visible, onClose, children, ...props }) =>
  visible ? React.createElement('div', props, children) : null;

const GlassAlert = ({ title, message, ...props }) =>
  React.createElement('div', props, [
    title && React.createElement('h3', null, title),
    message && React.createElement('p', null, message),
  ]);

const GlassTabs = ({ activeTab, onTabChange, children, ...props }) =>
  React.createElement('div', props, children);

const GlassCheckbox = ({ checked, onChange, ...props }) =>
  React.createElement('input', { type: 'checkbox', checked, onChange, ...props });

const GlassRadio = ({ checked, onChange, ...props }) =>
  React.createElement('input', { type: 'radio', checked, onChange, ...props });

const GlassSwitch = ({ value, onChange, ...props }) =>
  React.createElement('input', { type: 'checkbox', checked: value, onChange, ...props });

const GlassSpinner = (props) =>
  React.createElement('div', { 'data-testid': 'glass-spinner', ...props });

const GlassProgress = ({ value, ...props }) =>
  React.createElement('div', { 'data-testid': 'glass-progress', 'data-value': value, ...props });

const GlassBadge = ({ children, ...props }) =>
  React.createElement('span', props, children);

const GlassAvatar = ({ src, alt, ...props }) =>
  React.createElement('img', { src, alt, ...props });

const GlassTooltip = ({ content, children, ...props }) =>
  React.createElement('div', { ...props, title: content }, children);

const GlassDropdown = ({ trigger, children, ...props }) =>
  React.createElement('div', props, [trigger, children]);

module.exports = {
  GlassCard,
  GlassButton,
  GlassSelect,
  GlassInput,
  GlassModal,
  GlassAlert,
  GlassTabs,
  GlassCheckbox,
  GlassRadio,
  GlassSwitch,
  GlassSpinner,
  GlassProgress,
  GlassBadge,
  GlassAvatar,
  GlassTooltip,
  GlassDropdown,
};
