import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Chapters from '../views/Chapters.vue';
import Characters from '../views/Characters.vue';
import Scenes from '../views/Scenes.vue';
import Editor from '../views/Editor.vue';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', name: 'Home', component: Home },
  { path: '/chapters', name: 'Chapters', component: Chapters },
  { path: '/characters', name: 'Characters', component: Characters },
  { path: '/scenes', name: 'Scenes', component: Scenes },
  { path: '/editor', name: 'Editor', component: Editor },
  { path: '/editor/:id', name: 'EditorWithId', component: Editor },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
