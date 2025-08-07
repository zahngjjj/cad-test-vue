<template>
  <div class="grid-factory-view">
    <!-- 控制面板 -->
    <ControlPanel 
      :is-producing="isProducing"
      :current-production="currentProduction"
      :total-factory-produced="totalFactoryProduced"
      :production-duration="productionDuration"
      :workshop-totals="workshopTotals"
      :equipment-list="equipmentList"
      :carts="carts"
      :pending-deliveries="pendingDeliveries"
      :selected-cart-id="selectedCartId"
      :target-grid-x="targetGridX"
      :target-grid-y="targetGridY"
      @start-production="startProduction"
      @stop-production="stopProduction"
      @reset-total-production="resetTotalProduction"
      @deploy-cart="deployCart"
      @recall-all-carts="recallAllCarts"
      @send-grid-command="sendGridCommand"
      @update:selected-cart-id="selectedCartId = $event"
      @update:target-grid-x="targetGridX = $event"
      @update:target-grid-y="targetGridY = $event"
    />

    <!-- 工厂布局 -->
    <FactoryLayout 
      ref="factoryLayoutRef"
      :carts="carts"
      :equipment-list="equipmentList"
      :pending-deliveries="pendingDeliveries"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ControlPanel from '@/components/factory/ControlPanel.vue'
import FactoryLayout from '@/components/factory/FactoryLayout.vue'
import { useFactoryProduction } from '@/composables/factory/useFactoryProduction'
import { useCartManagement } from '@/composables/factory/useCartManagement'
import { useEquipmentMonitor } from '@/composables/factory/useEquipmentMonitor'
import { useFactoryAnimation } from '@/composables/factory/useFactoryAnimation'

// 工厂布局引用
const factoryLayoutRef = ref()

// 使用 composables
const {
  isProducing,
  currentProduction,
  totalFactoryProduced,
  productionDuration,
  startProduction,
  stopProduction,
  resetTotalProduction
} = useFactoryProduction()

const {
  carts,
  selectedCartId,
  targetGridX,
  targetGridY,
  pendingDeliveries,
  deployCart,
  recallAllCarts,
  sendGridCommand
} = useCartManagement()

const {
  equipmentList,
  workshopTotals
} = useEquipmentMonitor()

const {
  startAnimation,
  stopAnimation
} = useFactoryAnimation(carts, equipmentList)

// 生命周期
onMounted(() => {
  startAnimation()
})

onUnmounted(() => {
  stopAnimation()
})
</script>

<style scoped>
.grid-factory-view {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}
</style>