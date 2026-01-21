import { useState } from 'react';

export const usePlaceholderEditing = (initialValue: string = '') => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const startEditing = () => setIsEditing(true);
  const stopEditing = () => setIsEditing(false);
  const handleChange = (newValue: string) => setValue(newValue);
  const reset = () => setValue(initialValue);

  return {
    isEditing,
    value,
    startEditing,
    stopEditing,
    handleChange,
    reset
  };
};
