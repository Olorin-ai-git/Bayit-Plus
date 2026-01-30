import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './styles/vars.css'
import './styles/glass.css'
import './styles/custom.css'
import GlassCard from './components/GlassCard.vue'
import CodeBlock from './components/CodeBlock.vue'
import FeedbackWidget from './components/FeedbackWidget.vue'
import EnhancedSearch from './components/EnhancedSearch.vue'
import { initAnalytics, setupAutoTracking } from './utils/analytics'
import type { Theme } from 'vitepress'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    // Register custom components
    app.component('GlassCard', GlassCard)
    app.component('CodeBlock', CodeBlock)
    app.component('FeedbackWidget', FeedbackWidget)
    app.component('EnhancedSearch', EnhancedSearch)

    // Initialize analytics (browser only)
    if (typeof window !== 'undefined') {
      // Initialize Plausible Analytics
      initAnalytics()

      // Setup automatic tracking
      setTimeout(() => {
        setupAutoTracking()
      }, 1000)

      // Track route changes
      router.onAfterRouteChanged = (to) => {
        if (window.plausible) {
          window.plausible('pageview', {
            props: { path: to }
          })
        }
      }
    }
  }
} satisfies Theme
