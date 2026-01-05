import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { subscriptionService } from '@/services/api'

const plans = [
  {
    id: 'basic',
    name: 'בסיסי',
    price: '$9.99',
    period: 'לחודש',
    features: [
      'כל תוכן ה-VOD',
      'רדיו ופודקאסטים',
      'צפייה על מכשיר אחד',
      'איכות SD',
    ],
    notIncluded: [
      'ערוצי שידור חי',
      'עוזר AI',
      'צפייה אופליין',
    ],
  },
  {
    id: 'premium',
    name: 'פרימיום',
    price: '$14.99',
    period: 'לחודש',
    popular: true,
    features: [
      'כל תוכן ה-VOD',
      'ערוצי שידור חי',
      'רדיו ופודקאסטים',
      'עוזר AI חכם',
      'צפייה על 2 מכשירים',
      'איכות HD',
    ],
    notIncluded: [
      'צפייה אופליין',
      'פרופילים משפחתיים',
    ],
  },
  {
    id: 'family',
    name: 'משפחתי',
    price: '$19.99',
    period: 'לחודש',
    features: [
      'כל תוכן ה-VOD',
      'ערוצי שידור חי',
      'רדיו ופודקאסטים',
      'עוזר AI חכם',
      'צפייה על 4 מכשירים',
      'איכות 4K',
      '5 פרופילים משפחתיים',
      'הורדה לצפייה אופליין',
    ],
    notIncluded: [],
  },
]

export default function SubscribePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/subscribe' } })
      return
    }

    setLoading(true)
    try {
      const response = await subscriptionService.createCheckout(selectedPlan)
      window.location.href = response.checkoutUrl
    } catch (error) {
      console.error('Failed to create checkout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 relative">
      {/* Decorative blur circles */}
      <div className="blur-circle-primary w-96 h-96 top-0 right-0 absolute opacity-30" />
      <div className="blur-circle-purple w-72 h-72 bottom-0 left-0 absolute opacity-30" />

      {/* Header */}
      <div className="text-center mb-12 relative z-10">
        <h1 className="text-4xl font-bold mb-4">בחר את המסלול שלך</h1>
        <p className="text-dark-400 text-lg max-w-2xl mx-auto">
          7 ימי ניסיון חינם לכל מסלול. בטל בכל עת.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center gap-2 mb-12 relative z-10">
        <div className="glass-tabs">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`glass-tab ${billingPeriod === 'monthly' ? 'glass-tab-active' : ''}`}
          >
            חודשי
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`glass-tab flex items-center gap-2 ${billingPeriod === 'yearly' ? 'glass-tab-active' : ''}`}
          >
            שנתי
            <span className="glass-badge-success text-xs">
              חסכו 2 חודשים
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative z-10">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`relative glass-card p-6 cursor-pointer transition-all duration-300 ${
              selectedPlan === plan.id
                ? 'ring-2 ring-primary-500 scale-105 shadow-glow'
                : 'hover:shadow-glass-lg'
            } ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-3 right-4 glass-btn-purple px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Sparkles size={14} />
                הכי פופולרי
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gradient">{plan.price}</span>
                <span className="text-dark-400">{plan.period}</span>
              </div>
              {billingPeriod === 'yearly' && (
                <p className="text-sm text-green-400 mt-1">
                  ${(parseFloat(plan.price.slice(1)) * 10).toFixed(2)} לשנה
                </p>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-green-400" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
              {plan.notIncluded.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-dark-500">
                  <span className="w-5 h-[2px] bg-dark-600 flex-shrink-0" />
                  <span className="text-sm line-through">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Select Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedPlan(plan.id)
              }}
              className={`w-full justify-center ${
                selectedPlan === plan.id
                  ? 'glass-btn-primary'
                  : 'glass-btn-secondary'
              }`}
            >
              {selectedPlan === plan.id ? 'נבחר' : 'בחר מסלול'}
            </button>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-12 relative z-10">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="glass-btn-primary glass-btn-lg px-12 hover:shadow-glow-lg transition-all"
        >
          {loading ? 'מעבד...' : 'התחל ניסיון חינם'}
        </button>
        <p className="text-dark-500 text-sm mt-4">
          לא יחויב כרטיס האשראי במהלך תקופת הניסיון
        </p>
      </div>
    </div>
  )
}
