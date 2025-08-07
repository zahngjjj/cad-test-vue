<template>
  <div class="cart-status">
    <div class="cart-header">
      <span class="cart-name">🚛 {{ cart.id }}</span>
      <span :class="['cart-status-text', cart.status]">
        {{ getStatusText(cart.status) }}
      </span>
    </div>
    <div class="cart-info">
      <div class="grid-coords">📍 网格: ({{ cart.gridX }}, {{ cart.gridY }})</div>
      <div class="cart-details">
        <span>速度: {{ cart.speed }} 格/秒</span>
        <span v-if="cart.cargo">货物: {{ cart.cargo.type }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Cart } from '@/types/factory'

// Props
defineProps<{
  cart: Cart
}>()

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'idle': '空闲',
    'moving': '移动中',
    'loading': '装载中',
    'delivering': '配送中',
    'returning': '返回中'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.cart-status {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
}

.cart-status:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.cart-name {
  font-weight: 600;
  color: #333;
}

.cart-status-text {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.cart-status-text.idle {
  background: #e8f5e8;
  color: #4caf50;
}

.cart-status-text.moving {
  background: #e3f2fd;
  color: #2196f3;
}

.cart-status-text.loading {
  background: #fff3e0;
  color: #ff9800;
}

.cart-status-text.delivering {
  background: #f3e5f5;
  color: #9c27b0;
}

.cart-status-text.returning {
  background: #fce4ec;
  color: #e91e63;
}

.cart-info {
  font-size: 12px;
  color: #666;
}

.grid-coords {
  margin-bottom: 4px;
}

.cart-details {
  display: flex;
  justify-content: space-between;
}
</style>