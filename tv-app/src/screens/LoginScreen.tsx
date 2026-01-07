import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { QrCode, Mic, Keyboard, RefreshCw, X } from 'lucide-react-native';
import { useAuthStore } from '@bayit/shared/stores';
import { useDevicePairingStore, useOnboardingAIStore } from '@bayit/shared/stores';
import { AnimatedLogo, GlassView, GlassButton } from '@bayit/shared/components';
import { BayitMascot } from '@bayit/shared/components/ai';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@bayit/shared/hooks';

type AuthMethod = 'qr' | 'voice' | 'traditional';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();

  // Auth store
  const { login, isLoading: authLoading, error: authError, clearError, isAuthenticated } = useAuthStore();

  // Device pairing store
  const {
    sessionId,
    qrCodeData,
    expiresAt,
    pairingStatus,
    companionDeviceInfo,
    error: pairingError,
    initSession,
    connect,
    disconnect,
    reset: resetPairing,
  } = useDevicePairingStore();

  // AI Onboarding store
  const {
    conversationId,
    messages,
    currentStep,
    collectedData,
    mascotMood,
    mascotAnimation,
    isProcessing,
    readyForCompletion,
    error: onboardingError,
    startOnboarding,
    sendMessage,
    completeOnboarding,
    cancelOnboarding,
    setIsListening,
  } = useOnboardingAIStore();

  // Local state
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>('qr');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [voiceInput, setVoiceInput] = useState('');

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Navigate on successful auth
  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('ProfileSelection');
    }
  }, [isAuthenticated, navigation]);

  // Initialize QR pairing when QR tab is selected
  useEffect(() => {
    if (selectedMethod === 'qr' && !sessionId) {
      initQRSession();
    }
  }, [selectedMethod]);

  // Connect WebSocket when session is created
  useEffect(() => {
    if (sessionId && selectedMethod === 'qr') {
      connect();
    }
    return () => {
      if (sessionId) {
        disconnect();
      }
    };
  }, [sessionId]);

  // Handle pairing success
  useEffect(() => {
    if (pairingStatus === 'success') {
      navigation.replace('ProfileSelection');
    }
  }, [pairingStatus, navigation]);

  // Start voice onboarding when voice tab is selected
  useEffect(() => {
    if (selectedMethod === 'voice' && !conversationId) {
      startOnboarding('he');
    }
  }, [selectedMethod]);

  const initQRSession = async () => {
    await initSession();
  };

  const handleRefreshQR = async () => {
    resetPairing();
    await initSession();
    connect();
  };

  const handleTraditionalLogin = async () => {
    if (!email || !password) return;
    try {
      await login(email, password);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleVoiceSend = async () => {
    if (!voiceInput.trim()) return;
    await sendMessage(voiceInput, 'text');
    setVoiceInput('');
  };

  const handleVoiceComplete = async () => {
    await completeOnboarding();
  };

  const renderMethodTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedMethod === 'qr' && styles.tabActive]}
        onPress={() => setSelectedMethod('qr')}
      >
        <QrCode size={24} color={selectedMethod === 'qr' ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, selectedMethod === 'qr' && styles.tabTextActive]}>
          {t('login.methodQR', 'QR Code')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedMethod === 'voice' && styles.tabActive]}
        onPress={() => setSelectedMethod('voice')}
      >
        <Mic size={24} color={selectedMethod === 'voice' ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, selectedMethod === 'voice' && styles.tabTextActive]}>
          {t('login.methodVoice', 'Voice')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedMethod === 'traditional' && styles.tabActive]}
        onPress={() => setSelectedMethod('traditional')}
      >
        <Keyboard size={24} color={selectedMethod === 'traditional' ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, selectedMethod === 'traditional' && styles.tabTextActive]}>
          {t('login.methodTraditional', 'Email')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderQRMethod = () => (
    <View style={styles.methodContent}>
      <Text style={styles.methodTitle}>{t('login.qrTitle', 'Scan to Login')}</Text>
      <Text style={styles.methodDescription}>
        {t('login.qrDescription', 'Scan this QR code with your phone to login without typing')}
      </Text>

      <View style={styles.qrContainer}>
        {pairingStatus === 'waiting' && qrCodeData ? (
          <>
            <Image
              source={{ uri: `data:image/png;base64,${qrCodeData}` }}
              style={styles.qrCode}
              resizeMode="contain"
            />
            <Text style={styles.qrUrl}>bayit.plus/tv-login</Text>
            {expiresAt && (
              <Text style={styles.expiresText}>
                {t('login.expiresIn', 'Expires in 5 minutes')}
              </Text>
            )}
          </>
        ) : pairingStatus === 'scanning' ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>
              {t('login.companionConnected', 'Phone connected!')}
            </Text>
            {companionDeviceInfo && (
              <Text style={styles.deviceInfo}>
                {companionDeviceInfo.deviceType} - {companionDeviceInfo.browser}
              </Text>
            )}
          </View>
        ) : pairingStatus === 'authenticating' ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>
              {t('login.authenticating', 'Logging you in...')}
            </Text>
          </View>
        ) : pairingStatus === 'expired' || pairingError ? (
          <View style={styles.statusContainer}>
            <Text style={styles.errorText}>
              {pairingError || t('login.sessionExpired', 'Session expired')}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshQR}>
              <RefreshCw size={20} color={colors.primary} />
              <Text style={styles.refreshText}>{t('login.refreshQR', 'Generate New Code')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>{t('login.generatingQR', 'Generating QR code...')}</Text>
          </View>
        )}
      </View>

      <View style={styles.stepsContainer}>
        <Text style={styles.stepsTitle}>{t('login.howItWorks', 'How it works:')}</Text>
        <Text style={styles.step}>1. {t('login.step1', 'Open camera on your phone')}</Text>
        <Text style={styles.step}>2. {t('login.step2', 'Scan the QR code above')}</Text>
        <Text style={styles.step}>3. {t('login.step3', 'Login on your phone')}</Text>
        <Text style={styles.step}>4. {t('login.step4', 'TV logs in automatically!')}</Text>
      </View>
    </View>
  );

  const renderVoiceMethod = () => (
    <View style={styles.methodContent}>
      <View style={styles.mascotContainer}>
        <BayitMascot
          size={180}
          mood={mascotMood}
          animation={mascotAnimation}
        />
      </View>

      <ScrollView style={styles.chatContainer} contentContainerStyle={styles.chatContent}>
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <Text style={styles.messageText}>{msg.content}</Text>
          </View>
        ))}

        {isProcessing && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>{t('login.bayitThinking', 'Bayit is thinking...')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={styles.voiceInputContainer}>
        <TextInput
          style={styles.voiceInput}
          value={voiceInput}
          onChangeText={setVoiceInput}
          placeholder={t('login.voicePlaceholder', 'Type your response...')}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleVoiceSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleVoiceSend}
          disabled={isProcessing || !voiceInput.trim()}
        >
          <Text style={styles.sendButtonText}>{t('login.send', 'Send')}</Text>
        </TouchableOpacity>
      </View>

      {/* Collected data preview */}
      {(collectedData.name || collectedData.email) && (
        <View style={styles.collectedDataContainer}>
          {collectedData.name && (
            <Text style={styles.collectedData}>{t('login.name')}: {collectedData.name}</Text>
          )}
          {collectedData.email && (
            <Text style={styles.collectedData}>{t('login.email')}: {collectedData.email}</Text>
          )}
        </View>
      )}

      {/* Complete button */}
      {readyForCompletion && (
        <GlassButton
          title={t('login.createAccount', 'Create Account')}
          onPress={handleVoiceComplete}
          variant="primary"
          style={styles.completeButton}
        />
      )}

      {onboardingError && (
        <Text style={styles.errorText}>{onboardingError}</Text>
      )}
    </View>
  );

  const renderTraditionalMethod = () => (
    <View style={styles.methodContent}>
      <Text style={[styles.methodTitle, { textAlign }]}>{t('login.title')}</Text>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { textAlign }]}>{t('login.email')}</Text>
        <TextInput
          ref={emailRef}
          style={[styles.input, focusedField === 'email' && styles.inputFocused]}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor="#666666"
          keyboardType="email-address"
          autoCapitalize="none"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          onSubmitEditing={() => passwordRef.current?.focus()}
          returnKeyType="next"
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { textAlign }]}>{t('login.password')}</Text>
        <TextInput
          ref={passwordRef}
          style={[styles.input, focusedField === 'password' && styles.inputFocused]}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#666666"
          secureTextEntry
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          onSubmitEditing={handleTraditionalLogin}
          returnKeyType="done"
        />
      </View>

      {authError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{authError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, authLoading && styles.buttonDisabled]}
        onPress={handleTraditionalLogin}
        disabled={authLoading}
      >
        {authLoading ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <Text style={styles.buttonText}>{t('login.submit')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.registerLink}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.registerText}>
          {t('login.noAccount', "Don't have an account?")} {t('login.register', 'Register')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGradient} pointerEvents="none" />

      <View style={[styles.content, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <AnimatedLogo size="large" />
          <Text style={styles.tagline}>{t('login.tagline')}</Text>
        </View>

        {/* Auth Methods */}
        <GlassView intensity="high" style={styles.authContainer}>
          {renderMethodTabs()}

          {selectedMethod === 'qr' && renderQRMethod()}
          {selectedMethod === 'voice' && renderVoiceMethod()}
          {selectedMethod === 'traditional' && renderTraditionalMethod()}
        </GlassView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  logoContainer: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: 24,
    color: colors.textSecondary,
    marginTop: 24,
    textAlign: 'center',
  },
  authContainer: {
    flex: 0.6,
    maxWidth: 550,
    minHeight: 600,
    padding: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  methodDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCode: {
    width: 180,
    height: 180,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.text,
  },
  qrUrl: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 12,
  },
  expiresText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 32,
  },
  statusText: {
    fontSize: 18,
    color: colors.text,
    marginTop: 16,
  },
  deviceInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
  },
  refreshText: {
    fontSize: 14,
    color: colors.primary,
  },
  stepsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: 16,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  step: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chatContainer: {
    flex: 1,
    maxHeight: 250,
  },
  chatContent: {
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: borderRadius.lg,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  typingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  voiceInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  voiceInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  collectedDataContainer: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: borderRadius.md,
    padding: 12,
    marginTop: 16,
  },
  collectedData: {
    fontSize: 14,
    color: colors.text,
  },
  completeButton: {
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default LoginScreen;
