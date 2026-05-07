export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in-progress' | 'completed';
  order: number;
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

export interface Novel {
  title: string;
  chapters: Chapter[];
  characters: Character[];
  scenes: Scene[];
}
