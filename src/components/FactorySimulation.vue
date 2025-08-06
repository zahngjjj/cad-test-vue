<template>
  <div class="factory-simulation">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-section">
        <h3>🏭 生产控制</h3>
        <button @click="startProduction" :disabled="isProducing" class="btn-primary">
          开始生产
        </button>
        <button @click="stopProduction" :disabled="!isProducing" class="btn-danger">
          停止生产
        </button>
        <button @click="addOrder" class="btn-success">
          添加订单
        </button>
      </div>
      
      <div class="control-section">
        <h3>🚛 小车调度</h3>
        <button @click="deployCart" class="btn-info">
          派遣小车
        </button>
        <button @click="recallAllCarts" class="btn-warning">
          召回所有小车
        </button>
      </div>
      
      <div class="status-section">
        <h3>📊 实时状态</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="label">生产状态:</span>
            <span :class="['status', isProducing ? 'running' : 'stopped']">
              {{ isProducing ? '运行中' : '已停止' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">活跃小车:</span>
            <span class="value">{{ activeCarts.length }}/{{ maxCarts }}</span>
          </div>
          <div class="status-item">
            <span class="label">待处理订单:</span>
            <span class="value">{{ pendingOrders.length }}</span>
          </div>
          <div class="status-item">
            <span class="label">完成订单:</span>
            <span class="value">{{ completedOrders }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工厂布局 -->
    <div class="factory-layout" ref="factoryRef">
      <svg ref="svgRef" class="factory-svg"></svg>
      
      <!-- 订单队列显示 -->
      <div class="order-queue">
        <h4>📋 订单队列</h4>
        <div class="order-list">
          <div 
            v-for="order in pendingOrders" 
            :key="order.id"
            class="order-item"
            :class="order.priority"
          >
            <span class="order-id">#{{ order.id }}</span>
            <span class="order-product">{{ order.product }}</span>
            <span class="order-quantity">{{ order.quantity }}件</span>
            <span class="order-destination">→ {{ order.destination }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import * as d3 from 'd3'
// 添加背景图片导入
import bgImage from '../static/image/bg.png'

// 组件引用
const svgRef = ref<SVGElement>()
const factoryRef = ref<HTMLElement>()

// 生产状态
const isProducing = ref(false)
const completedOrders = ref(0)
const maxCarts = 5

// 小车和订单数据
const activeCarts = ref<any[]>([])
const pendingOrders = ref<any[]>([])

// 工厂布局定义
const factoryLayout = {
  // 生产区域
  productionAreas: [
    { id: 'warehouse', x: 100, y: 100, width: 120, height: 80, label: '原料仓库', type: 'storage' },
    { id: 'assembly', x: 300, y: 150, width: 100, height: 60, label: '装配线', type: 'production' },
    { id: 'quality', x: 500, y: 120, width: 80, height: 80, label: '质检区', type: 'inspection' },
    { id: 'packaging', x: 650, y: 180, width: 100, height: 60, label: '包装区', type: 'packaging' },
    { id: 'shipping', x: 800, y: 100, width: 120, height: 100, label: '发货区', type: 'shipping' }
  ],
  
  // 道路网络
  roads: [
    { from: 'warehouse', to: 'assembly', path: 'M220,140 L300,180' },
    { from: 'assembly', to: 'quality', path: 'M400,180 L500,160' },
    { from: 'quality', to: 'packaging', path: 'M580,160 L650,210' },
    { from: 'packaging', to: 'shipping', path: 'M750,210 L800,150' },
    // 返回路径
    { from: 'shipping', to: 'warehouse', path: 'M800,120 Q450,50 220,120', type: 'return' }
  ],
  
  // 停车位
  parkingSpots: [
    { id: 'park1', x: 50, y: 200 },
    { id: 'park2', x: 50, y: 230 },
    { id: 'park3', x: 50, y: 260 }
  ]
}

// 小车类定义
class FactoryCart {
  constructor(id: string, startPosition: {x: number, y: number}) {
    this.id = id
    this.x = startPosition.x
    this.y = startPosition.y
    this.status = 'idle' // idle, moving, loading, unloading
    this.cargo = null
    this.destination = null
    this.speed = 2 // 像素/帧
    this.path = []
    this.pathIndex = 0
  }
  
  id: string
  x: number
  y: number
  status: string
  cargo: any
  destination: string | null
  speed: number
  path: {x: number, y: number}[]
  pathIndex: number
  element?: any
  
  // 移动到目标位置
  moveTo(targetX: number, targetY: number) {
    const dx = targetX - this.x
    const dy = targetY - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > this.speed) {
      this.x += (dx / distance) * this.speed
      this.y += (dy / distance) * this.speed
      return false // 未到达
    } else {
      this.x = targetX
      this.y = targetY
      return true // 已到达
    }
  }
  
  // 沿路径移动
  moveAlongPath() {
    if (this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex]
      if (this.moveTo(target.x, target.y)) {
        this.pathIndex++
      }
      return this.pathIndex < this.path.length
    }
    return false
  }
  
  // 设置路径
  setPath(path: {x: number, y: number}[]) {
    this.path = path
    this.pathIndex = 0
  }
  
  // 装载货物
  loadCargo(cargo: any) {
    this.cargo = cargo
    this.status = 'loaded'
  }
  
  // 卸载货物
  unloadCargo() {
    const cargo = this.cargo
    this.cargo = null
    this.status = 'idle'
    return cargo
  }
}

// 订单类定义
class ProductionOrder {
  constructor(id: number, product: string, quantity: number, destination: string, priority: string = 'normal') {
    this.id = id
    this.product = product
    this.quantity = quantity
    this.destination = destination
    this.priority = priority
    this.status = 'pending'
    this.createdAt = Date.now()
  }
  
  id: number
  product: string
  quantity: number
  destination: string
  priority: string
  status: string
  createdAt: number
  assignedCart?: string
}

let svg: any
let animationFrame: number
let orderIdCounter = 1

// 初始化工厂布局
function initializeFactory() {
  if (!svgRef.value) return
  
  svg = d3.select(svgRef.value)
    .attr('width', 1000)
    .attr('height', 400)
  
  // 添加背景图片定义
  const defs = svg.append('defs')
  
  // 添加背景图片pattern
  defs.append('pattern')
    .attr('id', 'backgroundPattern')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 1000)
    .attr('height', 400)
    .append('image')
    .attr('href', bgImage)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 1400)
    .attr('height', 400)
    .attr('opacity', 1)
  
  // 删除网格pattern相关代码
  // const gridPattern = defs.append('pattern')
  //   .attr('id', 'grid')
  //   .attr('width', 20)
  //   .attr('height', 20)
  //   .attr('patternUnits', 'userSpaceOnUse')
  // 
  // gridPattern.append('path')
  //   .attr('d', 'M 20 0 L 0 0 0 20')
  //   .attr('fill', 'none')
  //   .attr('stroke', '#e0e0e0')
  //   .attr('stroke-width', 1)
  
  // 添加背景图片层
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'url(#backgroundPattern)')
  
  // 删除网格层
  // svg.append('rect')
  //   .attr('width', '100%')
  //   .attr('height', '100%')
  //   .attr('fill', 'url(#grid)')
  //   .attr('opacity', 0.5)
  
  // 绘制生产区域
  const areas = svg.selectAll('.production-area')
    .data(factoryLayout.productionAreas)
    .enter()
    .append('g')
    .attr('class', 'production-area')
  
  areas.append('rect')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height)
    .attr('fill', d => getAreaColor(d.type))
    .attr('stroke', '#333')
    .attr('stroke-width', 2)
    .attr('rx', 5)
  
  areas.append('text')
    .attr('x', d => d.x + d.width/2)
    .attr('y', d => d.y + d.height/2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text(d => d.label)
  
  // 绘制道路
  svg.selectAll('.road')
    .data(factoryLayout.roads)
    .enter()
    .append('path')
    .attr('class', 'road')
    .attr('d', d => d.path)
    .attr('stroke', d => d.type === 'return' ? '#ff9800' : '#666')
    .attr('stroke-width', 8)
    .attr('stroke-dasharray', d => d.type === 'return' ? '10,5' : 'none')
    .attr('fill', 'none')
    .attr('opacity', 0.7)
  
  // 绘制停车位
  svg.selectAll('.parking')
    .data(factoryLayout.parkingSpots)
    .enter()
    .append('rect')
    .attr('class', 'parking')
    .attr('x', d => d.x - 15)
    .attr('y', d => d.y - 10)
    .attr('width', 30)
    .attr('height', 20)
    .attr('fill', '#f0f0f0')
    .attr('stroke', '#999')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
  
  // 初始化小车
  initializeCarts()
}

