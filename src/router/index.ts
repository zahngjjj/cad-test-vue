import { createRouter, createWebHistory } from 'vue-router'
import GridFactoryView from '@/views/factory/GridFactoryView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/factory'
    },
    {
      path: '/factory',
      name: 'Factory',
      component: GridFactoryView,
      meta: {
        title: '智能工厂仿真系统'
      }
    },
  ],
})

export default router
