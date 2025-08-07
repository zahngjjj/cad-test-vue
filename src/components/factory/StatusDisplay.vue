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
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.status-section h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.label {
  font-weight: 500;
  color: #666;
}

.status.running {
  color: #4caf50;
  font-weight: 600;
}

.status.stopped {
  color: #f44336;
  font-weight: 600;
}

.value {
  font-weight: 600;
  color: #333;
}

.cart-status-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>