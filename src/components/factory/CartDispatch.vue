<template>
  <div class="control-section">
    <h3>🚛 小车调度</h3>
    
    <!-- 添加状态提示 -->
    <div v-if="selectedCartId" class="cart-status-info">
      <span>已选择: {{ selectedCartId }}</span>
      <span class="cart-current-status">
        状态: {{ getCurrentCartStatus() }}
      </span>
    </div>
    
    <!-- 现有的按钮和输入框 -->
    <button @click="$emit('deploy-cart')" class="btn-info">
      派遣小车
    </button>
    <button @click="$emit('recall-all-carts')" class="btn-warning">
      召回所有小车
    </button>
    <div class="cart-controls">
      <select 
        :value="selectedCartId" 
        @change="$emit('update:selected-cart-id', $event.target.value)"
        class="cart-selector"
      >
        <option value="">选择小车</option>
        <option v-for="cart in carts" :key="cart.id" :value="cart.id">
          小车 {{ cart.id }} ({{ cart.status }})
        </option>
      </select>
      <div class="grid-inputs">
        <input 
          :value="targetGridX" 
          @input="$emit('update:target-grid-x', Number($event.target.value))"
          type="number" 
          min="0" 
          max="999" 
          placeholder="网格X"
          class="grid-input"
        >
        <input 
          :value="targetGridY" 
          @input="$emit('update:target-grid-y', Number($event.target.value))"
          type="number" 
          min="0" 
          max="999" 
          placeholder="网格Y"
          class="grid-input"
        >
      </div>
      <button 
        @click="$emit('send-grid-command')" 
        :disabled="!canSendCommand"
        class="btn-grid"
      >
        📍 发送网格指令
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Cart } from '@/types/factory'
import { computed } from 'vue'

const props = defineProps<{
  carts: Cart[]
  selectedCartId: string
  targetGridX?: number
  targetGridY?: number
}>()

// 计算是否可以发送指令
const canSendCommand = computed(() => {
  if (!props.selectedCartId || props.targetGridX === undefined || props.targetGridY === undefined) {
    return false
  }
  
  const cart = props.carts.find(c => c.id === props.selectedCartId)
  return cart && cart.status === 'idle'
})

// 获取当前选中小车的状态
function getCurrentCartStatus() {
  if (!props.selectedCartId) return ''
  const cart = props.carts.find(c => c.id === props.selectedCartId)
  return cart ? cart.status : '未找到'
}
</script>

<style scoped>
.cart-status-info {
  background: #f0f8ff;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 12px;
}

.cart-current-status {
  margin-left: 10px;
  color: #666;
}

.btn-info, .btn-warning, .btn-grid {
  padding: 8px 16px; /* 从10px 20px减少到8px 16px */
  margin: 3px; /* 从5px减少到3px */
  border: none;
  border-radius: 5px; /* 从6px减少到5px */
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px; /* 添加较小字体 */
}

.cart-controls {
  margin-top: 10px; /* 从15px减少到10px */
}

.cart-selector {
  width: 100%;
  padding: 6px; /* 从8px减少到6px */
  margin-bottom: 8px; /* 从10px减少到8px */
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px; /* 添加较小字体 */
}

.grid-inputs {
  display: flex;
  gap: 8px; /* 从10px减少到8px */
  margin-bottom: 8px; /* 从10px减少到8px */
}

.grid-input {
  flex: 1;
  padding: 6px; /* 从8px减少到6px */
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px; /* 添加较小字体 */
}
</style>