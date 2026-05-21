import { reactive, computed } from 'vue';
import type { Novel, Volume, Chapter, ChapterSeries, ChapterRelation, Character, Scene, Item, DailyWordRecord, DayCount, ExportBundle } from './types';

const STORAGE_KEY = 'novel-workshop-data';
const TIMESTAMP_KEY = 'novel-workshop-timestamp';
const DRAFT_PREFIX = 'novel-draft-';
const BACKUP_PREFIX = 'novel-backup-';
const MAX_BACKUPS = 5;
const EMPTY_SEARCH_RESULTS = Object.freeze({
  chapters: [] as Chapter[],
  characters: [] as Character[],
  scenes: [] as Scene[],
  items: [] as Item[],
});

function loadFromStorage(): Novel {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const novel = JSON.parse(data);
      // Backward compat: ensure volumes exists
      if (!novel.volumes || !Array.isArray(novel.volumes)) {
        novel.volumes = [];
      }
      if (!novel.chapterSeries || !Array.isArray(novel.chapterSeries)) {
        novel.chapterSeries = [];
      }
      if (!novel.chapterRelations || !Array.isArray(novel.chapterRelations)) {
        novel.chapterRelations = [];
      }
      // Backward compat: ensure every chapter has volumeId
      if (novel.volumes.length === 0 && novel.chapters && novel.chapters.length > 0) {
        const defaultVolume: Volume = {
          id: Date.now().toString(),
          title: '默认卷',
          order: 0,
          createdAt: new Date().toISOString(),
        };
        novel.volumes = [defaultVolume];
        novel.chapters.forEach((c: Chapter) => { c.volumeId = defaultVolume.id; });
      }
      if (novel.chapters && Array.isArray(novel.chapters)) {
        novel.chapters.forEach((c: Chapter) => {
          if (!c.volumeId && novel.volumes.length > 0) {
            c.volumeId = novel.volumes[0].id;
          }
          if (c.outline === undefined) c.outline = '';
          if (c.authorNote === undefined) c.authorNote = '';
        });
      }
      if (novel.chapterSeries && Array.isArray(novel.chapterSeries)) {
        novel.chapterSeries.forEach((s: ChapterSeries) => {
          if (!Array.isArray(s.chapterIds)) s.chapterIds = [];
        });
      }
      // Backward compat: ensure characters have tags
      if (novel.characters && Array.isArray(novel.characters)) {
        novel.characters.forEach((c: Character) => {
          if (!c.tags) c.tags = [];
        });
      }
      // Backward compat: ensure items exists
      if (!novel.items || !Array.isArray(novel.items)) {
        novel.items = [];
      }
      // Backward compat: ensure dayCount exists
      if (!novel.dayCount || typeof novel.dayCount !== 'object' || Array.isArray(novel.dayCount)) {
        novel.dayCount = {};
      }
      return novel;
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
    return {
      title: '我的小说',
      volumes: [],
      chapters: [],
      chapterSeries: [],
      chapterRelations: [],
      characters: [],
      scenes: [],
      items: [],
      dayCount: {},
  };
}

