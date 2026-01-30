<template>
  <div class="glass-card" :class="variant">
    <div v-if="title" class="glass-card-title">
      {{ title }}
    </div>
    <div class="glass-card-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
}>()
</script>

<style scoped>
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--vp-blur-lg));
  -webkit-backdrop-filter: blur(var(--vp-blur-lg));
  border: 1px solid var(--glass-border);
  border-radius: var(--vp-border-radius-lg);
  padding: var(--vp-space-6);
  margin: var(--vp-space-4) 0;
  transition: all var(--vp-transition-base);
}

.glass-card:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  transform: translateY(-2px);
  box-shadow: var(--vp-shadow-2);
}

.glass-card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: var(--vp-space-3);
}

.glass-card-content {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

/* Variants */
.glass-card.info {
  border-left: 4px solid #3b82f6;
}

.glass-card.success {
  border-left: 4px solid #10b981;
}

.glass-card.warning {
  border-left: 4px solid #f59e0b;
}

.glass-card.error {
  border-left: 4px solid #ef4444;
}
</style>
