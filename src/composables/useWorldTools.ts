import { useStore } from '../store';

interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

export function useWorldTools() {
  const store = useStore();

  function getToolDefinitions(): ToolDef[] {
    return [
      {
        type: 'function',
        function: {
          name: 'read_chapter',
          description: '读取指定章节的详细信息，包括标题、内容、大纲、状态、字数、所在卷信息',
          parameters: {
            type: 'object',
            properties: {
              chapterId: { type: 'string', description: '章节的ID' },
            },
            required: ['chapterId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read_character',
          description: '读取指定角色的详细信息，包括姓名、性别、年龄、身份、描述、性格特点',
          parameters: {
            type: 'object',
            properties: {
              characterId: { type: 'string', description: '角色的ID' },
            },
            required: ['characterId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read_location',
          description: '读取指定场景/地点的详细信息，包括场景名称、地点、描述、氛围',
          parameters: {
            type: 'object',
            properties: {
              sceneId: { type: 'string', description: '场景的ID' },
            },
            required: ['sceneId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read_item',
          description: '读取指定物品的详细信息，包括物品名称、类型、描述、所属者、能力',
          parameters: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: '物品的ID' },
            },
            required: ['itemId'],
          },
        },
      },
    ];
  }

  function executeTool(name: string, args: Record<string, string>): string {
    switch (name) {
      case 'read_chapter': {
        const ch = store.chapters.value.find(c => c.id === args.chapterId);
        if (!ch) return JSON.stringify({ error: `未找到章节: ${args.chapterId}` });
        const vol = store.volumes.value.find(v => v.id === ch.volumeId);
        return JSON.stringify({
          id: ch.id,
          title: ch.title,
          content: ch.content,
          outline: ch.outline,
          status: ch.status,
          wordCount: ch.wordCount,
          volumeName: vol?.title ?? '未知',
        });
      }
      case 'read_character': {
        const ch = store.characters.value.find(c => c.id === args.characterId);
        if (!ch) return JSON.stringify({ error: `未找到角色: ${args.characterId}` });
        return JSON.stringify({
          id: ch.id,
          name: ch.name,
          gender: ch.gender,
          age: ch.age,
          role: ch.role,
          description: ch.description,
          traits: ch.traits,
        });
      }
      case 'read_location': {
        const sc = store.scenes.value.find(s => s.id === args.sceneId);
        if (!sc) return JSON.stringify({ error: `未找到场景: ${args.sceneId}` });
        return JSON.stringify({
          id: sc.id,
          name: sc.name,
          location: sc.location,
          description: sc.description,
          atmosphere: sc.atmosphere,
        });
      }
      case 'read_item': {
        const it = store.items.value.find(i => i.id === args.itemId);
        if (!it) return JSON.stringify({ error: `未找到物品: ${args.itemId}` });
        return JSON.stringify({
          id: it.id,
          name: it.name,
          type: it.type,
          description: it.description,
          owner: it.owner,
          abilities: it.abilities,
        });
      }
      default:
        return JSON.stringify({ error: `未知工具: ${name}` });
    }
  }

  return {
    getToolDefinitions,
    executeTool,
  };
}
