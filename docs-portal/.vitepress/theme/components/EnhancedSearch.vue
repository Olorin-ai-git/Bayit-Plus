<template>
  <div class="enhanced-search">
    <button
      class="search-trigger glass-button"
      @click="openSearch"
      :title="isMac ? 'Search (⌘K)' : 'Search (Ctrl+K)'"
    >
      <span class="search-icon">🔍</span>
      <span class="search-text">Search docs...</span>
      <kbd class="search-kbd">{{ isMac ? '⌘' : 'Ctrl' }}K</kbd>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const isMac = computed(() => {
  if (typeof navigator !== 'undefined') {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  }
  return false
})

const openSearch = () => {
  // Trigger VitePress's built-in search
  const searchButton = document.querySelector('.VPNavBarSearch button')
  if (searchButton) {
    (searchButton as HTMLElement).click()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    openSearch()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.enhanced-search {
  display: flex;
  align-items: center;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--vp-blur-md));
  -webkit-backdrop-filter: blur(var(--vp-blur-md));
  border: 1px solid var(--glass-border);
  border-radius: var(--vp-border-radius-sm);
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--vp-transition-fast);
}

.search-trigger:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  color: var(--vp-c-text-1);
}

.search-icon {
  font-size: 1rem;
}

.search-text {
  display: none;
}

@media (min-width: 768px) {
  .search-text {
    display: inline;
  }
}

.search-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  color: var(--vp-c-text-2);
}
</style>
