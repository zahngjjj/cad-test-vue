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

    // 派遣小车 - 修改为单辆派遣
    function deployCart() {
        const availableCart = findAvailableCartByPriority()

        if (!availableCart) {
            console.warn('没有可用的空闲小车')
            alert('当前没有空闲的小车可以派遣')
            return false
        }

        // 生成随机配送任务
        const equipmentPositions = [
            { x: 600, y: 100 }, // 生产线A
            { x: 800, y: 450 }, // 生产线B
            { x: 700, y: 500 }, // 包装机
            { x: 750, y: 220 }  // 质检台
        ]

        const warehousePositions = [
            { x: 200, y: 200 },
            { x: 300, y: 300 },
            { x: 400, y: 400 }
        ]

        const randomEquipment = equipmentPositions[Math.floor(Math.random() * equipmentPositions.length)]
        const randomWarehouse = warehousePositions[Math.floor(Math.random() * warehousePositions.length)]

        const delivery: Delivery = {
            id: deliveryIdCounter++,
            type: '货物',
            fromGridX: randomEquipment.x,
            fromGridY: randomEquipment.y,
            toGridX: randomWarehouse.x,
            toGridY: randomWarehouse.y,
            status: 'pending'
        }

        assignCartToDelivery(availableCart, delivery)
        console.log(`✅ 派遣小车 ${availableCart.id} 从 (${randomEquipment.x}, ${randomEquipment.y}) 到 (${randomWarehouse.x}, ${randomWarehouse.y})`)
        return true
    }

    // 批量派遣所有小车（新增函数，保留原功能）
    function deployAllCarts() {
        // 创建多个配送任务
        const taskCount = Math.min(3, carts.value.filter(c => c.status === 'idle').length)

        for (let i = 0; i < taskCount; i++) {
            const delivery: Delivery = {
                id: deliveryIdCounter++,
                type: '货物',
                fromGridX: 600 + (i * 50), // 不同的起点
                fromGridY: 100 + (i * 50),
                toGridX: 700 + (i * 50),   // 不同的终点
                toGridY: 500 + (i * 50),
                status: 'pending'
            }

            pendingDeliveries.value.push(delivery)
        }

        // 尝试派遣所有可用小车
        while (autoDeployCart()) {
            // 继续派遣直到没有可用小车或任务
        }
    }
    // 添加持续任务生成函数
    // 修改 generateContinuousTasks 函数，基于设备产量生成任务
    function generateContinuousTasks() {
        const idleCarts = carts.value.filter(c => c.status === 'idle')

        if (idleCarts.length > 0 && pendingDeliveries.value.length < 2) {
            // 基于设备位置生成更真实的配送任务
            const equipmentPositions = [
                { x: 600, y: 100 }, // 生产线A
                { x: 800, y: 450 }, // 生产线B
                { x: 700, y: 500 }, // 包装机
                { x: 750, y: 220 }  // 质检台
            ]

            const warehousePositions = [
                { x: 200, y: 200 },
                { x: 300, y: 300 },
                { x: 400, y: 400 }
            ]

            idleCarts.forEach((cart, index) => {
                if (index < equipmentPositions.length) {
                    const fromPos = equipmentPositions[index]
                    const toPos = warehousePositions[index % warehousePositions.length]

                    const delivery: Delivery = {
                        id: deliveryIdCounter++,
                        type: '成品',
                        fromGridX: fromPos.x,
                        fromGridY: fromPos.y,
                        toGridX: toPos.x,
                        toGridY: toPos.y,
                        status: 'pending'
                    }

                    pendingDeliveries.value.push(delivery)
                    assignCartToDelivery(cart, delivery)
                }
            })
        }
    }

    // 修改 updateCartPositions 函数
    // 修改 updateCartPositions 函数
    function updateCartPositions() {
        carts.value.forEach(cart => {
            if ((cart.status === 'moving' || cart.status === 'returning') && cart.path.length > 0) {
                const hasMorePath = (cart as GridCart).moveAlongPath()
    
                if (!hasMorePath) {
                    // 到达目的地
                    if (cart.status === 'returning') {
                        cart.status = 'idle'
                        cart.cargo = null
                    } else {
                        cart.status = 'idle'
                        const previousCargo = cart.cargo
                        cart.cargo = null
                        
                        // 只有执行配送任务的小车才触发持续任务生成
                        // 通过网格指令移动的小车不应该触发
                        if (previousCargo && previousCargo.type !== 'manual') {
                            // 短暂延迟后生成新任务，模拟装卸货时间
                            setTimeout(() => {
                                if (carts.value.filter(c => c.status === 'idle').length >= 2) {
                                    generateContinuousTasks()
                                }
                            }, 2000)
                        }
                    }
                }
            }
        })
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
    // 发送网格指令
    function sendGridCommand() {
        // 验证输入
        if (!selectedCartId.value) {
            alert('请先选择一辆小车')
            return
        }

        if (targetGridX.value === undefined || targetGridY.value === undefined) {
            alert('请输入目标网格坐标')
            return
        }

        // 验证坐标范围（假设网格范围是 0-1000）
        if (targetGridX.value < 0 || targetGridX.value > 1000 ||
            targetGridY.value < 0 || targetGridY.value > 1000) {
            alert('网格坐标超出范围 (0-1000)')
            return
        }

        const cart = carts.value.find(c => c.id === selectedCartId.value)
        if (!cart) {
            alert('未找到指定小车')
            return
        }

        if (cart.status !== 'idle') {
            alert(`小车 ${cart.id} 当前状态为 ${getCartStatusText(cart.status)}，无法执行新指令`)
            return
        }

        // 执行移动指令
        cart.status = 'moving'
        // 为手动指令添加特殊标识
        cart.cargo = {
            id: `manual-${Date.now()}`,
            type: 'manual'  // 标识这是手动指令
        }
        cart.path = [{ x: targetGridX.value, y: targetGridY.value }]
        cart.pathIndex = 0

        console.log(`✅ 小车 ${cart.id} 开始前往 (${targetGridX.value}, ${targetGridY.value})`)
        alert(`小车 ${cart.id} 已接收指令，正在前往目标位置`)
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
        // 现有的导出...
        carts,
        pendingDeliveries,
        selectedCartId,
        targetGridX,
        targetGridY,
        deployCart,        // 单辆派遣
        deployAllCarts,    // 批量派遣
        updateCartPositions,
        recallAllCarts,
        sendGridCommand,
        findAvailableCartByPriority,
        assignCartToDelivery,
        generateContinuousTasks
    }
}

