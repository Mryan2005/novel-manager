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

export interface Novel {
  title: string;
  volumes: Volume[];
  chapters: Chapter[];
  characters: Character[];
  scenes: Scene[];
  items: Item[];
}
