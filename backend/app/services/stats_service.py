from datetime import datetime
from typing import List, Optional

from app.models.chess import ChessGame, GameStatus
from app.models.friendship import GameResult, PlayerStats
from beanie.operators import And, Or


class StatsService:
    """Service for managing player statistics"""

    @staticmethod
    async def record_game_result(game: ChessGame) -> GameResult:
        """Record game result and update player stats"""
        if game.status not in [
            GameStatus.CHECKMATE,
            GameStatus.DRAW,
            GameStatus.RESIGNED,
            GameStatus.TIMEOUT,
        ]:
            raise ValueError("Game is not finished")

        # Determine winner
        winner_id = None
        result = None

        if game.status == GameStatus.CHECKMATE:
            # Winner is opposite of current turn (they delivered checkmate)
            if game.current_turn == "white":
                winner_id = game.black_player.user_id if game.black_player else None
                result = "black_wins"
            else:
                winner_id = game.white_player.user_id if game.white_player else None
                result = "white_wins"
        elif game.status == GameStatus.RESIGNED:
            # Winner is opposite of resigner
            if game.current_turn == "white":
                winner_id = game.black_player.user_id if game.black_player else None
                result = "resigned"
            else:
                winner_id = game.white_player.user_id if game.white_player else None
                result = "resigned"
        elif game.status == GameStatus.DRAW:
            result = "draw"
        elif game.status == GameStatus.TIMEOUT:
            result = "timeout"

        # Create game result record
        game_result = GameResult(
            game_id=str(game.id),
            white_player_id=game.white_player.user_id if game.white_player else "",
            white_player_name=game.white_player.user_name if game.white_player else "",
            black_player_id=game.black_player.user_id if game.black_player else "",
            black_player_name=game.black_player.user_name if game.black_player else "",
            winner_id=winner_id,
            result=result,
            move_count=len(game.move_history),
        )
        await game_result.insert()

        # Update player stats
        if game.white_player:
            await StatsService.update_player_stats(
                game.white_player.user_id,
                won=(winner_id == game.white_player.user_id),
                drawn=(result == "draw"),
            )

        if game.black_player:
            await StatsService.update_player_stats(
                game.black_player.user_id,
                won=(winner_id == game.black_player.user_id),
                drawn=(result == "draw"),
            )

        return game_result

    @staticmethod
    async def update_player_stats(user_id: str, won: bool, drawn: bool):
        """Update player statistics after a game"""
        stats = await PlayerStats.find_one(PlayerStats.user_id == user_id)

        if not stats:
            stats = PlayerStats(user_id=user_id)

        stats.chess_games_played += 1

        if won:
            stats.chess_wins += 1
            stats.current_win_streak += 1
            if stats.current_win_streak > stats.best_win_streak:
                stats.best_win_streak = stats.current_win_streak

            # Simple ELO update (+15 for win)
            stats.chess_rating += 15
        elif drawn:
            stats.chess_draws += 1
            stats.current_win_streak = 0
        else:
            stats.chess_losses += 1
            stats.current_win_streak = 0

            # Simple ELO update (-10 for loss)
            stats.chess_rating = max(100, stats.chess_rating - 10)

        # Update peak rating
        if stats.chess_rating > stats.peak_rating:
            stats.peak_rating = stats.chess_rating

        # Calculate win rate
        total_decisive = stats.chess_wins + stats.chess_losses
        if total_decisive > 0:
            stats.chess_win_rate = (stats.chess_wins / total_decisive) * 100

        stats.last_game_at = datetime.utcnow()
        stats.updated_at = datetime.utcnow()

        await stats.save()

    @staticmethod
    async def get_player_stats(user_id: str) -> Optional[PlayerStats]:
        """Get player statistics"""
        stats = await PlayerStats.find_one(PlayerStats.user_id == user_id)

        if not stats:
            # Create initial stats
            stats = PlayerStats(user_id=user_id)
            await stats.insert()

        return stats

    @staticmethod
    async def get_match_history(
        user_id: str, opponent_id: Optional[str] = None, limit: int = 50
    ) -> List[GameResult]:
        """Get match history for a user, optionally filtered by opponent"""
        query = Or(
            GameResult.white_player_id == user_id, GameResult.black_player_id == user_id
        )

        if opponent_id:
            query = And(
                query,
                Or(
                    GameResult.white_player_id == opponent_id,
                    GameResult.black_player_id == opponent_id,
                ),
            )

        results = await GameResult.find(query).sort("-played_at").limit(limit).to_list()
        return results

    @staticmethod
    async def get_head_to_head_stats(user1_id: str, user2_id: str) -> dict:
        """Get head-to-head statistics between two players"""
        results = await StatsService.get_match_history(user1_id, user2_id)

        user1_wins = 0
        user2_wins = 0
        draws = 0

        for result in results:
            if result.result == "draw":
                draws += 1
            elif result.winner_id == user1_id:
                user1_wins += 1
            elif result.winner_id == user2_id:
                user2_wins += 1

        return {
            "total_games": len(results),
            "user1_wins": user1_wins,
            "user2_wins": user2_wins,
            "draws": draws,
            "recent_games": [r.dict() for r in results[:10]],
        }

    @staticmethod
    async def get_leaderboard(limit: int = 100) -> List[dict]:
        """Get top players by rating"""
        top_stats = (
            await PlayerStats.find().sort("-chess_rating").limit(limit).to_list()
        )

        leaderboard = []
        for idx, stats in enumerate(top_stats, start=1):
            # Get user info
            from app.models.user import User

            user = await User.get(stats.user_id)

            leaderboard.append(
                {
                    "rank": idx,
                    "user_id": stats.user_id,
                    "name": user.name if user else "Unknown",
                    "avatar": user.avatar if user else None,
                    "rating": stats.chess_rating,
                    "games_played": stats.chess_games_played,
                    "wins": stats.chess_wins,
                    "losses": stats.chess_losses,
                    "draws": stats.chess_draws,
                    "win_rate": stats.chess_win_rate,
                    "win_streak": stats.current_win_streak,
                }
            )

        return leaderboard
