<template>
  <div>
    <!-- 实时状态 -->
    <div class="status-section">
      <h3>📊 实时状态</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">生产状态:</span>
          <span :class="['status', isProducing ? 'running' : 'stopped']">
            {{ isProducing ? '运行中' : '已停止' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">当前产量:</span>
          <span class="value">{{ currentProduction }}</span>
        </div>
        <div class="status-item">
          <span class="label">活跃小车:</span>
          <span class="value">{{ carts.length }}</span>
        </div>
        <div class="status-item">
          <span class="label">待送货物:</span>
          <span class="value">{{ pendingDeliveries.length }}</span>
        </div>
      </div>
    </div>
    
    <!-- 小车状态 -->
    <div class="status-section">
      <h3>🚚 小车状态</h3>
      <div class="cart-status-grid">
        <CartStatusCard 
          v-for="cart in carts" 
          :key="cart.id" 
          :cart="cart"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CartStatusCard from './common/CartStatusCard.vue'
import type { Cart, Delivery } from '@/types/factory'

// Props
defineProps<{
  isProducing: boolean
  currentProduction: number
  carts: Cart[]
  pendingDeliveries: Delivery[]
}>()
</script>

<style scoped>
.status-section {
  margin-bottom: 16px; /* 从30px减少到16px */
  padding: 12px; /* 从20px减少到12px */
  background: #f8f9fa;
  border-radius: 6px; /* 从8px减少到6px */
  border: 1px solid #e9ecef;
}

.status-section h3 {
  margin: 0 0 10px 0; /* 从15px减少到10px */
  color: #333;
  font-size: 15px; /* 从16px减少到15px */
  font-weight: 600;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px; /* 从10px减少到6px */
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px; /* 从8px 12px减少到6px 10px */
  background: white;
  border-radius: 5px; /* 从6px减少到5px */
  border: 1px solid #e0e0e0;
  font-size: 13px; /* 添加较小字体 */
}

.cart-status-grid {
  display: flex;
  flex-direction: column;
  gap: 6px; /* 从10px减少到6px */
}
</style>