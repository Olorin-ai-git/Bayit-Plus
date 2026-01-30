<template>
  <div class="feedback-widget glass-panel">
    <div v-if="!submitted" class="feedback-question">
      <p class="feedback-title">Was this page helpful?</p>
      <div class="feedback-buttons">
        <button
          class="feedback-btn glass-button"
          :class="{ selected: feedback === 'yes' }"
          @click="submitFeedback('yes')"
        >
          <span class="emoji">👍</span>
          <span>Yes</span>
        </button>
        <button
          class="feedback-btn glass-button"
          :class="{ selected: feedback === 'no' }"
          @click="submitFeedback('no')"
        >
          <span class="emoji">👎</span>
          <span>No</span>
        </button>
      </div>
      <div v-if="showComment" class="feedback-comment">
        <textarea
          v-model="comment"
          class="feedback-textarea glass-input"
          placeholder="Tell us more (optional)..."
          rows="3"
        />
        <button
          class="submit-btn glass-button"
          @click="submitWithComment"
        >
          Submit Feedback
        </button>
      </div>
    </div>
    <div v-else class="feedback-thanks">
      <span class="emoji">✅</span>
      <p>Thank you for your feedback!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const feedback = ref<'yes' | 'no' | null>(null)
const comment = ref('')
const showComment = ref(false)
const submitted = ref(false)

// Check if feedback already given for this page
onMounted(() => {
  const key = `feedback-${route.path}`
  const stored = localStorage.getItem(key)
  if (stored) {
    submitted.value = true
  }
})

const submitFeedback = (value: 'yes' | 'no') => {
  feedback.value = value
  showComment.value = value === 'no'

  if (value === 'yes') {
    sendFeedback(value, '')
  }
}

const submitWithComment = () => {
  if (feedback.value) {
    sendFeedback(feedback.value, comment.value)
  }
}

const sendFeedback = async (helpful: 'yes' | 'no', commentText: string) => {
  try {
    // Store feedback locally
    const key = `feedback-${route.path}`
    localStorage.setItem(key, JSON.stringify({
      helpful,
      comment: commentText,
      timestamp: new Date().toISOString(),
      path: route.path
    }))

    // Send to analytics (if configured)
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Feedback', {
        props: {
          path: route.path,
          helpful,
          hasComment: !!commentText
        }
      })
    }

    // Show thank you message
    submitted.value = true
  } catch (error) {
    console.error('Failed to submit feedback:', error)
  }
}
</script>

<style scoped>
.feedback-widget {
  margin: 48px 0 24px;
  padding: 24px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--vp-blur-md));
  -webkit-backdrop-filter: blur(var(--vp-blur-md));
  border: 1px solid var(--glass-border);
  border-radius: var(--vp-border-radius-lg);
}

.feedback-question {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.feedback-buttons {
  display: flex;
  gap: 12px;
}

.feedback-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--vp-border-radius-sm);
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all var(--vp-transition-fast);
}

.feedback-btn:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  transform: translateY(-2px);
}

.feedback-btn.selected {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
}

.feedback-btn .emoji {
  font-size: 1.2rem;
}

.feedback-comment {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feedback-textarea {
  width: 100%;
  padding: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--vp-border-radius-sm);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-base);
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  transition: all var(--vp-transition-fast);
}

.feedback-textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand);
  background: var(--glass-bg-hover);
}

.feedback-textarea::placeholder {
  color: var(--vp-c-text-3);
}

.submit-btn {
  align-self: flex-start;
  padding: 10px 20px;
  background: var(--vp-c-brand);
  border: none;
  border-radius: var(--vp-border-radius-sm);
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--vp-transition-fast);
}

.submit-btn:hover {
  background: var(--vp-c-brand-light);
  transform: translateY(-2px);
}

.feedback-thanks {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--vp-c-text-1);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.feedback-thanks .emoji {
  font-size: 1.5rem;
}

.feedback-thanks p {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}
</style>
