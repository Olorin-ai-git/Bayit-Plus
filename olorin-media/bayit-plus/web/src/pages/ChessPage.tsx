/**
 * Chess game page - Multiplayer chess with AI assistance and voice chat.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, useWindowDimensions, ScrollView, Image, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useDirection } from '../hooks/useDirection';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassResizablePanel } from '@bayit/shared/ui';
import { Gamepad2 } from 'lucide-react';
import axios from 'axios';

// Chess components
import ChessBoard from '../components/chess/ChessBoard';
import ChessChat from '../components/chess/ChessChat';
import ChessControls from '../components/chess/ChessControls';
import MoveHistory from '../components/chess/MoveHistory';
import PlayerCard from '../components/chess/PlayerCard';
import CreateGameModal from '../components/chess/CreateGameModal';
import JoinGameModal from '../components/chess/JoinGameModal';
import useChessGame from '../hooks/useChessGame';

// Navigation state interface for voice command invites
interface ChessPageState {
  startGame?: boolean;
  inviteFriend?: string;
}

export default function ChessPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const navigationState = location.state as ChessPageState | undefined;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteProcessed, setInviteProcessed] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const {
    game,
    chatMessages,
    isConnected,
    error,
    createGame,
    joinGame,
    makeMove,
    sendChatMessage,
    resign,
    offerDraw,
    leaveGame,
  } = useChessGame();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  // Handle voice command game invite
  useEffect(() => {
    const handleVoiceInvite = async () => {
      if (navigationState?.startGame && navigationState?.inviteFriend && !inviteProcessed && token) {
        setInviteProcessed(true);
        setInviteStatus(t('chess.sendingInvite', { name: navigationState.inviteFriend }));
        
        try {
          const response = await axios.post('/api/v1/chess/invite', {
            friend_name: navigationState.inviteFriend,
            color: 'white',
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            setInviteStatus(t('chess.inviteSent', { 
              name: response.data.friend.name,
              code: response.data.game_code 
            }));
            
            // Connect to the game
            await joinGame(response.data.game_code);
          } else {
            setInviteStatus(t('chess.inviteFailed'));
          }
        } catch (err: any) {
          const errorMessage = err.response?.data?.detail || t('chess.inviteFailed');
          setInviteStatus(errorMessage);
          console.error('[Chess] Failed to send invite:', err);
        }
        
        // Clear status after 5 seconds
        setTimeout(() => setInviteStatus(null), 5000);
      }
    };
    
    handleVoiceInvite();
  }, [navigationState, inviteProcessed, token, t, joinGame]);

  // Show splash screen for at least 3 seconds on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Determine if it's the current user's turn
  const isPlayerTurn = () => {
    if (!game || !user) return false;

    const isWhitePlayer = game.white_player?.user_id === user.id;
    const isBlackPlayer = game.black_player?.user_id === user.id;

    if (!isWhitePlayer && !isBlackPlayer) return false;

    return (
      (isWhitePlayer && game.current_turn === 'white') ||
      (isBlackPlayer && game.current_turn === 'black')
    );
  };

  // Determine board orientation (flip for black player)
  const isBoardFlipped = () => {
    if (!game || !user) return false;
    return game.black_player?.user_id === user.id;
  };

  const handleCreateGame = async (
    color: 'white' | 'black',
    timeControl?: number,
    gameMode?: 'pvp' | 'bot',
    botDifficulty?: 'easy' | 'medium' | 'hard'
  ) => {
    await createGame(color, timeControl, gameMode, botDifficulty);
  };

  const handleJoinGame = async (gameCode: string) => {
    await joinGame(gameCode);
  };

  const handleNewGame = () => {
    leaveGame();
    setShowCreateModal(true);
  };

  // Show splash screen on initial load
  if (showSplash) {
    return (
      <Animated.View className="absolute inset-0 w-full h-full bg-black justify-center items-center z-[9999]" style={{ opacity: fadeAnim }}>
        <Image
          source={{ uri: '/assets/games/chess/splash.png' }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </Animated.View>
    );
  }

  // No active game - show lobby
  if (!game) {
    return (
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className={`items-center gap-4 py-6 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'}`}>
          <View className="w-15 h-15 rounded-full bg-purple-500/20 justify-center items-center">
            <Gamepad2 size={32} color={colors.primary} />
          </View>
          <Text className={`text-white text-3xl font-bold ${textAlign === 'right' ? 'text-right' : ''}`}>
            {t('chess.title')}
          </Text>
        </View>

        {/* Voice Invite Status */}
        {inviteStatus && (
          <View className="bg-purple-500/30 py-2 px-4 rounded-lg mx-6 mb-4">
            <Text className="text-white text-sm text-center">{inviteStatus}</Text>
          </View>
        )}

        {/* Lobby */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-full max-w-[500px] bg-black/50 backdrop-blur-3xl rounded-2xl p-8 items-center">
            <Text className={`text-white text-3xl font-bold mb-2 ${textAlign === 'right' ? 'text-right' : ''}`}>
              {t('chess.welcome')}
            </Text>
            <Text className={`text-gray-400 text-base mb-8 ${textAlign === 'right' ? 'text-right' : ''}`}>
              {t('chess.subtitle')}
            </Text>

            <View className="w-full gap-4">
              <View
                className="bg-purple-600 py-4 px-6 rounded-xl items-center"
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => setShowCreateModal(true)}
              >
                <Text className="text-black text-base font-semibold">{t('chess.createGame')}</Text>
              </View>

              <View
                className="bg-white/10 py-4 px-6 rounded-xl items-center"
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => setShowJoinModal(true)}
              >
                <Text className="text-white text-base font-semibold">
                  {t('chess.joinGame')}
                </Text>
              </View>
            </View>

            {error && (
              <Text className="text-red-500 text-sm text-center mt-2">{error}</Text>
            )}
          </View>
        </View>

        {/* Modals */}
        <CreateGameModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGame}
        />

        <JoinGameModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinGame}
        />
      </View>
    );
  }

  // Active game layout
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}>
      {/* Game code display */}
      <View className="flex-row items-center justify-center gap-2 py-4 bg-purple-500/20 rounded-xl my-4">
        <Text className="text-gray-400 text-sm">{t('chess.gameCode')}:</Text>
        <Text className="text-purple-600 text-2xl font-bold tracking-wider">{game.game_code}</Text>
        {!isConnected && (
          <Text className="text-yellow-500 text-xs italic">{t('chess.reconnecting')}</Text>
        )}
      </View>

      <View className={`gap-6 ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* Left Panel - Board */}
        <View className="flex-[2]">
          {/* Opponent Card */}
          <PlayerCard
            player={isBoardFlipped() ? game.white_player : game.black_player}
            isCurrentTurn={!isPlayerTurn()}
          />

          {/* Chess Board */}
          <ChessBoard
            game={game}
            onMove={makeMove}
            isFlipped={isBoardFlipped()}
            isPlayerTurn={isPlayerTurn()}
            showHints={showHints}
          />

          {/* Player Card */}
          <PlayerCard
            player={isBoardFlipped() ? game.black_player : game.white_player}
            isCurrentTurn={isPlayerTurn()}
            isHost={game.white_player?.user_id === user?.id || game.black_player?.user_id === user?.id}
          />

          {/* Controls */}
          <ChessControls
            game={game}
            onResign={resign}
            onOfferDraw={offerDraw}
            onNewGame={handleNewGame}
            showHints={showHints}
            onToggleHints={setShowHints}
          />

          {/* Game status */}
          {game.status !== 'active' && game.status !== 'waiting' && (
            <View className="mt-4 p-4 bg-purple-500/30 rounded-xl items-center">
              <Text className="text-white text-lg font-bold">
                {game.status === 'checkmate' && t('chess.checkmate')}
                {game.status === 'stalemate' && t('chess.stalemate')}
                {game.status === 'draw' && t('chess.draw')}
                {game.status === 'resigned' && t('chess.resigned')}
              </Text>
            </View>
          )}

          {error && (
            <Text className="text-red-500 text-sm text-center mt-2">{error}</Text>
          )}
        </View>

        {/* Right Panel - Chat & History */}
        <GlassResizablePanel
          defaultWidth={400}
          minWidth={320}
          maxWidth={600}
          position="right"
        >
          <MoveHistory moves={game.move_history} />
          <ChessChat
            gameCode={game.game_code}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            voiceEnabled={game.voice_enabled}
          />
        </GlassResizablePanel>
      </View>
    </ScrollView>
  );
}
