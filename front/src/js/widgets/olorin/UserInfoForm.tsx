import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Button, TextField } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Simplified interfaces
interface Sandbox {
  logger?: {
    log: (message: string) => void;
    error: (message: string) => void;
  };
}

interface Profiler {
  record: (interaction: any) => void;
}

interface CustomerInteraction {
  success: () => void;
  fail: (message: string) => void;
}

const StyledForm = styled.form`
  width: 25rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const StyledTextField = styled(TextField)`
  width: 100%;
  margin-top: 1rem;
`;

interface UserInfoFormProps {
  sandbox?: Sandbox;
  onSubmit?: (data: { userId: string; entityType: string }) => void;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ sandbox, onSubmit }) => {
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('user_id');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      sandbox?.logger?.log(`User info submitted: ${userId} (${entityType})`);
      
      if (onSubmit) {
        onSubmit({ userId, entityType });
      }
      
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      sandbox?.logger?.error(`Failed to submit user info: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StyledForm ref={formRef} onSubmit={handleSubmit}>
      <h2>User Information</h2>
      <StyledTextField
        label="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        required
      />
      <select
        value={entityType}
        onChange={(e) => setEntityType(e.target.value)}
        style={{ width: '100%', marginTop: '1rem', padding: '0.5rem' }}
      >
        <option value="user_id">User ID</option>
        <option value="device_id">Device ID</option>
      </select>
      <Button
        type="submit"
        disabled={isSubmitting || !userId}
        style={{ marginTop: '1rem', width: '100%' }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
      {isSuccess && (
        <div style={{ marginTop: '1rem', color: 'green', display: 'flex', alignItems: 'center' }}>
          <CheckCircleIcon fontSize="small" style={{ marginRight: '0.5rem' }} />
          Successfully submitted!
        </div>
      )}
    </StyledForm>
  );
};

export default UserInfoForm;
