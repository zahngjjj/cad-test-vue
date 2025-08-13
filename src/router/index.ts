import { createRouter, createWebHistory } from 'vue-router'
import GridFactoryView from '@/views/factory/GridFactoryView.vue'
import Test from '@/views/others/test.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/test'
    },
    {
      path: '/factory',
      name: 'Factory',
      component: GridFactoryView,
      meta: {
        title: '智能工厂仿真系统'
      }
    },
    {
      path: '/test',
      name: 'Test',
      component: Test,
      meta: {
        title: '测试'
      }
    },
  ],
})

export default router
