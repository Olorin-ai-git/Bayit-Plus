"""
Transaction Score Service

Service layer for managing transaction scores in the database.
Handles bulk inserts, retrievals, and cleanup operations.
"""

from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import delete

from app.models.transaction_score import TransactionScore
from app.persistence.database import get_db
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class TransactionScoreService:
    """Service for managing transaction scores."""
    
    @staticmethod
    def save_transaction_scores(
        investigation_id: str,
        transaction_scores: Dict[str, float],
        db: Optional[Session] = None
    ) -> int:
        """
        Save transaction scores to database.
        
        Args:
            investigation_id: Investigation ID
            transaction_scores: Dictionary mapping transaction_id to risk_score
            db: Optional database session (will create one if not provided)
            
        Returns:
            Number of scores saved
        """
        if not transaction_scores:
            logger.warning(f"No transaction scores to save for investigation {investigation_id}")
            return 0
            
        # Use provided session or create new one
        if db is None:
            db_gen = get_db()
            db = next(db_gen)
            close_db = True
        else:
            close_db = False
            
        try:
            # Use upsert semantics: INSERT or UPDATE existing scores
            # This allows incremental batch saves without losing previous batches
            score_count = 0
            for tx_id, score in transaction_scores.items():
                # Check if score exists
                existing = db.query(TransactionScore).filter(
                    TransactionScore.investigation_id == investigation_id,
                    TransactionScore.transaction_id == str(tx_id)
                ).first()
                
                if existing:
                    # Update existing score
                    existing.risk_score = float(score)
                else:
                    # Insert new score
                    new_score = TransactionScore(
                        investigation_id=investigation_id,
                        transaction_id=str(tx_id),
                        risk_score=float(score)
                    )
                    db.add(new_score)
                score_count += 1
            
            db.commit()
            
            logger.info(
                f"✅ Saved/updated {score_count} transaction scores for investigation {investigation_id}"
            )
            return score_count
            
        except Exception as e:
            logger.error(
                f"❌ Failed to save transaction scores for investigation {investigation_id}: {e}",
                exc_info=True
            )
            db.rollback()
            raise
        finally:
            if close_db:
                db.close()
    
    @staticmethod
    def get_transaction_scores(
        investigation_id: str,
        db: Optional[Session] = None
    ) -> Dict[str, float]:
        """
        Retrieve transaction scores from database.
        
        Args:
            investigation_id: Investigation ID
            db: Optional database session
            
        Returns:
            Dictionary mapping transaction_id to risk_score
        """
        if db is None:
            db_gen = get_db()
            db = next(db_gen)
            close_db = True
        else:
            close_db = False
            
        try:
            scores = db.query(TransactionScore).filter(
                TransactionScore.investigation_id == investigation_id
            ).all()
            
            result = {score.transaction_id: score.risk_score for score in scores}
            
            logger.info(
                f"📊 Retrieved {len(result)} transaction scores for investigation {investigation_id}"
            )
            return result
            
        except Exception as e:
            logger.error(
                f"❌ Failed to retrieve transaction scores for investigation {investigation_id}: {e}",
                exc_info=True
            )
            raise
        finally:
            if close_db:
                db.close()
    
    @staticmethod
    def get_transaction_score(
        investigation_id: str,
        transaction_id: str,
        db: Optional[Session] = None
    ) -> Optional[float]:
        """
        Get a single transaction score.
        
        Args:
            investigation_id: Investigation ID
            transaction_id: Transaction ID
            db: Optional database session
            
        Returns:
            Risk score or None if not found
        """
        if db is None:
            db_gen = get_db()
            db = next(db_gen)
            close_db = True
        else:
            close_db = False
            
        try:
            score = db.query(TransactionScore).filter(
                TransactionScore.investigation_id == investigation_id,
                TransactionScore.transaction_id == str(transaction_id)
            ).first()
            
            return score.risk_score if score else None
            
        finally:
            if close_db:
                db.close()
    
    @staticmethod
    def delete_transaction_scores(
        investigation_id: str,
        db: Optional[Session] = None
    ) -> int:
        """
        Delete all transaction scores for an investigation.
        
        Args:
            investigation_id: Investigation ID
            db: Optional database session
            
        Returns:
            Number of scores deleted
        """
        if db is None:
            db_gen = get_db()
            db = next(db_gen)
            close_db = True
        else:
            close_db = False
            
        try:
            deleted = db.query(TransactionScore).filter(
                TransactionScore.investigation_id == investigation_id
            ).delete()
            db.commit()
            
            logger.info(
                f"🗑️  Deleted {deleted} transaction scores for investigation {investigation_id}"
            )
            return deleted
            
        except Exception as e:
            logger.error(
                f"❌ Failed to delete transaction scores for investigation {investigation_id}: {e}",
                exc_info=True
            )
            db.rollback()
            raise
        finally:
            if close_db:
                db.close()
    
    @staticmethod
    def get_score_count(
        investigation_id: str,
        db: Optional[Session] = None
    ) -> int:
        """
        Get count of transaction scores for an investigation.
        
        Args:
            investigation_id: Investigation ID
            db: Optional database session
            
        Returns:
            Number of scores
        """
        if db is None:
            db_gen = get_db()
            db = next(db_gen)
            close_db = True
        else:
            close_db = False
            
        try:
            count = db.query(TransactionScore).filter(
                TransactionScore.investigation_id == investigation_id
            ).count()
            
            return count
            
        finally:
            if close_db:
                db.close()