// 获取区域颜色
function getAreaColor(type: string): string {
  const colors = {
    storage: '#e3f2fd',
    production: '#fff3e0',
    inspection: '#f3e5f5',
    packaging: '#e8f5e8',
    shipping: '#fce4ec'
  }
  return colors[type] || '#f5f5f5'
}

// 初始化小车
function initializeCarts() {
  // 创建3辆初始小车
  for (let i = 0; i < 3; i++) {
    const parkingSpot = factoryLayout.parkingSpots[i]
    const cart = new FactoryCart(`cart-${i + 1}`, { x: parkingSpot.x, y: parkingSpot.y })
    
    // 创建小车的SVG元素
    const cartGroup = svg.append('g')
      .attr('class', 'cart')
      .attr('id', `cart-${cart.id}`)
    
    // 小车主体
    cartGroup.append('rect')
      .attr('x', -12)
      .attr('y', -8)
      .attr('width', 24)
      .attr('height', 16)
      .attr('fill', '#2196f3')
      .attr('stroke', '#1976d2')
      .attr('stroke-width', 1)
      .attr('rx', 2)
    
    // 小车轮子
    cartGroup.append('circle')
      .attr('cx', -8)
      .attr('cy', 6)
      .attr('r', 3)
      .attr('fill', '#333')
    
    cartGroup.append('circle')
      .attr('cx', 8)
      .attr('cy', 6)
      .attr('r', 3)
      .attr('fill', '#333')
    
    // 小车编号
    cartGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '8px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .text(i + 1)
    
    // 货物指示器（初始隐藏）
    cartGroup.append('rect')
      .attr('class', 'cargo-indicator')
      .attr('x', -6)
      .attr('y', -12)
      .attr('width', 12)
      .attr('height', 6)
      .attr('fill', '#ff9800')
      .attr('stroke', '#f57c00')
      .attr('stroke-width', 1)
      .attr('rx', 1)
      .style('display', 'none')
    
    cart.element = cartGroup
    activeCarts.value.push(cart)
  }
}

