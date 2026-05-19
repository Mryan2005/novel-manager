export interface Volume {
  id: string;
  title: string;
  order: number;
  createdAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  outline: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in-progress' | 'completed';
  order: number;
  volumeId: string;
}

export interface Character {
  id: string;
  name: string;
  avatar?: string;
  gender: string;
  age: number;
  role: string;
  description: string;
  traits: string[];
  tags: string[];
  createdAt: string;
}

export interface Scene {
  id: string;
  name: string;
  location: string;
  description: string;
  atmosphere: string[];
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  type: string;
  description: string;
  owner: string;
  abilities: string[];
  createdAt: string;
}

// dayCount: { "2026-05-17": { "章节标题": 字数变化, ... }, ... }
export interface DayCount {
  [date: string]: { [chapterTitle: string]: number };
}

export interface DailyWordRecord {
  date: string;
  wordCount: number;
}

export interface Novel {
  title: string;
  volumes: Volume[];
  chapters: Chapter[];
  characters: Character[];
  scenes: Scene[];
  items: Item[];
  dayCount: DayCount;
}

export interface ExportBundle {
  version: number;
  exportedAt: string;
  articles?: { title: string; volumes: Volume[]; chapters: Chapter[] };
  dayCount?: DayCount;
  lore?: { characters: Character[]; scenes: Scene[]; items: Item[] };
  settings?: unknown;
  aiChats?: unknown[];
}
