interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
}

interface NovelData {
  volumes?: { id: string; title: string }[];
  chapters?: { id: string; title: string; content: string; outline: string; status: string; wordCount: number; volumeId: string }[];
  characters?: { id: string; name: string; gender: string; age: number; role: string; description: string; traits: string[] }[];
  scenes?: { id: string; name: string; location: string; description: string; atmosphere: string[] }[];
  items?: { id: string; name: string; type: string; description: string; owner: string; abilities: string[] }[];
}

function loadNovelData(): NovelData {
  try {
    const raw = localStorage.getItem('novel-workshop-data');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return {};
}

function fuzzyMatch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function extractSnippet(content: string, query: string, maxLen: number): string {
  if (!content) return '';
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, maxLen);
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 40);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < content.length ? '...' : '';
  return prefix + content.slice(start, end).replace(/\n/g, ' ') + suffix;
}

/** Scan chapter content for entity names that appear in it */
function findReferencedNames(
  content: string,
  entities: { id: string; name: string }[],
): { id: string; name: string }[] {
  if (!content || entities.length === 0) return [];
  const lower = content.toLowerCase();
  return entities.filter(e => e.name && e.name.length >= 2 && lower.includes(e.name.toLowerCase()));
}

/** Find chapters whose content mentions a given name */
function findChaptersMentioning(
  name: string,
  chapters: NovelData['chapters'],
): { id: string; title: string }[] {
  if (!name || name.length < 2 || !chapters) return [];
  const lower = name.toLowerCase();
  return chapters
    .filter(c => c.content && c.content.toLowerCase().includes(lower))
    .map(c => ({ id: c.id, title: c.title }));
}

