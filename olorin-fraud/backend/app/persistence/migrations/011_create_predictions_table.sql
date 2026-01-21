-- Migration: Create PREDICTIONS table for storing model predictions
-- Feature: Confusion Matrix Calculation with Postgres Predictions Storage
-- Date: 2025-11-17

-- PostgreSQL version
CREATE TABLE IF NOT EXISTS predictions (
    transaction_id VARCHAR(255) PRIMARY KEY,
    predicted_risk FLOAT NOT NULL,
    predicted_label INTEGER NOT NULL,  -- 0 or 1 based on risk_threshold
    model_version VARCHAR(100) NOT NULL,
    investigation_id VARCHAR(255),
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    merchant_id VARCHAR(255),
    window_start TIMESTAMP WITH TIME ZONE,
    window_end TIMESTAMP WITH TIME ZONE,
    risk_threshold FLOAT NOT NULL DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for efficient joins and queries
    CONSTRAINT predictions_transaction_id_key UNIQUE (transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_investigation_id ON predictions(investigation_id);
CREATE INDEX IF NOT EXISTS idx_predictions_entity ON predictions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_predictions_merchant_id ON predictions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model_version ON predictions(model_version);
CREATE INDEX IF NOT EXISTS idx_predictions_window ON predictions(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_predictions_predicted_label ON predictions(predicted_label);

COMMENT ON TABLE predictions IS 'Stores model predictions for confusion matrix calculation. Predictions are read from Snowflake TXS and persisted here for joining with ground truth labels.';
COMMENT ON COLUMN predictions.transaction_id IS 'TX_ID_KEY from Snowflake TXS table';
COMMENT ON COLUMN predictions.predicted_risk IS 'Risk score from investigation (0.0 to 1.0)';
COMMENT ON COLUMN predictions.predicted_label IS 'Binary prediction: 1 if predicted_risk >= risk_threshold, else 0';
COMMENT ON COLUMN predictions.model_version IS 'Model version identifier (e.g., investigation_id or model name)';
COMMENT ON COLUMN predictions.risk_threshold IS 'Threshold used to compute predicted_label (default: 0.5)';

