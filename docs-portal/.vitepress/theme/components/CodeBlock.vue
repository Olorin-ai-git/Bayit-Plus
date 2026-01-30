<template>
  <div class="glass-code-block">
    <div v-if="title" class="glass-code-title">
      <span>{{ title }}</span>
      <span v-if="language" class="glass-code-language">{{ language }}</span>
    </div>
    <div class="glass-code-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  language?: string
}>()
</script>

<style scoped>
.glass-code-block {
  background: var(--vp-code-bg);
  backdrop-filter: blur(var(--vp-blur-md));
  -webkit-backdrop-filter: blur(var(--vp-blur-md));
  border: 1px solid var(--vp-code-border);
  border-radius: var(--vp-border-radius-md);
  overflow: hidden;
  margin: var(--vp-space-4) 0;
}

.glass-code-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid var(--vp-code-border);
  padding: var(--vp-space-2) var(--vp-space-4);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.glass-code-language {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--vp-c-brand);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.glass-code-content {
  padding: var(--vp-space-4);
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.7;
}

.glass-code-content::-webkit-scrollbar {
  height: 6px;
}

.glass-code-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.glass-code-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.glass-code-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
