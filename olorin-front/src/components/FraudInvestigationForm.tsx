import React, { useState } from 'react';
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  SelectChangeEvent,
} from '@mui/material';
import { InvestigationType } from '../types/Investigation';

interface FraudInvestigationFormProps {
  onSubmit: (data: {
    type: InvestigationType;
    userId?: string;
    deviceId?: string;
    transactionId?: string;
  }) => void;
}

export const FraudInvestigationForm: React.FC<FraudInvestigationFormProps> = ({
  onSubmit,
}) => {
  const [type, setType] = useState<InvestigationType>(
    InvestigationType.TRANSACTION,
  );
  const [transactionId, setTransactionId] = useState('');
  const [userId, setUserId] = useState('');
  const [deviceId, setDeviceId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      ...(type === InvestigationType.TRANSACTION && { transactionId }),
      ...(type === InvestigationType.USER && { userId }),
      ...(type === InvestigationType.DEVICE && { deviceId }),
    });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <FormControl fullWidth>
        <InputLabel>Investigation Type</InputLabel>
        <Select
          value={type}
          label="Investigation Type"
          onChange={(e: SelectChangeEvent) =>
            setType(e.target.value as InvestigationType)
          }
        >
          <MenuItem value={InvestigationType.TRANSACTION}>Transaction</MenuItem>
          <MenuItem value={InvestigationType.USER}>User</MenuItem>
          <MenuItem value={InvestigationType.DEVICE}>Device</MenuItem>
        </Select>
      </FormControl>

      {type === InvestigationType.TRANSACTION && (
        <TextField
          label="Transaction ID"
          value={transactionId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setTransactionId(e.target.value)
          }
          fullWidth
          required
        />
      )}

      {type === InvestigationType.USER && (
        <TextField
          label="User ID"
          value={userId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setUserId(e.target.value)
          }
          fullWidth
          required
        />
      )}

      {type === InvestigationType.DEVICE && (
        <TextField
          label="Device ID"
          value={deviceId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDeviceId(e.target.value)
          }
          fullWidth
          required
        />
      )}

      <Button type="submit" variant="contained" color="primary">
        Investigate
      </Button>
    </Box>
  );
};