export function useWorldTools() {
  function getToolDefinitions(): ToolDef[] {
    return [
      {
        type: 'function',
        function: {
          name: 'read_chapter',
          description:
            '读取指定章节的详细信息（含完整正文内容），同时自动返回该章节中提到的角色、场景、物品列表。可通过章节ID精确查找，或通过章节标题/关键词模糊搜索。',
          parameters: {
            type: 'object',
            properties: {
              chapterId: { type: 'string', description: '章节的ID，精确匹配' },
              name: { type: 'string', description: '章节标题或关键词，模糊搜索' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read_character',
          description:
            '读取指定角色的详细信息，同时自动返回提到该角色的所有章节列表。可通过角色ID精确查找，或通过角色姓名/身份/性格关键词模糊搜索。',
          parameters: {
            type: 'object',
            properties: {
              characterId: { type: 'string', description: '角色的ID，精确匹配' },
              name: { type: 'string', description: '角色姓名或关键词，模糊搜索' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read_location',
          description:
            '读取指定场景/地点的详细信息，同时自动返回提到该场景的所有章节列表。可通过场景ID精确查找，或通过场景名称/地点/氛围关键词模糊搜索。',
          parameters: {
            type: 'object',
            properties: {
              sceneId: { type: 'string', description: '场景的ID，精确匹配' },
              name: { type: 'string', description: '场景名称或关键词，模糊搜索' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_novel',
          description:
            '全局搜索小说数据。在章节（标题+正文）、角色（姓名+身份+描述）、场景（名称+地点+描述）、物品（名称+类型+描述）中同时搜索关键词。返回所有匹配的结果，按类别分组。当你不知道目标属于哪个类别，或想跨类别查找时使用此工具。',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: '搜索关键词' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read_item',
          description:
            '读取指定物品的详细信息，同时自动返回提到该物品的所有章节列表。可通过物品ID精确查找，或通过物品名称/类型/所属者关键词模糊搜索。',
          parameters: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: '物品的ID，精确匹配' },
              name: { type: 'string', description: '物品名称或关键词，模糊搜索' },
            },
          },
        },
      },
    ];
  }

  function executeTool(name: string, args: Record<string, string>): string {
    const data = loadNovelData();
    const chapters = data.chapters || [];
    const volumes = data.volumes || [];
    const characters = data.characters || [];
    const scenes = data.scenes || [];
    const items = data.items || [];

    switch (name) {
      case 'read_chapter': {
        const results = findEntities(
          chapters,
          args.chapterId,
          args.name,
          (c, q) => fuzzyMatch(c.title, q),
        );
        if (results.length === 0) {
          const hint = args.name ? `关键词: "${args.name}"` : `ID: ${args.chapterId}`;
          return JSON.stringify({ error: `未找到匹配的章节 (${hint})` });
        }
        if (results.length > 1) {
          const summaries = results.map(c => ({
            id: c.id,
            title: c.title,
            status: c.status,
            wordCount: c.wordCount,
            volumeName: volumes.find(v => v.id === c.volumeId)?.title ?? '未知',
            outline: (c.outline || c.content || '').slice(0, 80),
          }));
          return JSON.stringify({ matches: summaries, count: results.length, hint: '请使用chapterId指定具体章节获取完整内容' });
        }
        const ch = results[0]!;
        const vol = volumes.find(v => v.id === ch.volumeId);
        const refChars = findReferencedNames(ch.content, characters);
        const refScenes = findReferencedNames(ch.content, scenes);
        const refItems = findReferencedNames(ch.content, items);
        return JSON.stringify({
          id: ch.id,
          title: ch.title,
          content: ch.content,
          outline: ch.outline,
          status: ch.status,
          wordCount: ch.wordCount,
          volumeName: vol?.title ?? '未知',
          referencedCharacters: refChars,
          referencedScenes: refScenes,
          referencedItems: refItems,
        });
      }

      case 'read_character': {
        const results = findEntities(
          characters,
          args.characterId,
          args.name,
          (c, q) => fuzzyMatch(c.name, q) || fuzzyMatch(c.role, q) || c.traits?.some(t => fuzzyMatch(t, q)),
        );
        if (results.length === 0) {
          const hint = args.name ? `关键词: "${args.name}"` : `ID: ${args.characterId}`;
          return JSON.stringify({ error: `未找到匹配的角色 (${hint})` });
        }
        if (results.length > 1) {
          const summaries = results.map(c => ({
            id: c.id,
            name: c.name,
            gender: c.gender,
            age: c.age,
            role: c.role,
            description: (c.description || '').slice(0, 80),
          }));
          return JSON.stringify({ matches: summaries, count: results.length, hint: '请使用characterId指定具体角色获取完整信息' });
        }
        const ch = results[0]!;
        const appearsIn = findChaptersMentioning(ch.name, chapters);
        return JSON.stringify({
          id: ch.id,
          name: ch.name,
          gender: ch.gender,
          age: ch.age,
          role: ch.role,
          description: ch.description,
          traits: ch.traits,
          appearsInChapters: appearsIn,
        });
      }

      case 'read_location': {
        const results = findEntities(
          scenes,
          args.sceneId,
          args.name,
          (s, q) => fuzzyMatch(s.name, q) || fuzzyMatch(s.location, q) || s.atmosphere?.some(a => fuzzyMatch(a, q)),
        );
        if (results.length === 0) {
          const hint = args.name ? `关键词: "${args.name}"` : `ID: ${args.sceneId}`;
          return JSON.stringify({ error: `未找到匹配的场景 (${hint})` });
        }
        if (results.length > 1) {
          const summaries = results.map(s => ({
            id: s.id,
            name: s.name,
            location: s.location,
            description: (s.description || '').slice(0, 80),
          }));
          return JSON.stringify({ matches: summaries, count: results.length, hint: '请使用sceneId指定具体场景获取完整信息' });
        }
        const sc = results[0]!;
        const appearsIn = findChaptersMentioning(sc.name, chapters);
        return JSON.stringify({
          id: sc.id,
          name: sc.name,
          location: sc.location,
          description: sc.description,
          atmosphere: sc.atmosphere,
          appearsInChapters: appearsIn,
        });
      }

      case 'read_item': {
        const results = findEntities(
          items,
          args.itemId,
          args.name,
          (i, q) => fuzzyMatch(i.name, q) || fuzzyMatch(i.type, q) || fuzzyMatch(i.owner, q),
        );
        if (results.length === 0) {
          const hint = args.name ? `关键词: "${args.name}"` : `ID: ${args.itemId}`;
          return JSON.stringify({ error: `未找到匹配的物品 (${hint})` });
        }
        if (results.length > 1) {
          const summaries = results.map(i => ({
            id: i.id,
            name: i.name,
            type: i.type,
            owner: i.owner,
            description: (i.description || '').slice(0, 80),
          }));
          return JSON.stringify({ matches: summaries, count: results.length, hint: '请使用itemId指定具体物品获取完整信息' });
        }
        const it = results[0]!;
        const appearsIn = findChaptersMentioning(it.name, chapters);
        return JSON.stringify({
          id: it.id,
          name: it.name,
          type: it.type,
          description: it.description,
          owner: it.owner,
          abilities: it.abilities,
          appearsInChapters: appearsIn,
        });
      }

      case 'search_novel': {
        const query = args.query;
        if (!query || !query.trim()) {
          return JSON.stringify({ error: '请提供搜索关键词 query' });
        }

        const matchedChapters = (chapters || []).filter(
          c => fuzzyMatch(c.title, query) || fuzzyMatch(c.content || '', query) || fuzzyMatch(c.outline || '', query),
        ).map(c => ({
          id: c.id,
          title: c.title,
          status: c.status,
          snippet: extractSnippet(c.content || '', query, 100),
          volumeName: volumes?.find(v => v.id === c.volumeId)?.title ?? '未知',
        }));

        const matchedCharacters = (characters || []).filter(
          c => fuzzyMatch(c.name, query) || fuzzyMatch(c.role, query) || fuzzyMatch(c.description || '', query) || c.traits?.some(t => fuzzyMatch(t, query)),
        ).map(c => ({ id: c.id, name: c.name, role: c.role, description: (c.description || '').slice(0, 80) }));

        const matchedScenes = (scenes || []).filter(
          s => fuzzyMatch(s.name, query) || fuzzyMatch(s.location, query) || fuzzyMatch(s.description || '', query) || s.atmosphere?.some(a => fuzzyMatch(a, query)),
        ).map(s => ({ id: s.id, name: s.name, location: s.location, description: (s.description || '').slice(0, 80) }));

        const matchedItems = (items || []).filter(
          i => fuzzyMatch(i.name, query) || fuzzyMatch(i.type, query) || fuzzyMatch(i.owner, query) || fuzzyMatch(i.description || '', query),
        ).map(i => ({ id: i.id, name: i.name, type: i.type, owner: i.owner, description: (i.description || '').slice(0, 80) }));

        const total = matchedChapters.length + matchedCharacters.length + matchedScenes.length + matchedItems.length;
        if (total === 0) {
          return JSON.stringify({ query, chapters: [], characters: [], scenes: [], items: [], total: 0, hint: '未找到任何匹配结果，请尝试其他关键词' });
        }

        return JSON.stringify({
          query,
          chapters: matchedChapters,
          characters: matchedCharacters,
          scenes: matchedScenes,
          items: matchedItems,
          total,
          hint: total > 10 ? '结果较多，可缩小搜索范围' : '可使用对应的 read_* 工具通过ID获取详细信息',
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

function findEntities<T extends { id: string }>(
  list: T[],
  id: string | undefined,
  query: string | undefined,
  matchFn: (item: T, query: string) => boolean,
): T[] {
  if (id) {
    const found = list.find(item => item.id === id);
    return found ? [found] : [];
  }
  if (query) {
    return list.filter(item => matchFn(item, query));
  }
  return [];
}
