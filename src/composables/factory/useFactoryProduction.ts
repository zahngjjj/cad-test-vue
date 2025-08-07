import { ref, computed, onUnmounted } from 'vue'
import type { Equipment, ProductionStats } from '@/types/factory'

export function useFactoryProduction(updateEquipmentCallback?: () => void) {
  // 生产状态
  const isProducing = ref(false)
  const productionRate = ref(50) // 每分钟产量
  const currentProduction = ref(0)
  const productionStartTime = ref<number | null>(null)
  const totalFactoryProduced = ref(0)
  const currentTime = ref(Date.now())
  
  // 生产间隔定时器
  let productionInterval: number | null = null
  let timeUpdateInterval: number | null = null
  
  // 计算生产时长
  const productionDuration = computed(() => {
    if (!productionStartTime.value) return '未开始'
    const duration = Math.floor((currentTime.value - productionStartTime.value) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}分${seconds}秒`
  })
  
  // 开始生产
  function startProduction() {
    if (isProducing.value) return
    
    isProducing.value = true
    productionStartTime.value = Date.now()
    currentTime.value = Date.now()
    
    // 启动生产间隔
    productionInterval = window.setInterval(() => {
      updateProduction()
    }, 1000) // 每秒更新一次
    
    // 启动时间更新间隔
    timeUpdateInterval = window.setInterval(() => {
      currentTime.value = Date.now()
    }, 1000)
    
    console.log('生产已开始')
  }
  
  // 停止生产
  function stopProduction() {
    if (!isProducing.value) return
    
    isProducing.value = false
    
    if (productionInterval) {
      clearInterval(productionInterval)
      productionInterval = null
    }
    
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval)
      timeUpdateInterval = null
    }
    
    console.log('生产已停止')
  }
  
  // 更新生产数据
  // 更新生产数据
  function updateProduction() {
    if (!isProducing.value) return
    
    // 调用设备更新
    if (updateEquipmentCallback) {
      updateEquipmentCallback()
    }
    
    // 计算实时总产量（基于所有设备的当前产量）
    // 这里需要从设备监控获取实时数据
    const productionIncrement = productionRate.value / 60
    totalFactoryProduced.value += productionIncrement
    
    // 修改：currentProduction 应该反映当前实际产量，而不是固定值
    // currentProduction.value = productionRate.value // 删除这行
  }
  
  // 重置累计产量
  function resetTotalProduction() {
    totalFactoryProduced.value = 0
    productionStartTime.value = null
    currentTime.value = Date.now()
    currentProduction.value = 0
  }
  
  // 获取生产统计
  function getProductionStats(): ProductionStats {
    return {
      totalProduced: totalFactoryProduced.value,
      currentRate: currentProduction.value,
      startTime: productionStartTime.value,
      duration: productionDuration.value,
      efficiency: isProducing.value ? 85 : 0 // 模拟效率
    }
  }
  
  // 清理定时器
  onUnmounted(() => {
    stopProduction()
  })
  
  return {
    // 状态
    isProducing,
    productionRate,
    currentProduction,
    totalFactoryProduced,
    productionDuration,
    
    // 方法
    startProduction,
    stopProduction,
    resetTotalProduction,
    getProductionStats
  }
}