# 小说工坊 - AGENTS.md

## 项目概览

这是一个基于 Vue 3 + TypeScript + Vite 的小说写作管理工具，帮助作者管理小说创作过程中的章节、角色、场景等要素，并支持导出为 TXT 文件。

### 技术栈
- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **路由**: Vue Router 5
- **样式**: Tailwind CSS 4
- **图标**: Lucide Vue Next

### 核心功能
1. **仪表板** - 展示统计数据（章节数、字数、角色数、场景数）和最近编辑
2. **章节管理** - 创建、编辑、删除、排序章节
3. **角色设定** - 管理小说角色信息
4. **场景设定** - 管理小说场景信息
5. **小说编辑** - 富文本编辑，支持字数统计
6. **导出功能** - 一键导出为 TXT 文件

## 项目结构

```
/workspace/projects/
├── src/
│   ├── components/
│   │   ├── Layout.vue          # 主布局组件（侧边栏导航）
│   │   └── StatCard.vue        # 统计卡片组件
│   ├── views/
│   │   ├── Home.vue            # 仪表板页面
│   │   ├── Chapters.vue        # 章节管理页面
│   │   ├── Characters.vue      # 角色设定页面
│   │   ├── Scenes.vue          # 场景设定页面
│   │   └── Editor.vue          # 编辑器页面
│   ├── router/
│   │   └── index.ts            # 路由配置
│   ├── App.vue                 # 根组件
│   ├── main.ts                 # 应用入口
│   ├── style.css               # 全局样式（Tailwind）
│   ├── store.ts                # 状态管理（localStorage）
│   └── types.ts                # TypeScript 类型定义
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
└── .coze                       # 项目配置文件
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器（端口 5000）
pnpm dev

# 类型检查
pnpm type-check

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 数据存储

所有数据存储在浏览器的 localStorage 中，key 为 `novel-workshop-data`。数据结构见 `src/types.ts`。

## 关键文件说明

### src/store.ts
状态管理核心，包含：
- 数据持久化（localStorage）
- 所有 CRUD 操作
- 导出 TXT 功能

### src/router/index.ts
路由配置，使用 Hash 模式：
- `/home` - 仪表板
- `/chapters` - 章节管理
- `/characters` - 角色设定
- `/scenes` - 场景设定
- `/editor` - 编辑器（可选章节ID参数）

## 设计风格

采用明亮色彩设计：
- **主色**: 绿色 (#10B981)
- **次要色**: 蓝色 (#3B82F6)
- **强调色**: 橙色 (#F59E0B)
- **背景**: 浅灰白色 (#F9FAFB)
- **卡片**: 白色 (#FFFFFF)

## 注意事项

1. 数据仅存储在本地浏览器，刷新不会丢失但更换设备会丢失
2. 导出的 TXT 文件使用 UTF-8 编码
3. 开发服务器默认运行在 5000 端口
