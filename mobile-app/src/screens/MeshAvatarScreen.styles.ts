import { StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.primary,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.Text.primary,
    marginBottom: 24,
    width: '100%',
  },
  section: {
    width: '100%',
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.Glass.whiteMedium,
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: 8,
    width: '100%',
  },
  consentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Glass.whiteLight,
  },
  consentLabel: {
    fontSize: 16,
    color: Colors.Text.secondary,
    flex: 1,
  },
  pinInput: {
    width: '100%',
    backgroundColor: Colors.Glass.whiteLight,
    borderRadius: 12,
    padding: 16,
    color: Colors.Text.primary,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: Colors.Glass.whiteStrong,
  },
  progressText: {
    fontSize: 16,
    color: Colors.Text.secondary,
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: Colors.Text.muted,
  },
  readyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.Success.default,
    width: '100%',
  },
  thumbnail: {
    width: 280,
    height: 280,
    borderRadius: 20,
    backgroundColor: Colors.Glass.whiteSubtle,
  },
  errorText: {
    color: Colors.Error.default,
    fontSize: 14,
    textAlign: 'center',
  },
});
