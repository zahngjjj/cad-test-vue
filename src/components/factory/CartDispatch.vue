<template>
  <div class="control-section">
    <h3>🚛 小车调度</h3>
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
        :disabled="!selectedCartId || targetGridX === undefined || targetGridY === undefined"
        class="btn-grid"
      >
        📍 发送网格指令
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Cart } from '@/types/factory'

// Props
defineProps<{
  carts: Cart[]
  selectedCartId: string
  targetGridX?: number
  targetGridY?: number
}>()

// Emits
defineEmits<{
  'deploy-cart': []
  'recall-all-carts': []
  'send-grid-command': []
  'update:selected-cart-id': [value: string]
  'update:target-grid-x': [value: number]
  'update:target-grid-y': [value: number]
}>()
</script>

<style scoped>
.btn-info, .btn-warning, .btn-grid {
  padding: 10px 20px;
  margin: 5px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-info {
  background: #2196f3;
  color: white;
}

.btn-info:hover {
  background: #1976d2;
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover {
  background: #f57c00;
}

.btn-grid {
  background: #4caf50;
  color: white;
  width: 100%;
  margin-top: 10px;
}

.btn-grid:hover:not(:disabled) {
  background: #45a049;
}

.btn-grid:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-controls {
  margin-top: 15px;
}

.cart-selector {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.grid-inputs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.grid-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>