import { GlassCard, GlassButton, GlassBadge } from '@bayit/glass';
import { CONFIG } from '../../../config/constants';
import { FeatureItem } from './FeatureItem';

type TFn = (key: string, fallback: string) => string;

export function SubscriptionHeader({ onBack, t }: { onBack: () => void; isPremium: boolean; t: TFn }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <GlassButton variant="ghost" onPress={onBack} aria-label={t('common.back', 'Back')}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </GlassButton>
      <h1 className="text-2xl font-bold text-white">{t('subscription.title', 'Subscription')}</h1>
    </div>
  );
}

export function ErrorAlert({ error }: { error: string }) {
  return (
    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg" role="alert" aria-live="assertive">
      <p className="text-red-200 text-sm">{error}</p>
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg" role="status" aria-live="polite">
      <p className="text-green-200 text-sm">{message}</p>
    </div>
  );
}

export function CheckoutPollingBanner({ t }: { t: TFn }) {
  return (
    <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg" role="status" aria-live="polite">
      <p className="text-blue-200 text-sm">
        {t('subscription.waitingForCheckout', 'Waiting for checkout completion... Please complete the payment in the opened tab.')}
      </p>
    </div>
  );
}

export function CurrentPlanCard({ user, isPremium, t }: { user: { email?: string; subscription_tier?: string } | null; isPremium: boolean; t: TFn }) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">{t('subscription.currentPlan', 'Current Plan')}</h2>
          <p className="text-white/60 text-sm">{user?.email}</p>
        </div>
        <GlassBadge variant={isPremium ? 'success' : 'default'} aria-label={`Subscription: ${user?.subscription_tier || 'free'}`}>
          {isPremium ? t('subscription.tier.premium', 'Premium') : t('subscription.tier.free', 'Free')}
        </GlassBadge>
      </div>
      <div className="space-y-3">
        <FeatureItem included={true} text={t('subscription.features.basicDubbing', '5 minutes per day')} />
        <FeatureItem included={isPremium} text={t('subscription.features.unlimited', 'Unlimited dubbing')} />
        <FeatureItem included={isPremium} text={t('subscription.features.prioritySupport', 'Priority support')} />
        <FeatureItem included={isPremium} text={t('subscription.features.noWatermark', 'No watermark')} />
      </div>
    </GlassCard>
  );
}

export function UpgradeCTA({ onUpgrade, isProcessing, t }: { onUpgrade: () => void; isProcessing: boolean; t: TFn }) {
  return (
    <GlassCard className="p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
      <div className="text-center">
        <div className="mb-3">
          <svg className="w-10 h-10 mx-auto text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('subscription.upgradeToPremium', 'Upgrade to Premium')}</h2>
        <p className="text-white/80 mb-4">{t('subscription.upgradeDescription', 'Get unlimited dubbing, priority support, and more')}</p>
        <div className="text-4xl font-bold text-white mb-6">
          ${CONFIG.QUOTA.PREMIUM_TIER_PRICE_USD}
          <span className="text-lg text-white/60 font-normal">{t('subscription.perMonth', '/month')}</span>
        </div>
        <GlassButton variant="primary" onPress={onUpgrade} disabled={isProcessing} className="w-full" aria-label={t('subscription.upgradeNow', 'Upgrade Now')}>
          {isProcessing ? t('common.loading', 'Loading...') : t('subscription.upgradeNow', 'Upgrade Now')}
        </GlassButton>
        <p className="text-white/50 text-xs mt-3">{t('subscription.securePayment', 'Secure payment powered by Stripe')}</p>
      </div>
    </GlassCard>
  );
}

export function ManageSection({ onBillingPortal, onCancel, isProcessing, t }: { onBillingPortal: () => void; onCancel: () => void; isProcessing: boolean; t: TFn }) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-bold text-white mb-4">{t('subscription.manage', 'Manage Subscription')}</h2>
      <div className="space-y-3">
        <GlassButton variant="secondary" onPress={onBillingPortal} disabled={isProcessing} className="w-full" aria-label={t('subscription.billingPortal', 'View Billing History')}>
          {t('subscription.billingPortal', 'View Billing History')}
        </GlassButton>
        <GlassButton variant="secondary" onPress={onCancel} disabled={isProcessing} className="w-full" aria-label={t('subscription.cancel', 'Cancel Subscription')}>
          {t('subscription.cancel', 'Cancel Subscription')}
        </GlassButton>
      </div>
    </GlassCard>
  );
}

export function SupportCard({ t }: { t: TFn }) {
  return (
    <GlassCard className="p-4">
      <p className="text-white/70 text-sm text-center">
        {t('subscription.needHelp', 'Need help?')}{' '}
        <a href={`mailto:${CONFIG.SUPPORT.EMAIL}`} className="text-white hover:text-white/80 underline">
          {t('subscription.contactSupport', 'Contact Support')}
        </a>
      </p>
    </GlassCard>
  );
}
