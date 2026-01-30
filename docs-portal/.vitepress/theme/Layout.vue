<template>
  <Layout>
    <template #doc-after>
      <FeedbackWidget />
    </template>
  </Layout>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import FeedbackWidget from './components/FeedbackWidget.vue'

const { Layout } = DefaultTheme
</script>
