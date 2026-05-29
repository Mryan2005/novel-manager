<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

const props = withDefaults(defineProps<{
  text: string;
  inline?: boolean;
}>(), {
  inline: false,
});

const html = computed(() => {
  if (!props.text) return '';
  if (props.inline) {
    return marked.parseInline(props.text) as string;
  }
  return marked.parse(props.text) as string;
});
</script>

<template>
  <div v-if="inline" class="md-inline" v-html="html" />
  <div v-else class="md-body" v-html="html" />
</template>

<style>
/* Markdown content styles — unscoped so they apply to v-html */
.md-body {
  line-height: 1.75;
  word-break: break-word;
}

.md-body p {
  margin: 0 0 0.6em 0;
}
.md-body p:last-child {
  margin-bottom: 0;
}

.md-body h1, .md-body h2, .md-body h3, .md-body h4, .md-body h5, .md-body h6 {
  margin: 1em 0 0.4em 0;
  font-weight: 600;
  line-height: 1.3;
}
.md-body h1 { font-size: 1.4em; }
.md-body h2 { font-size: 1.25em; }
.md-body h3 { font-size: 1.1em; }
.md-body h4 { font-size: 1em; }

.md-body ul, .md-body ol {
  margin: 0 0 0.6em 0;
  padding-left: 1.5em;
}
.md-body li {
  margin-bottom: 0.2em;
}

.md-body code {
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.88em;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.06);
}

.md-body pre {
  margin: 0.6em 0;
  padding: 12px 16px;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
  overflow-x: auto;
  font-size: 0.85em;
  line-height: 1.5;
}

.md-body pre code {
  padding: 0;
  font-size: inherit;
  background: none;
  color: inherit;
}

.md-body blockquote {
  margin: 0.6em 0;
  padding: 4px 14px;
  border-left: 3px solid #6366f1;
  background: rgba(99, 102, 241, 0.05);
  color: #475569;
}

.md-body blockquote p:last-child {
  margin-bottom: 0;
}

.md-body table {
  margin: 0.6em 0;
  border-collapse: collapse;
  width: 100%;
}

.md-body th, .md-body td {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  text-align: left;
  font-size: 0.9em;
}

.md-body th {
  background: #f1f5f9;
  font-weight: 600;
}

.md-body hr {
  margin: 1em 0;
  border: none;
  border-top: 1px solid #e2e8f0;
}

.md-body a {
  color: #6366f1;
  text-decoration: underline;
}

.md-body strong {
  font-weight: 600;
}

.md-body img {
  max-width: 100%;
  border-radius: 6px;
}

/* Inline variant */
.md-inline code {
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.88em;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.06);
}

.md-inline a {
  color: #6366f1;
  text-decoration: underline;
}

.md-inline strong {
  font-weight: 600;
}

/* Dark context: inside user bubbles */
.ws-message.user .md-body,
.ai-message.user .md-body {
  color: inherit;
}
.ws-message.user .md-body code,
.ai-message.user .md-body code {
  background: rgba(255, 255, 255, 0.15);
  color: inherit;
}
.ws-message.user .md-body pre,
.ai-message.user .md-body pre {
  background: rgba(0, 0, 0, 0.25);
  color: #e2e8f0;
}
.ws-message.user .md-body blockquote,
.ai-message.user .md-body blockquote {
  border-left-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
}
.ws-message.user .md-body a,
.ai-message.user .md-body a {
  color: #c7d2fe;
}
</style>
