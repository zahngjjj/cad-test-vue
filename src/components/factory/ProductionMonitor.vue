<template>
  <div class="control-section">
    <h3>⚙️ 设备产量监控</h3>
    
    <!-- 工厂总产量 -->
    <div class="factory-summary">
      <div class="factory-total">
        <span class="factory-label">🏭 工厂总产量:</span>
        <span class="factory-value">{{ Math.floor(totalFactoryProduced) }} 件</span>
      </div>
      <div class="factory-duration">
        <span class="duration-label">⏱️ 生产时长:</span>
        <span class="duration-value">{{ productionDuration }}</span>
      </div>
      <button @click="$emit('reset-total-production')" class="btn-reset" :disabled="isProducing">
        🔄 重置累计产量
      </button>
    </div>
    
    <!-- 车间累计产量 -->
    <div class="workshop-summary">
      <h4>🏭 车间累计产量</h4>
      <div class="workshop-list">
        <div 
          v-for="workshop in workshopTotals" 
          :key="workshop.name"
          class="workshop-item"
        >
          <div class="workshop-header">
            <span class="workshop-name">{{ workshop.name }}</span>
            <span class="workshop-total">{{ Math.floor(workshop.totalProduced) }} 件</span>
          </div>
          <div class="workshop-details">
            <span class="workshop-current">当前: {{ workshop.currentProduction }}/分钟</span>
            <span class="workshop-status">运行: {{ workshop.runningCount }}/{{ workshop.equipmentCount }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 设备详细信息 -->
    <div class="equipment-details">
      <h4>📋 设备详情</h4>
      <div class="equipment-list">
        <EquipmentCard 
          v-for="equipment in equipmentList" 
          :key="equipment.id"
          :equipment="equipment"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import EquipmentCard from './common/EquipmentCard.vue'
import type { Equipment, WorkshopTotal } from '@/types/factory'

// Props
defineProps<{
  totalFactoryProduced: number
  productionDuration: string
  workshopTotals: WorkshopTotal[]
  equipmentList: Equipment[]
  isProducing: boolean
}>()

// Emits
defineEmits<{
  'reset-total-production': []
}>()
</script>

<style scoped>
/* 样式保持与原组件一致 */
.factory-summary {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.factory-total, .factory-duration {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.factory-label, .duration-label {
  font-weight: 600;
  color: #1976d2;
}

.factory-value, .duration-value {
  font-weight: bold;
  color: #0d47a1;
}

.btn-reset {
  width: 100%;
  padding: 8px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-reset:hover:not(:disabled) {
  background: #f57c00;
}

.btn-reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.workshop-summary {
  margin-bottom: 20px;
}

.workshop-item {
  background: #f5f5f5;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 4px solid #4caf50;
}

.workshop-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 5px;
}

.workshop-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.equipment-details h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.equipment-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>