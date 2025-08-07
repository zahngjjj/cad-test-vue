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
.factory-summary {
  background: #e3f2fd;
  padding: 10px; /* 从15px减少到10px */
  border-radius: 6px; /* 从8px减少到6px */
  margin-bottom: 12px; /* 从20px减少到12px */
}

.factory-total, .factory-duration {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px; /* 从10px减少到6px */
  font-size: 13px; /* 添加较小字体 */
}

.btn-reset {
  width: 100%;
  padding: 6px; /* 从8px减少到6px */
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px; /* 从12px减少到11px */
}

.workshop-summary {
  margin-bottom: 12px; /* 从20px减少到12px */
}

.workshop-item {
  background: #f5f5f5;
  padding: 8px; /* 从10px减少到8px */
  margin-bottom: 6px; /* 从8px减少到6px */
  border-radius: 5px; /* 从6px减少到5px */
  border-left: 3px solid #4caf50; /* 从4px减少到3px */
}

.workshop-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 4px; /* 从5px减少到4px */
  font-size: 13px; /* 添加较小字体 */
}

.workshop-details {
  display: flex;
  justify-content: space-between;
  font-size: 11px; /* 从12px减少到11px */
  color: #666;
}

.equipment-details h4 {
  margin: 0 0 8px 0; /* 从10px减少到8px */
  color: #333;
  font-size: 14px; /* 添加较小字体 */
}

.equipment-list {
  max-height: 300px; /* 从340px减少到300px */
  overflow-y: auto;
}
</style>