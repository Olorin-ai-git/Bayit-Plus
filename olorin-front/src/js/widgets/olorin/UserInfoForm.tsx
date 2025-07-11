import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
} from '@mui/material';
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        User Information
      </Typography>
      <TextField
        label="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        required
        fullWidth
        sx={{ mb: 2 }}
      />
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Entity Type</InputLabel>
        <Select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          label="Entity Type"
        >
          <MenuItem value="user_id">User ID</MenuItem>
          <MenuItem value="device_id">Device ID</MenuItem>
        </Select>
      </FormControl>
      <Button
        type="submit"
        disabled={isSubmitting || !userId}
        variant="contained"
        fullWidth
        sx={{ mb: 2 }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
      {isSuccess && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 1 }}>
          Successfully submitted!
        </Alert>
      )}
    </StyledForm>
  );
};

export default UserInfoForm;
