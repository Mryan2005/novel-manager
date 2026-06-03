import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Chapters from '../views/Chapters.vue';
import Characters from '../views/Characters.vue';
import Scenes from '../views/Scenes.vue';
import Items from '../views/Items.vue';
import Search from '../views/Search.vue';
import Editor from '../views/Editor.vue';
import Series from '../views/Series.vue';
import PlotOutline from '../views/PlotOutline.vue';
import Relations from '../views/Relations.vue';
import Moments from '../views/Moments.vue';
import Settings from '../views/Settings.vue';
import WorldSimulation from '../views/WorldSimulation.vue';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', name: 'Home', component: Home },
  { path: '/chapters', name: 'Chapters', component: Chapters },
  { path: '/series', name: 'Series', component: Series },
  { path: '/plot-outline', name: 'PlotOutline', component: PlotOutline },
  { path: '/characters', name: 'Characters', component: Characters },
  { path: '/scenes', name: 'Scenes', component: Scenes },
  { path: '/items', name: 'Items', component: Items },
  { path: '/relations', name: 'Relations', component: Relations },
  { path: '/moments', name: 'Moments', component: Moments },
  { path: '/search', name: 'Search', component: Search },
  { path: '/editor', name: 'Editor', component: Editor },
  { path: '/editor/:id', name: 'EditorWithId', component: Editor },
  { path: '/world-simulation', name: 'WorldSimulation', component: WorldSimulation },
  { path: '/settings', name: 'Settings', component: Settings },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