// 动画循环
function animationLoop() {
  if (!isProducing.value) return
  
  // 更新所有小车位置
  activeCarts.value.forEach(cart => {
    updateCartPosition(cart)
    updateCartVisual(cart)
  })
  
  // 处理订单分配
  processOrderAssignment()
  
  // 继续动画
  animationFrame = requestAnimationFrame(animationLoop)
}

// 更新小车位置
function updateCartPosition(cart: FactoryCart) {
  if (cart.status === 'moving' && cart.path.length > 0) {
    const stillMoving = cart.moveAlongPath()
    if (!stillMoving) {
      // 到达目的地
      cart.status = 'arrived'
      handleCartArrival(cart)
    }
  }
}

// 更新小车视觉效果
function updateCartVisual(cart: FactoryCart) {
  if (cart.element) {
    cart.element.attr('transform', `translate(${cart.x}, ${cart.y})`)
    
    // 更新货物指示器
    const cargoIndicator = cart.element.select('.cargo-indicator')
    cargoIndicator.style('display', cart.cargo ? 'block' : 'none')
    
    // 根据状态改变小车颜色
    const cartBody = cart.element.select('rect')
    const statusColors = {
      idle: '#2196f3',
      moving: '#4caf50',
      loading: '#ff9800',
      unloading: '#f44336'
    }
    cartBody.attr('fill', statusColors[cart.status] || '#2196f3')
  }
}

// 处理小车到达
function handleCartArrival(cart: FactoryCart) {
  if (cart.cargo && cart.destination) {
    // 卸货
    cart.status = 'unloading'
    setTimeout(() => {
      cart.unloadCargo()
      completedOrders.value++
      
      // 返回停车位
      const parkingSpot = factoryLayout.parkingSpots.find(spot => 
        !activeCarts.value.some(c => c.x === spot.x && c.y === spot.y && c.id !== cart.id)
      )
      
      if (parkingSpot) {
        cart.setPath(generatePath(cart.x, cart.y, parkingSpot.x, parkingSpot.y))
        cart.status = 'moving'
        cart.destination = null
      }
    }, 1000)
  }
}

// 生成路径
function generatePath(fromX: number, fromY: number, toX: number, toY: number): {x: number, y: number}[] {
  const path = []
  const steps = 20
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    path.push({
      x: fromX + (toX - fromX) * t,
      y: fromY + (toY - fromY) * t
    })
  }
  
  return path
}

// 处理订单分配
function processOrderAssignment() {
  const idleCarts = activeCarts.value.filter(cart => cart.status === 'idle')
  const unassignedOrders = pendingOrders.value.filter(order => !order.assignedCart)
  
  for (let i = 0; i < Math.min(idleCarts.length, unassignedOrders.length); i++) {
    const cart = idleCarts[i]
    const order = unassignedOrders[i]
    
    assignOrderToCart(order, cart)
  }
}