function saveToStorage() {
  try {
    const json = JSON.stringify(state.novel);
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    // Try to push to paired domain
    try {
      const win = window as unknown as Record<string, unknown>;
      if (typeof win.__pushToRemote === 'function') {
        (win.__pushToRemote as (data: string) => void)(json);
      }
    } catch { /* cross-domain push is best-effort */ }
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

const state = reactive({
  novel: loadFromStorage(),
  currentChapterId: null as string | null,
});

export const useStore = () => {
  const totalChapters = computed(() => state.novel.chapters.length);
  const totalWords = computed(() => 
    state.novel.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
  );
  const totalCharacters = computed(() => state.novel.characters.length);
  const totalScenes = computed(() => state.novel.scenes.length);
  const totalItems = computed(() => state.novel.items.length);

  const volumes = computed(() =>
    [...state.novel.volumes].sort((a, b) => a.order - b.order)
  );

  const chapters = computed(() =>
    [...state.novel.chapters].sort((a, b) => a.order - b.order)
  );

  const chapterSeries = computed(() => state.novel.chapterSeries);
  const chapterRelations = computed(() => state.novel.chapterRelations);

  const characters = computed(() => state.novel.characters);
  const scenes = computed(() => state.novel.scenes);
  const items = computed(() => state.novel.items);
  const currentChapter = computed(() => 
    state.novel.chapters.find(c => c.id === state.currentChapterId)
  );

  const parseSafeTimestamp = (dateString: string) => {
    const ts = Date.parse(dateString);
    return Number.isFinite(ts) ? ts : 0;
  };

  const sortByDateDesc = <T>(items: T[], getDate: (item: T) => string) => {
    return [...items].sort((a, b) => parseSafeTimestamp(getDate(b)) - parseSafeTimestamp(getDate(a)));
  };

  function fullTextSearch(query: string) {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return EMPTY_SEARCH_RESULTS;
    }

    const volumeTitleMap = new Map(state.novel.volumes.map(volume => [volume.id, volume.title]));

    const chapters = sortByDateDesc(
      state.novel.chapters
      .filter((chapter) => {
        const volumeTitle = volumeTitleMap.get(chapter.volumeId) ?? '';
        return [
          chapter.title,
          chapter.content,
          chapter.status,
          volumeTitle,
        ].join(' ').toLowerCase().includes(keyword);
      }),
      chapter => chapter.updatedAt
    );

    const characters = sortByDateDesc(
      state.novel.characters
      .filter((character) => {
        return [
          character.name,
          character.role,
          character.description,
          character.gender,
          character.traits.join(' '),
          character.tags.join(' '),
        ].join(' ').toLowerCase().includes(keyword);
      }),
      character => character.createdAt
    );

    const scenes = sortByDateDesc(
      state.novel.scenes
      .filter((scene) => {
        return [
          scene.name,
          scene.location,
          scene.description,
          scene.atmosphere.join(' '),
        ].join(' ').toLowerCase().includes(keyword);
      }),
      scene => scene.createdAt
    );

    const items = sortByDateDesc(
      state.novel.items
      .filter((item) => {
        return [
          item.name,
          item.type,
          item.description,
          item.owner,
          item.abilities.join(' '),
        ].join(' ').toLowerCase().includes(keyword);
      }),
      item => item.createdAt
    );

    return { chapters, characters, scenes, items };
  }

  function setNovelTitle(title: string) {
    state.novel.title = title;
    saveToStorage();
  }

  // === Volume CRUD ===
  function addVolume(title: string) {
    const volume: Volume = {
      id: Date.now().toString(),
      title,
      order: state.novel.volumes.length,
      createdAt: new Date().toISOString(),
    };
    state.novel.volumes.push(volume);
    saveToStorage();
    return volume;
  }

  function updateVolume(id: string, updates: Partial<Pick<Volume, 'title' | 'order'>>) {
    const index = state.novel.volumes.findIndex(v => v.id === id);
    if (index !== -1) {
      state.novel.volumes[index] = { ...state.novel.volumes[index], ...updates } as Volume;
      saveToStorage();
    }
  }

  function deleteVolume(id: string) {
    const index = state.novel.volumes.findIndex(v => v.id === id);
    if (index !== -1) {
      // Reassign chapters to the first remaining volume, or clear volumeId
      const targetId = state.novel.volumes.length > 1
        ? (state.novel.volumes[0]!.id === id ? state.novel.volumes[1]!.id : state.novel.volumes[0]!.id)
        : '';
      state.novel.chapters.forEach(c => {
        if (c.volumeId === id) c.volumeId = targetId;
      });
      state.novel.volumes.splice(index, 1);
      state.novel.volumes.forEach((v, i) => { v.order = i; });
      saveToStorage();
    }
  }

  function moveVolume(id: string, direction: number) {
    const sorted = [...state.novel.volumes].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(v => v.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const target = sorted[newIdx]!;
    const current = sorted[idx]!;
    updateVolume(current.id, { order: target.order });
    updateVolume(target.id, { order: current.order });
  }

  function getChaptersByVolume(volumeId: string): Chapter[] {
    return state.novel.chapters
      .filter(c => c.volumeId === volumeId)
      .sort((a, b) => a.order - b.order);
  }

  function addChapter(chapter: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt' | 'order'>) {
    const volumeChapterCount = state.novel.chapters.filter(c => c.volumeId === chapter.volumeId).length;
    const newChapter: Chapter = {
      ...chapter,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: volumeChapterCount,
    };
    state.novel.chapters.push(newChapter);
    saveToStorage();
    return newChapter;
  }

  function updateChapter(id: string, updates: Partial<Chapter>) {
    const index = state.novel.chapters.findIndex(c => c.id === id);
    if (index !== -1) {
      const chapter = state.novel.chapters[index]!;

      // Calculate word count delta before updating
      if (updates.wordCount !== undefined && updates.wordCount !== chapter.wordCount) {
        const delta = updates.wordCount - chapter.wordCount;
        const today = new Date().toISOString().slice(0, 10);
        if (!state.novel.dayCount[today]) state.novel.dayCount[today] = {};
        const title = (updates.title ?? chapter.title) || '(无标题)';
        state.novel.dayCount[today]![title] = (state.novel.dayCount[today]![title] ?? 0) + delta;
      }

      state.novel.chapters[index] = {
        ...chapter,
        ...updates,
        updatedAt: new Date().toISOString(),
      } as Chapter;
      saveToStorage();
    }
  }

  function deleteChapter(id: string) {
    const index = state.novel.chapters.findIndex(c => c.id === id);
    if (index !== -1) {
      const chapter = state.novel.chapters[index]!;
      const volumeId = chapter.volumeId;
      state.novel.chapters.splice(index, 1);
      state.novel.chapterSeries.forEach(series => {
        series.chapterIds = series.chapterIds.filter(chapterId => chapterId !== id);
      });
      state.novel.chapterRelations = state.novel.chapterRelations.filter(rel =>
        rel.fromChapterId !== id && rel.toChapterId !== id
      );
      state.novel.chapters
        .filter(c => c.volumeId === volumeId)
        .sort((a, b) => a.order - b.order)
        .forEach((c, i) => { c.order = i; });
      saveToStorage();
    }
  }

  function setCurrentChapter(id: string | null) {
    state.currentChapterId = id;
  }

  function addChapterSeries(title: string, chapterIds: string[] = []) {
    const series: ChapterSeries = {
      id: Date.now().toString(),
      title,
      chapterIds: [...new Set(chapterIds)],
      createdAt: new Date().toISOString(),
    };
    state.novel.chapterSeries.push(series);
    saveToStorage();
    return series;
  }

  function updateChapterSeries(id: string, updates: Partial<Pick<ChapterSeries, 'title' | 'chapterIds'>>) {
    const index = state.novel.chapterSeries.findIndex(s => s.id === id);
    if (index !== -1) {
      const current = state.novel.chapterSeries[index]!;
      state.novel.chapterSeries[index] = {
        ...current,
        ...updates,
        chapterIds: updates.chapterIds ? [...new Set(updates.chapterIds)] : current.chapterIds,
      } as ChapterSeries;
      saveToStorage();
    }
  }

  function deleteChapterSeries(id: string) {
    const index = state.novel.chapterSeries.findIndex(s => s.id === id);
    if (index !== -1) {
      state.novel.chapterSeries.splice(index, 1);
      saveToStorage();
    }
  }

  function addChapterRelation(relation: Omit<ChapterRelation, 'id' | 'createdAt'>): ChapterRelation | null {
    if (relation.fromChapterId === relation.toChapterId) return null;
    const hasFrom = state.novel.chapters.some(chapter => chapter.id === relation.fromChapterId);
    const hasTo = state.novel.chapters.some(chapter => chapter.id === relation.toChapterId);
    if (!hasFrom || !hasTo) return null;
    const exists = state.novel.chapterRelations.some(rel =>
      rel.fromChapterId === relation.fromChapterId && rel.toChapterId === relation.toChapterId
    );
    if (exists) return null;
    const newRelation: ChapterRelation = {
      ...relation,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    state.novel.chapterRelations.push(newRelation);
    saveToStorage();
    return newRelation;
  }

  function updateChapterRelation(id: string, updates: Partial<Pick<ChapterRelation, 'fromChapterId' | 'toChapterId' | 'label'>>) {
    const index = state.novel.chapterRelations.findIndex(r => r.id === id);
    if (index !== -1) {
      state.novel.chapterRelations[index] = {
        ...state.novel.chapterRelations[index],
        ...updates,
      } as ChapterRelation;
      saveToStorage();
    }
  }

  function deleteChapterRelation(id: string) {
    const index = state.novel.chapterRelations.findIndex(r => r.id === id);
    if (index !== -1) {
      state.novel.chapterRelations.splice(index, 1);
      saveToStorage();
    }
  }

  function addCharacter(character: Omit<Character, 'id' | 'createdAt'>) {
    const newCharacter: Character = {
      ...character,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    state.novel.characters.push(newCharacter);
    saveToStorage();
    return newCharacter;
  }

  function updateCharacter(id: string, updates: Partial<Character>) {
    const index = state.novel.characters.findIndex(c => c.id === id);
    if (index !== -1) {
      state.novel.characters[index] = {
        ...state.novel.characters[index],
        ...updates,
      } as Character;
      saveToStorage();
    }
  }

  function deleteCharacter(id: string) {
    const index = state.novel.characters.findIndex(c => c.id === id);
    if (index !== -1) {
      state.novel.characters.splice(index, 1);
      saveToStorage();
    }
  }

  function addScene(scene: Omit<Scene, 'id' | 'createdAt'>) {
    const newScene: Scene = {
      ...scene,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    state.novel.scenes.push(newScene);
    saveToStorage();
    return newScene;
  }

  function updateScene(id: string, updates: Partial<Scene>) {
    const index = state.novel.scenes.findIndex(s => s.id === id);
    if (index !== -1) {
      state.novel.scenes[index] = {
        ...state.novel.scenes[index],
        ...updates,
      } as Scene;
      saveToStorage();
    }
  }

  function deleteScene(id: string) {
    const index = state.novel.scenes.findIndex(s => s.id === id);
    if (index !== -1) {
      state.novel.scenes.splice(index, 1);
      saveToStorage();
    }
  }

  // === Item CRUD ===
  function addItem(item: Omit<Item, 'id' | 'createdAt'>) {
    const newItem: Item = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    state.novel.items.push(newItem);
    saveToStorage();
    return newItem;
  }

  function updateItem(id: string, updates: Partial<Item>) {
    const index = state.novel.items.findIndex(i => i.id === id);
    if (index !== -1) {
      state.novel.items[index] = { ...state.novel.items[index], ...updates } as Item;
      saveToStorage();
    }
  }

  function deleteItem(id: string) {
    const index = state.novel.items.findIndex(i => i.id === id);
    if (index !== -1) {
      state.novel.items.splice(index, 1);
      saveToStorage();
    }
  }

  function exportToTxt(): string {
    let content = `# ${state.novel.title}\n\n`;
    content += `## 角色设定\n\n`;
    state.novel.characters.forEach(char => {
      content += `### ${char.name}\n`;
      content += `- 性别: ${char.gender}\n`;
      content += `- 年龄: ${char.age}\n`;
      content += `- 身份: ${char.role}\n`;
      content += `- 描述: ${char.description}\n`;
      if (char.traits.length > 0) {
        content += `- 性格特点: ${char.traits.join(', ')}\n`;
      }
      if (char.tags.length > 0) {
        content += `- 标签: ${char.tags.join(', ')}\n`;
      }
      content += '\n';
    });

    content += `## 场景设定\n\n`;
    state.novel.scenes.forEach(scene => {
      content += `### ${scene.name}\n`;
      content += `- 地点: ${scene.location}\n`;
      content += `- 描述: ${scene.description}\n`;
      if (scene.atmosphere.length > 0) {
        content += `- 氛围: ${scene.atmosphere.join(', ')}\n`;
      }
      content += '\n';
    });

    content += `## 物品设定\n\n`;
    state.novel.items.forEach(item => {
      content += `### ${item.name}\n`;
      content += `- 类型: ${item.type}\n`;
      if (item.owner) content += `- 所属: ${item.owner}\n`;
      content += `- 描述: ${item.description}\n`;
      if (item.abilities.length > 0) {
        content += `- 能力: ${item.abilities.join(', ')}\n`;
      }
      content += '\n';
    });

    content += `## 正文\n\n`;
    [...state.novel.volumes]
      .sort((a, b) => a.order - b.order)
      .forEach(volume => {
        content += `# ${volume.title}\n\n`;
        state.novel.chapters
          .filter(c => c.volumeId === volume.id)
          .sort((a, b) => a.order - b.order)
          .forEach(chapter => {
            content += `### ${chapter.title}\n\n`;
            content += `${chapter.content}\n\n`;
          });
      });

    return content;
  }

  function downloadTxt() {
    const content = exportToTxt();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.novel.title || '小说'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportToJson(): string {
    return JSON.stringify(state.novel, null, 2);
  }

  function downloadJson() {
    const content = exportToJson();
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.novel.title || '小说'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') return false;
      state.novel = {
        title: data.title || '我的小说',
        volumes: Array.isArray(data.volumes) ? data.volumes : [],
        chapters: Array.isArray(data.chapters) ? data.chapters : [],
        chapterSeries: Array.isArray(data.chapterSeries) ? data.chapterSeries : [],
        chapterRelations: Array.isArray(data.chapterRelations) ? data.chapterRelations : [],
        characters: Array.isArray(data.characters) ? data.characters : [],
        scenes: Array.isArray(data.scenes) ? data.scenes : [],
        items: Array.isArray(data.items) ? data.items : [],
        dayCount: (data.dayCount && typeof data.dayCount === 'object' && !Array.isArray(data.dayCount)) ? data.dayCount : {},
      };
      if (!data.dayCount || typeof data.dayCount !== 'object' || Array.isArray(data.dayCount) || Object.keys(data.dayCount).length === 0) {
        rebuildDailyWordRecords();
      }
      saveToStorage();
      return true;
    } catch (e) {
      console.error('Failed to import JSON:', e);
      return false;
    }
  }

  function importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(importFromJson(text));
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  }

  // === Draft auto-save ===
  interface Draft {
    chapterId: string;
    title: string;
    content: string;
    outline: string;
    authorNote: string;
    wordCount: number;
    savedAt: string;
  }

  function saveDraft(chapterId: string, title: string, content: string, outline: string, authorNote: string, wordCount: number) {
    try {
      const draft: Draft = {
        chapterId,
        title,
        content,
        outline,
        authorNote,
        wordCount,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_PREFIX + chapterId, JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }

  function loadDraft(chapterId: string): Draft | null {
    try {
      const data = localStorage.getItem(DRAFT_PREFIX + chapterId);
      if (data) {
        const draft = JSON.parse(data) as Draft;
        if (draft.outline === undefined) draft.outline = '';
        if (draft.authorNote === undefined) draft.authorNote = '';
        return draft;
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    return null;
  }

  function removeDraft(chapterId: string) {
    localStorage.removeItem(DRAFT_PREFIX + chapterId);
  }

  // === Full-data JSON backup ===
  interface BackupEntry {
    id: string;
    title: string;
    data: Novel;
    createdAt: string;
  }

  function saveBackup() {
    try {
      const id = Date.now().toString();
      const entry: BackupEntry = {
        id,
        title: state.novel.title,
        data: JSON.parse(JSON.stringify(state.novel)),
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(BACKUP_PREFIX + id, JSON.stringify(entry));

      // rotate: keep only the latest N backups
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_PREFIX)) keys.push(key);
      }
      if (keys.length > MAX_BACKUPS) {
        keys
          .sort()
          .slice(0, keys.length - MAX_BACKUPS)
          .forEach(k => localStorage.removeItem(k));
      }

      return id;
    } catch (e) {
      console.error('Failed to save backup:', e);
      return null;
    }
  }

  function listBackups(): BackupEntry[] {
    const backups: BackupEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) backups.push(JSON.parse(data));
        } catch { /* skip corrupt entries */ }
      }
    }
    return backups.sort((a, b) => b.id.localeCompare(a.id));
  }

  function restoreBackup(id: string): boolean {
    try {
      const data = localStorage.getItem(BACKUP_PREFIX + id);
      if (!data) return false;
      const entry: BackupEntry = JSON.parse(data);
      if (!entry.data || typeof entry.data !== 'object') return false;
      state.novel = {
        title: entry.data.title || '我的小说',
        volumes: Array.isArray(entry.data.volumes) ? entry.data.volumes : [],
        chapters: Array.isArray(entry.data.chapters) ? entry.data.chapters : [],
        chapterSeries: Array.isArray(entry.data.chapterSeries) ? entry.data.chapterSeries : [],
        chapterRelations: Array.isArray(entry.data.chapterRelations) ? entry.data.chapterRelations : [],
        characters: Array.isArray(entry.data.characters) ? entry.data.characters : [],
        scenes: Array.isArray(entry.data.scenes) ? entry.data.scenes : [],
        items: Array.isArray(entry.data.items) ? entry.data.items : [],
        dayCount: (entry.data.dayCount && typeof entry.data.dayCount === 'object' && !Array.isArray(entry.data.dayCount)) ? entry.data.dayCount : {},
      };
      if (!entry.data.dayCount || typeof entry.data.dayCount !== 'object' || Array.isArray(entry.data.dayCount) || Object.keys(entry.data.dayCount).length === 0) {
        rebuildDailyWordRecords();
      }
      saveToStorage();
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  }

  function deleteBackup(id: string) {
    localStorage.removeItem(BACKUP_PREFIX + id);
  }

  // === Daily word count ===
  function getDayTotal(date: string): number {
    const entry = state.novel.dayCount[date];
    if (!entry) return 0;
    return Object.values(entry).reduce((s, v) => s + v, 0);
  }

  function rebuildDailyWordRecords() {
    state.novel.dayCount = {};
    for (const ch of state.novel.chapters) {
      const date = ch.createdAt.slice(0, 10);
      if (!state.novel.dayCount[date]) state.novel.dayCount[date] = {};
      const title = ch.title || '(无标题)';
      state.novel.dayCount[date]![title] = (state.novel.dayCount[date]![title] ?? 0) + ch.wordCount;
    }
  }

  const dailyWordRecords = computed(() => {
    const result: DailyWordRecord[] = [];
    for (const date of Object.keys(state.novel.dayCount).sort()) {
      result.push({ date, wordCount: getDayTotal(date) });
    }
    return result;
  });

  function getDailyRecordsForDays(days: number): DailyWordRecord[] {
    const now = new Date();
    const result: DailyWordRecord[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, wordCount: getDayTotal(dateStr) });
    }
    return result;
  }

  function getTodayWordCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return getDayTotal(today);
  }

  function getWeeklyStats(): { today: number; weekAvg: number; trend: 'up' | 'down' | 'flat'; bestDay: DailyWordRecord | null } {
    const records = getDailyRecordsForDays(7);
    const today = records[records.length - 1]?.wordCount ?? 0;
    const sum = records.reduce((s, r) => s + r.wordCount, 0);
    const weekAvg = sum > 0 ? Math.round(sum / 7) : 0;

    const mid = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, mid).reduce((s, r) => s + r.wordCount, 0);
    const secondHalf = records.slice(mid).reduce((s, r) => s + r.wordCount, 0);
    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (secondHalf > firstHalf) trend = 'up';
    else if (secondHalf < firstHalf) trend = 'down';

    let bestDay: DailyWordRecord | null = null;
    for (const r of records) {
      if (!bestDay || r.wordCount > bestDay.wordCount) bestDay = r;
    }

    return { today, weekAvg, trend, bestDay };
  }

  // === Cross-domain sync ===
  function getDataForSync(): string {
    return JSON.stringify(state.novel);
  }

  function setDataFromSync(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (!data || typeof data !== 'object') return false;
      state.novel = {
        title: data.title || '我的小说',
        volumes: Array.isArray(data.volumes) ? data.volumes : [],
        chapters: Array.isArray(data.chapters) ? data.chapters : [],
        chapterSeries: Array.isArray(data.chapterSeries) ? data.chapterSeries : [],
        chapterRelations: Array.isArray(data.chapterRelations) ? data.chapterRelations : [],
        characters: Array.isArray(data.characters) ? data.characters : [],
        scenes: Array.isArray(data.scenes) ? data.scenes : [],
        items: Array.isArray(data.items) ? data.items : [],
        dayCount: (data.dayCount && typeof data.dayCount === 'object' && !Array.isArray(data.dayCount)) ? data.dayCount : {},
      };
      if (!data.dayCount || typeof data.dayCount !== 'object' || Array.isArray(data.dayCount) || Object.keys(data.dayCount).length === 0) {
        rebuildDailyWordRecords();
      }
      saveToStorage();
      return true;
    } catch (e) {
      console.error('Failed to sync data from remote:', e);
      return false;
    }
  }

  function wrapLegacyData(raw: Record<string, unknown>): ExportBundle {
    return {
      version: 0,
      exportedAt: '',
      articles: {
        title: typeof raw.title === 'string' ? raw.title : '我的小说',
        volumes: Array.isArray(raw.volumes) ? raw.volumes as Volume[] : [],
        chapters: Array.isArray(raw.chapters) ? raw.chapters as Chapter[] : [],
        chapterSeries: Array.isArray(raw.chapterSeries) ? raw.chapterSeries as ChapterSeries[] : undefined,
        chapterRelations: Array.isArray(raw.chapterRelations) ? raw.chapterRelations as ChapterRelation[] : undefined,
      },
      dayCount: (raw.dayCount && typeof raw.dayCount === 'object' && !Array.isArray(raw.dayCount))
        ? raw.dayCount as DayCount
        : undefined,
      lore: {
        characters: Array.isArray(raw.characters) ? raw.characters as Character[] : [],
        scenes: Array.isArray(raw.scenes) ? raw.scenes as Scene[] : [],
        items: Array.isArray(raw.items) ? raw.items as Item[] : [],
      },
    };
  }

  function buildExportParts(selected: Set<string>) {
    const result: Record<string, unknown> = {};
    if (selected.has('articles')) {
      result.articles = {
        title: state.novel.title,
        volumes: state.novel.volumes,
        chapters: state.novel.chapters,
        chapterSeries: state.novel.chapterSeries,
        chapterRelations: state.novel.chapterRelations,
      };
    }
    if (selected.has('dayCount')) {
      result.dayCount = state.novel.dayCount;
    }
    if (selected.has('lore')) {
      result.lore = {
        characters: state.novel.characters,
        scenes: state.novel.scenes,
        items: state.novel.items,
      };
    }
    return result;
  }

  function importParts(data: ExportBundle, selected: Set<string>) {
    if (selected.has('articles') && data.articles) {
      state.novel.title = data.articles.title || '我的小说';
      state.novel.volumes = Array.isArray(data.articles.volumes) ? data.articles.volumes : [];
      state.novel.chapters = Array.isArray(data.articles.chapters) ? data.articles.chapters : [];
      state.novel.chapterSeries = Array.isArray(data.articles.chapterSeries) ? data.articles.chapterSeries : [];
      state.novel.chapterRelations = Array.isArray(data.articles.chapterRelations) ? data.articles.chapterRelations : [];
    }
    if (selected.has('dayCount') && data.dayCount && typeof data.dayCount === 'object' && !Array.isArray(data.dayCount)) {
      state.novel.dayCount = data.dayCount;
    }
    if (selected.has('lore') && data.lore) {
      state.novel.characters = Array.isArray(data.lore.characters) ? data.lore.characters : [];
      state.novel.scenes = Array.isArray(data.lore.scenes) ? data.lore.scenes : [];
      state.novel.items = Array.isArray(data.lore.items) ? data.lore.items : [];
    }
    saveToStorage();
  }

  return {
    novel: computed(() => state.novel),
    totalChapters,
    totalWords,
    totalCharacters,
    totalScenes,
    totalItems,
    volumes,
    chapters,
    chapterSeries,
    chapterRelations,
    characters,
    scenes,
    items,
    currentChapter,
    setNovelTitle,
    addVolume,
    updateVolume,
    deleteVolume,
    moveVolume,
    getChaptersByVolume,
    addChapter,
    updateChapter,
    deleteChapter,
    setCurrentChapter,
    addChapterSeries,
    updateChapterSeries,
    deleteChapterSeries,
    addChapterRelation,
    updateChapterRelation,
    deleteChapterRelation,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    addScene,
    updateScene,
    deleteScene,
    addItem,
    updateItem,
    deleteItem,
    exportToTxt,
    downloadTxt,
    exportToJson,
    downloadJson,
    importFromJson,
    importFromFile,
    saveDraft,
    loadDraft,
    removeDraft,
    saveBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    getDataForSync,
    setDataFromSync,
    fullTextSearch,
    dailyWordRecords,
    getDailyRecordsForDays,
    getTodayWordCount,
    getWeeklyStats,
    buildExportParts,
    importParts,
    wrapLegacyData,
  };
};
