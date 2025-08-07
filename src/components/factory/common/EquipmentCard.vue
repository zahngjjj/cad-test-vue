<template>
  <div 
    class="equipment-item"
    :class="equipment.status"
  >
    <div class="equipment-main">
      <span class="equipment-name">{{ equipment.name }}</span>
      <span class="equipment-total">{{ Math.floor(equipment.totalProduced) }} 件</span>
    </div>
    <div class="equipment-meta">
      <span class="equipment-current">{{ equipment.currentProduction }}/分钟</span>
      <span class="equipment-status">{{ equipment.status }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Equipment } from '@/types/factory'

// Props
defineProps<{
  equipment: Equipment
}>()
</script>

<style scoped>
.equipment-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.equipment-item:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.equipment-item.running {
  border-left: 4px solid #4caf50;
  background: #f8fff8;
}

.equipment-item.idle {
  border-left: 4px solid #9e9e9e;
}

.equipment-main {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 5px;
}

.equipment-name {
  color: #333;
}

.equipment-total {
  color: #1976d2;
}

.equipment-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.equipment-status {
  text-transform: capitalize;
}
</style>