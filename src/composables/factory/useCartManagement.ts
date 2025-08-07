import { ref, reactive } from 'vue'
import type { Cart, Delivery, GridPosition } from '@/types/factory'
import { GridCart } from '@/utils/factory/GridCart'

export function useCartManagement() {
  // 小车数据
  const carts = ref<Cart[]>([])
  const pendingDeliveries = ref<Delivery[]>([])
  const selectedCartId = ref('')
  const targetGridX = ref<number>()
  const targetGridY = ref<number>()
  
  // 配送任务计数器
  let deliveryIdCounter = 1
  
  // 初始化小车
  function initializeCarts() {
    const startPositions = [
      { x: 100, y: 100 },
      { x: 140, y: 100 },
      { x: 180, y: 100 }
    ]
    
    carts.value = []
    for (let i = 0; i < 3; i++) {
      const cart = new GridCart(`cart-${i + 1}`, startPositions[i].x, startPositions[i].y)
      carts.value.push(cart)
    }
  }
  
  // 按优先级查找可用小车
  function findAvailableCartByPriority(): Cart | null {
    const priorityOrder = ['cart-1', 'cart-2', 'cart-3']
    
    for (const cartId of priorityOrder) {
      const cart = carts.value.find(c => c.id === cartId && c.status === 'idle')
      if (cart) {
        return cart
      }
    }
    
    return null
  }
  
  // 自动派遣小车
  function autoDeployCart(): boolean {
    if (pendingDeliveries.value.length === 0) return false
    
    const availableCart = findAvailableCartByPriority()
    if (!availableCart) return false
    
    const delivery = pendingDeliveries.value[0]
    assignCartToDelivery(availableCart, delivery)
    
    return true
  }
  
  // 派遣小车
  function deployCart() {
    // 创建新的配送任务
    const delivery: Delivery = {
      id: deliveryIdCounter++,
      type: '货物',
      fromGridX: 600,
      fromGridY: 100,
      toGridX: 700,
      toGridY: 500,
      status: 'pending'
    }
    
    pendingDeliveries.value.push(delivery)
    
    // 尝试自动派遣
    if (!autoDeployCart()) {
      console.log('暂无可用小车，任务已加入队列')
    }
  }
  
  // 分配小车到配送任务
  function assignCartToDelivery(cart: Cart, delivery: Delivery) {
    cart.status = 'moving'
    cart.cargo = {
      id: `cargo-${delivery.id}`,
      type: delivery.type
    }
    
    // 设置路径：当前位置 -> 取货点 -> 目的地
    const path: GridPosition[] = [
      { x: delivery.fromGridX, y: delivery.fromGridY },
      { x: delivery.toGridX, y: delivery.toGridY }
    ]
    
    cart.path = path
    cart.pathIndex = 0
    
    delivery.status = 'assigned'
    delivery.assignedCart = cart.id
    
    // 从待处理队列中移除
    const index = pendingDeliveries.value.findIndex(d => d.id === delivery.id)
    if (index > -1) {
      pendingDeliveries.value.splice(index, 1)
    }
    
    console.log(`小车 ${cart.id} 已派遣执行任务 ${delivery.id}`)
  }
  
  // 召回所有小车
  function recallAllCarts() {
    const startPositions = [
      { x: 100, y: 100 },
      { x: 140, y: 100 },
      { x: 180, y: 100 }
    ]
    
    carts.value.forEach((cart, index) => {
      cart.status = 'returning'
      cart.cargo = null
      cart.path = [startPositions[index]]
      cart.pathIndex = 0
    })
    
    console.log('所有小车已召回')
  }
  
  // 发送网格指令
  function sendGridCommand() {
    if (!selectedCartId.value || targetGridX.value === undefined || targetGridY.value === undefined) {
      console.warn('请选择小车并设置目标坐标')
      return
    }
    
    const cart = carts.value.find(c => c.id === selectedCartId.value)
    if (!cart) {
      console.warn('未找到指定小车')
      return
    }
    
    cart.status = 'moving'
    cart.path = [{ x: targetGridX.value, y: targetGridY.value }]
    cart.pathIndex = 0
    
    console.log(`小车 ${cart.id} 正在前往 (${targetGridX.value}, ${targetGridY.value})`)
  }
  
  // 更新小车位置
  function updateCartPositions() {
    carts.value.forEach(cart => {
      if ((cart.status === 'moving' || cart.status === 'returning') && cart.path.length > 0) {
        const hasMorePath = (cart as GridCart).moveAlongPath()
        
        if (!hasMorePath) {
          // 到达目的地
          if (cart.status === 'returning') {
            cart.status = 'idle'
          } else {
            cart.status = 'idle'
            // 检查是否有待处理的任务
            autoDeployCart()
          }
        }
      }
    })
  }
  
  // 获取小车状态文本
  function getCartStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'idle': '空闲',
      'moving': '移动中',
      'loading': '装载中',
      'delivering': '配送中',
      'returning': '返回中'
    }
    return statusMap[status] || status
  }
  
  // 初始化
  initializeCarts()
  
  return {
    // 状态
    carts,
    pendingDeliveries,
    selectedCartId,
    targetGridX,
    targetGridY,
    
    // 方法
    deployCart,
    recallAllCarts,
    sendGridCommand,
    updateCartPositions,
    getCartStatusText,
    findAvailableCartByPriority,
    autoDeployCart
  }
}