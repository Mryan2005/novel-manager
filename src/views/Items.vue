<template>
  <Layout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">物品设定</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">管理你的小说物品</p>
        </div>
        <button @click="openAdd" class="btn btn-primary">
          <Plus class="w-4 h-4" />
          新建物品
        </button>
      </div>

      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input v-model="searchQuery" type="text" class="input pl-10" placeholder="搜索物品名称、类型、描述..." />
      </div>

      <div v-if="filteredItems.length === 0 && items.length > 0" class="card p-12 text-center">
        <Search class="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
        <p class="text-[var(--text-light)]">没有匹配的物品</p>
      </div>

      <div v-else-if="items.length === 0" class="card p-12 text-center">
        <Package class="w-20 h-20 text-[var(--text-muted)] mx-auto mb-6" />
        <h3 class="text-xl font-semibold text-[var(--text)] mb-3">还没有物品</h3>
        <p class="text-[var(--text-light)] mb-6 max-w-md mx-auto">创建法宝、武器、丹药等物品设定</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="item in filteredItems" :key="item.id" class="card p-8">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-[var(--text)] text-lg">{{ item.name }}</h3>
                <span class="px-2 py-0.5 rounded-lg text-xs font-medium" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">
                  {{ item.type }}
                </span>
              </div>
              <p v-if="item.owner" class="text-sm text-[var(--text-light)] flex items-center gap-1.5 mt-1">
                <Users class="w-4 h-4" />
                {{ item.owner }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <button @click="editItem(item)" class="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all" title="编辑">
                <Edit class="w-5 h-5" />
              </button>
              <button @click="confirmDelete(item)" class="p-2.5 rounded-xl hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-all" title="删除">
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>
          <p class="text-[var(--text-light)] mt-4 leading-relaxed">{{ item.description }}</p>
          <div v-if="item.abilities.length > 0" class="flex flex-wrap gap-2 mt-5">
            <span v-for="a in item.abilities" :key="a" class="px-2.5 py-1 rounded-lg text-xs" style="background: rgba(245, 158, 11, 0.1); color: var(--accent);">
              {{ a }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑模态框 -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" @click.self="closeModal">
      <div class="card w-full max-w-lg p-8 my-8">
        <h2 class="text-2xl font-bold text-[var(--text)] mb-6">{{ editingId ? '编辑物品' : '新建物品' }}</h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">物品名称</label>
            <input v-model="form.name" type="text" class="input" placeholder="输入物品名称" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">类型</label>
            <select v-model="form.type" class="input">
              <option value="武器">武器</option>
              <option value="法宝">法宝</option>
              <option value="丹药">丹药</option>
              <option value="材料">材料</option>
              <option value="功法">功法</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">所属角色（可选）</label>
            <input v-model="form.owner" type="text" class="input" placeholder="如：主角、张三" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">能力标签（用逗号分隔）</label>
            <input v-model="abilitiesInput" type="text" class="input" placeholder="如：飞天,增幅灵力,治愈" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">物品描述</label>
            <textarea v-model="form.description" class="input min-h-[120px]" placeholder="描述这个物品的外观、来历、功效等"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-7">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="saveItem" class="btn btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showDeleteModal = false">
      <div class="card w-full max-w-sm p-8">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
            <Trash2 class="w-8 h-8 text-[var(--error)]" />
          </div>
          <h3 class="text-xl font-bold text-[var(--text)] mb-3">确认删除</h3>
          <p class="text-[var(--text-light)] mb-7">确定要删除物品「{{ itemToDelete?.name }}」吗？</p>
          <div class="flex justify-center gap-3">
            <button @click="showDeleteModal = false" class="btn btn-secondary">取消</button>
            <button @click="deleteItem" class="btn" style="background: var(--error); color: white;">删除</button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Package, Plus, Edit, Trash2, Search, Users } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Item } from '../types';

const { items, addItem, updateItem, deleteItem: deleteItemFromStore } = useStore();

const showModal = ref(false);
const showDeleteModal = ref(false);
const itemToDelete = ref<Item | null>(null);
const editingId = ref<string | null>(null);
const abilitiesInput = ref('');
const searchQuery = ref('');

const form = ref({ name: '', type: '武器', description: '', owner: '', abilities: [] as string[] });

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter(i =>
    i.name.toLowerCase().includes(q) ||
    i.type.toLowerCase().includes(q) ||
    i.description.toLowerCase().includes(q) ||
    i.owner.toLowerCase().includes(q)
  );
});

const openAdd = () => {
  editingId.value = null;
  form.value = { name: '', type: '武器', description: '', owner: '', abilities: [] };
  abilitiesInput.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingId.value = null;
};

const saveItem = () => {
  if (!form.value.name.trim()) return;
  const abilities = abilitiesInput.value.split(',').map(a => a.trim()).filter(a => a.length > 0);
  if (editingId.value) {
    updateItem(editingId.value, { ...form.value, abilities });
  } else {
    addItem({ ...form.value, abilities });
  }
  closeModal();
};

const editItem = (item: Item) => {
  form.value = { name: item.name, type: item.type, description: item.description, owner: item.owner, abilities: [...item.abilities] };
  abilitiesInput.value = item.abilities.join(', ');
  editingId.value = item.id;
  showModal.value = true;
};

const confirmDelete = (item: Item) => {
  itemToDelete.value = item;
  showDeleteModal.value = true;
};

const deleteItem = () => {
  if (itemToDelete.value) {
    deleteItemFromStore(itemToDelete.value.id);
    showDeleteModal.value = false;
    itemToDelete.value = null;
  }
};
</script>
