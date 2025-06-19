import React, { useState, ChangeEvent } from 'react';
import styled from 'styled-components';
import { Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
`;

interface InvestigationFormProps {
  onSubmit: (userId: string, entityType: string) => void;
}

const InvestigationForm: React.FC<InvestigationFormProps> = ({ onSubmit }) => {
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('user_id');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(userId, entityType);
  };

  return (
    <FormContainer>
      <form onSubmit={handleSubmit}>
        <TextField
          label="User ID"
          value={userId}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUserId(e.target.value)}
          required
          fullWidth
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
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
        <Button variant="contained" type="submit" fullWidth sx={{ mt: 2 }}>
          Start Investigation
        </Button>
      </form>
    </FormContainer>
  );
};

export default InvestigationForm; 