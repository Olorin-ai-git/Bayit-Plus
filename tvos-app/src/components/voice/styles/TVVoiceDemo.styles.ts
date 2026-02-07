/** Layout and step content styles for TVVoiceDemo component */
import { StyleSheet } from 'react-native';
export { navStyles } from './TVVoiceDemoNav.styles';

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 30,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    transform: [{ scale: 1.1 }],
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A855F7',
  },
  progressText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A855F7',
    textAlign: 'center',
  },
  stepsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  stepContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  currentStepContent: {
    opacity: 1,
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    fontSize: 48,
    fontWeight: '700',
    color: '#A855F7',
    textAlign: 'center',
    lineHeight: 80,
  },
  menuButtonGraphic: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderWidth: 4,
    borderColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  menuButtonText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#A855F7',
    letterSpacing: 2,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  microphoneIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  microphoneIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listeningText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#A855F7',
  },
  transcriptBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A855F7',
    padding: 24,
    marginBottom: 30,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#AAAAAA',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 28,
    fontWeight: '400',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 40,
  },
});

export default styles;