// 分配订单给小车
function assignOrderToCart(order: ProductionOrder, cart: FactoryCart) {
  order.assignedCart = cart.id
  cart.loadCargo(order)
  
  // 设置目的地路径
  const destination = factoryLayout.productionAreas.find(area => area.label === order.destination)
  if (destination) {
    cart.destination = order.destination
    cart.setPath(generatePath(cart.x, cart.y, destination.x + destination.width/2, destination.y + destination.height/2))
    cart.status = 'moving'
  }
  
  // 从待处理订单中移除
  const index = pendingOrders.value.indexOf(order)
  if (index > -1) {
    pendingOrders.value.splice(index, 1)
  }
}

// 控制函数
function startProduction() {
  isProducing.value = true
  animationLoop()
}

function stopProduction() {
  isProducing.value = false
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
}

function addOrder() {
  const products = ['产品A', '产品B', '产品C']
  const destinations = ['装配线', '质检区', '包装区', '发货区']
  const priorities = ['normal', 'high', 'urgent']
  
  const order = new ProductionOrder(
    orderIdCounter++,
    products[Math.floor(Math.random() * products.length)],
    Math.floor(Math.random() * 10) + 1,
    destinations[Math.floor(Math.random() * destinations.length)],
    priorities[Math.floor(Math.random() * priorities.length)]
  )
  
  pendingOrders.value.push(order)
}

function deployCart() {
  if (activeCarts.value.length < maxCarts) {
    const availableSpot = factoryLayout.parkingSpots.find(spot => 
      !activeCarts.value.some(cart => cart.x === spot.x && cart.y === spot.y)
    )
    
    if (availableSpot) {
      const newCart = new FactoryCart(`cart-${activeCarts.value.length + 1}`, availableSpot)
      // 创建新小车的视觉元素...
      activeCarts.value.push(newCart)
    }
  }
}

function recallAllCarts() {
  activeCarts.value.forEach(cart => {
    cart.status = 'idle'
    cart.cargo = null
    cart.destination = null
  })
}

// 组件挂载
onMounted(() => {
  initializeFactory()
  
  // 添加一些初始订单
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      addOrder()
    }
  }, 1000)
})
</script>

<style scoped>
.factory-simulation {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.control-panel {
  display: flex;
  gap: 20px;
  padding: 15px;
  background: white;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-section h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.control-section button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.btn-primary { background: #2196f3; color: white; }
.btn-danger { background: #f44336; color: white; }
.btn-success { background: #4caf50; color: white; }
.btn-info { background: #00bcd4; color: white; }
.btn-warning { background: #ff9800; color: white; }

.btn-primary:hover { background: #1976d2; }
.btn-danger:hover { background: #d32f2f; }
.btn-success:hover { background: #388e3c; }
.btn-info:hover { background: #0097a7; }
.btn-warning:hover { background: #f57c00; }

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-section {
  min-width: 200px;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.label {
  color: #666;
}

.value {
  font-weight: bold;
  color: #333;
}

.status.running {
  color: #4caf50;
  font-weight: bold;
}

.status.stopped {
  color: #f44336;
  font-weight: bold;
}

.factory-layout {
  display: flex;
  flex: 1;
  position: relative;
}

.factory-svg {
  flex: 1;
  background: white;
  border: 1px solid #ddd;
}

.order-queue {
  width: 250px;
  background: white;
  border-left: 1px solid #ddd;
  padding: 15px;
  overflow-y: auto;
}

.order-queue h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-item {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: #f9f9f9;
}

.order-item.high {
  border-color: #ff9800;
  background: #fff3e0;
}

.order-item.urgent {
  border-color: #f44336;
  background: #ffebee;
}

.order-id {
  font-weight: bold;
  color: #666;
}

.order-product {
  display: block;
  margin: 5px 0;
  font-weight: bold;
}

.order-quantity {
  color: #2196f3;
}

.order-destination {
  display: block;
  margin-top: 5px;
  color: #4caf50;
  font-style: italic;
}

/* SVG 样式 */
:deep(.cart) {
  cursor: pointer;
  transition: all 0.3s;
}

:deep(.cart:hover) {
  filter: drop-shadow(0 0 5px rgba(33, 150, 243, 0.8));
}

:deep(.production-area) {
  transition: all 0.3s;
}

:deep(.production-area:hover) {
  opacity: 0.8;
}

:deep(.road) {
  transition: all 0.3s;
}

:deep(.road:hover) {
  stroke-width: 12;
}
</style>