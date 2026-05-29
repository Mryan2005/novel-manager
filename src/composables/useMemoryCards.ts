import { ref, watch } from 'vue';
import type { MemoryCard, MemoryCardType } from '../types-world-sim';
import { MEMORY_CARD_TYPE_ORDER } from '../types-world-sim';
import { useNovelManager } from './useNovelManager';

let storageKey = 'novel-workshop-worldsim-memories';
let initialized = false;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(): MemoryCard[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (c: unknown) => c && typeof c === 'object' && typeof (c as MemoryCard).id === 'string'
        );
      }
    }
  } catch { /* ignore */ }
  return [];
}

function save(cards: MemoryCard[]) {
  localStorage.setItem(storageKey, JSON.stringify(cards));
}

const cards = ref<MemoryCard[]>(load());

watch(cards, (v) => save(v), { deep: true });

export function useMemoryCards() {
  if (!initialized) {
    initialized = true;
    const { getKey, activeNovelId, migrateIfNeeded } = useNovelManager();
    migrateIfNeeded();

    storageKey = getKey('novel-workshop-worldsim-memories');

    watch(activeNovelId, () => {
      save(cards.value);
      storageKey = getKey('novel-workshop-worldsim-memories');
      cards.value = load();
    });
  }

  function addCard(type: MemoryCardType, title: string, content: string): MemoryCard {
    const now = Date.now();
    const card: MemoryCard = {
      id: generateId(),
      type,
      title: title || '未命名记忆',
      content,
      createdAt: now,
      updatedAt: now,
    };
    cards.value.push(card);
    return card;
  }

  function updateCard(id: string, partial: Partial<Pick<MemoryCard, 'type' | 'title' | 'content'>>) {
    const card = cards.value.find(c => c.id === id);
    if (!card) return;
    if (partial.type !== undefined) card.type = partial.type;
    if (partial.title !== undefined) card.title = partial.title;
    if (partial.content !== undefined) card.content = partial.content;
    card.updatedAt = Date.now();
  }

  function deleteCard(id: string) {
    const idx = cards.value.findIndex(c => c.id === id);
    if (idx === -1) return;
    cards.value.splice(idx, 1);
  }

  function getCard(id: string): MemoryCard | undefined {
    return cards.value.find(c => c.id === id);
  }

  function getCardsByIds(ids: string[]): MemoryCard[] {
    return ids.map(id => cards.value.find(c => c.id === id)).filter(Boolean) as MemoryCard[];
  }

  function formatMemoriesForPrompt(memories: MemoryCard[]): string {
    if (memories.length === 0) return '';

    const grouped = new Map<MemoryCardType, MemoryCard[]>();
    for (const m of memories) {
      const list = grouped.get(m.type) || [];
      list.push(m);
      grouped.set(m.type, list);
    }

    const parts: string[] = ['# 记忆与上下文'];

    for (const type of MEMORY_CARD_TYPE_ORDER) {
      const typedCards = grouped.get(type);
      if (!typedCards || typedCards.length === 0) continue;
      parts.push(`<${type}>`);
      for (const card of typedCards) {
        parts.push(card.content);
      }
      parts.push(`</${type}>`);
      parts.push('');
    }

    return parts.join('\n').trim();
  }

  return {
    cards,
    addCard,
    updateCard,
    deleteCard,
    getCard,
    getCardsByIds,
    formatMemoriesForPrompt,
  };
}
