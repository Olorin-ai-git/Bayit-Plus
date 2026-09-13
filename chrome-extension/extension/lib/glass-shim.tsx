import { type ChangeEvent, type ReactNode } from 'react';

interface BaseProps { children?: ReactNode; className?: string; 'aria-label'?: string; }
interface ButtonProps extends BaseProps { onPress?: () => void; disabled?: boolean; variant?: string; size?: string; type?: 'button' | 'submit' | 'reset'; }
interface InputProps extends BaseProps { value?: string; onChangeText?: (value: string) => void; disabled?: boolean; type?: string; placeholder?: string; 'aria-label'?: string; }
interface SelectProps extends BaseProps { value?: string; onChange?: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean; label?: string; }

function classes(className?: string): string | undefined { return className; }

export function GlassButton({ children, onPress, disabled, type = 'button', className }: ButtonProps) {
  return <button type={type} className={classes(className)} onClick={onPress} disabled={disabled}>{children}</button>;
}

export function GlassCard({ children, className }: BaseProps) { return <section className={classes(className)}>{children}</section>; }

export function GlassBadge({ children, className }: BaseProps & { variant?: string }) { return <span className={classes(className)}>{children}</span>; }

export function GlassProgress({ className, value, max = 100, ...props }: BaseProps & { value?: number; max?: number; label?: string }) {
  return <progress {...props} className={classes(className)} value={value} max={max} />;
}

export function GlassLoadingSpinner({ className }: BaseProps & { size?: string }) { return <span className={classes(className)} role="status" aria-label="Loading" />; }

export function GlassInput({ value, onChangeText, ...props }: InputProps) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => onChangeText?.(event.target.value);
  return <input {...props} value={value} onChange={onChange} className={classes(props.className)} />;
}

export function GlassSelect({ value, onChange, options, label, ...props }: SelectProps) {
  return <label className={classes(props.className)}>{label && <span>{label}</span>}<select value={value} onChange={(event) => onChange?.(event.target.value)} disabled={props.disabled}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function GlassSlider({ value, onChange, ...props }: BaseProps & { value?: number; onChange?: (value: number) => void; min?: number; max?: number; step?: number; disabled?: boolean }) {
  return <input type="range" {...props} value={value} onChange={(event) => onChange?.(Number(event.target.value))} className={classes(props.className)} />;
}

export function GlassSwitch({ value, checked, onChange, ...props }: BaseProps & { value?: boolean; checked?: boolean; onChange?: (value: boolean) => void; disabled?: boolean }) {
  return <input type="checkbox" {...props} checked={checked ?? value} onChange={(event) => onChange?.(event.target.checked)} className={classes(props.className)} />;
}

export function GlassConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: { visible: boolean; title: string; message: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void }) {
  if (!visible) return null;
  return <div role="dialog" aria-modal="true"><h2>{title}</h2><p>{message}</p><GlassButton onPress={onCancel}>{cancelLabel}</GlassButton><GlassButton onPress={onConfirm}>{confirmLabel}</GlassButton></div>;
}
