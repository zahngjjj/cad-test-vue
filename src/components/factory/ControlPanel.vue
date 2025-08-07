<template>
  <div class="control-panel">
    <!-- 设备产量控制 -->
    <div class="control-section">
      <h3>🏭 设备产量控制</h3>
      <button @click="$emit('start-production')" :disabled="isProducing" class="btn-primary">
        开始生产
      </button>
      <button @click="$emit('stop-production')" :disabled="!isProducing" class="btn-danger">
        停止生产
      </button>
    </div>
    
    <!-- 设备产量监控 -->
    <ProductionMonitor 
      :total-factory-produced="totalFactoryProduced"
      :production-duration="productionDuration"
      :workshop-totals="workshopTotals"
      :equipment-list="equipmentList"
      :is-producing="isProducing"
      @reset-total-production="$emit('reset-total-production')"
    />
    
    <!-- 小车调度 -->
    <CartDispatch 
      :carts="carts"
      :selected-cart-id="selectedCartId"
      :target-grid-x="targetGridX"
      :target-grid-y="targetGridY"
      @deploy-cart="$emit('deploy-cart')"
      @recall-all-carts="$emit('recall-all-carts')"
      @send-grid-command="$emit('send-grid-command')"
      @update:selected-cart-id="$emit('update:selected-cart-id', $event)"
      @update:target-grid-x="$emit('update:target-grid-x', $event)"
      @update:target-grid-y="$emit('update:target-grid-y', $event)"
    />
    
    <!-- 实时状态显示 -->
    <StatusDisplay 
      :is-producing="isProducing"
      :current-production="currentProduction"
      :carts="carts"
      :pending-deliveries="pendingDeliveries"
    />
  </div>
</template>

<script setup lang="ts">
import ProductionMonitor from './ProductionMonitor.vue'
import CartDispatch from './CartDispatch.vue'
import StatusDisplay from './StatusDisplay.vue'
import type { Cart, Equipment, WorkshopTotal, Delivery } from '@/types/factory'

// Props
defineProps<{
  isProducing: boolean
  currentProduction: number
  totalFactoryProduced: number
  productionDuration: string
  workshopTotals: WorkshopTotal[]
  equipmentList: Equipment[]
  carts: Cart[]
  pendingDeliveries: Delivery[]
  selectedCartId: string
  targetGridX?: number
  targetGridY?: number
}>()

// Emits
defineEmits<{
  'start-production': []
  'stop-production': []
  'reset-total-production': []
  'deploy-cart': []
  'recall-all-carts': []
  'send-grid-command': []
  'update:selected-cart-id': [value: string]
  'update:target-grid-x': [value: number]
  'update:target-grid-y': [value: number]
}>()
</script>

<style scoped>
.control-panel {
  width: 350px;
  height: 100vh;
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  padding: 20px;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
}

.control-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.control-section h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.btn-primary, .btn-danger {
  padding: 10px 20px;
  margin: 5px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4caf50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #da190b;
}

.btn-primary:disabled, .btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>