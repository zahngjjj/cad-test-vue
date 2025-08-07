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
      @start-production="handleStartProduction"
      @stop-production="handleStopProduction"
      @reset-total-production="handleResetProduction"
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

// 先初始化设备监控，获取updateEquipmentProduction函数
const {
  equipmentList,
  workshopTotals,
  startEquipmentProduction,
  stopEquipmentProduction,
  updateEquipmentProduction,
  resetEquipmentProduction
} = useEquipmentMonitor()

// 然后初始化工厂生产，传入updateEquipmentProduction
const {
  isProducing,
  currentProduction,
  totalFactoryProduced,
  productionDuration,
  startProduction,
  stopProduction,
  resetTotalProduction
} = useFactoryProduction(updateEquipmentProduction)

// 其他composables保持不变
// 更新useCartManagement的解构
const {
  carts,
  selectedCartId,
  targetGridX,
  targetGridY,
  pendingDeliveries,
  deployCart,
  recallAllCarts,
  sendGridCommand,
  updateCartPositions,
  findAvailableCartByPriority,
  assignCartToDelivery,
  generateContinuousTasks
} = useCartManagement()

// 修改生产控制方法
function handleStartProduction() {
  startProduction()
  startEquipmentProduction()
  
  // 移除立即派遣小车的逻辑
  // deployCart() // 删除这行
  
  // 启动设备产量监控，当达到100时触发小车
  const productionCheckInterval = setInterval(() => {
    if (isProducing.value) {
      checkEquipmentProductionAndDispatchCarts()
    } else {
      clearInterval(productionCheckInterval)
    }
  }, 1000) // 每秒检查一次设备产量
}

// 新增：检查设备产量并派遣小车的函数
function checkEquipmentProductionAndDispatchCarts() {
  equipmentList.value.forEach(equipment => {
    // 当设备总产量达到100的倍数时，派遣小车
    if (equipment.totalProduced >= 100 && Math.floor(equipment.totalProduced / 100) > Math.floor((equipment.totalProduced - equipment.currentProduction / 60) / 100)) {
      // 为该设备派遣一辆小车
      dispatchCartForEquipment(equipment)
    }
  })
}

// 新增：为特定设备派遣小车
function dispatchCartForEquipment(equipment: any) {
  const availableCart = findAvailableCartByPriority()
  if (availableCart) {
    const warehousePositions = [
      { x: 200, y: 200 },
      { x: 300, y: 300 },
      { x: 400, y: 400 }
    ]
    
    const randomWarehouse = warehousePositions[Math.floor(Math.random() * warehousePositions.length)]
    
    const delivery = {
      id: Date.now(), // 简单的ID生成
      type: '成品',
      fromGridX: equipment.gridX,
      fromGridY: equipment.gridY,
      toGridX: randomWarehouse.x,
      toGridY: randomWarehouse.y,
      status: 'pending'
    }
    
    assignCartToDelivery(availableCart, delivery)
    console.log(`设备 ${equipment.name} 产量达到100，派遣小车 ${availableCart.id}`)
  }
}

function handleStopProduction() {
  stopProduction()
  stopEquipmentProduction()
  recallAllCarts() // 停止生产时召回所有小车
}

function handleResetProduction() {
  resetTotalProduction()
  resetEquipmentProduction()
}

const {
  startAnimation,
  stopAnimation
} = useFactoryAnimation(carts, equipmentList, updateCartPositions)

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