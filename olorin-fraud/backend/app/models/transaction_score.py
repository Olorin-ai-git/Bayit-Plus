"""
Transaction Score Model

Stores per-transaction risk scores separately from investigation state.
This allows scoring unlimited transactions without JSON size constraints.
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Index, func
from sqlalchemy.ext.declarative import declarative_base

from app.persistence.database import Base

class TransactionScore(Base):
    """
    Transaction risk scores for investigations.
    
    Stores individual transaction scores separately from progress_json
    to avoid JSON size limitations when scoring large transaction volumes (100K+).
    
    Schema: Table name: transaction_scores
    """
    
    __tablename__ = "transaction_scores"
    
    # Composite primary key: investigation_id + transaction_id
    investigation_id = Column(String(255), primary_key=True, nullable=False, index=True)
    transaction_id = Column(String(255), primary_key=True, nullable=False)
    
    # Risk score value
    risk_score = Column(Float, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Index for efficient queries by investigation
    __table_args__ = (
        Index('idx_investigation_scores', 'investigation_id'),
        Index('idx_transaction_lookup', 'investigation_id', 'transaction_id'),
    )
    
    def __repr__(self):
        return f"<TransactionScore(investigation_id='{self.investigation_id}', transaction_id='{self.transaction_id}', score={self.risk_score})>"
    
    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            'investigation_id': self.investigation_id,
            'transaction_id': self.transaction_id,
            'risk_score': self.risk_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


