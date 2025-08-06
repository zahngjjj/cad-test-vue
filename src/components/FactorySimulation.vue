<template>
  <div class="factory-simulation">
    <!-- 增强控制面板 -->
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
      
      <div class="control-section">
        <h3>📍 GPS定位控制</h3>
        <div class="gps-controls">
          <select v-model="selectedCartId" class="cart-selector">
            <option value="">选择小车</option>
            <option v-for="cart in enhancedCarts" :key="cart.id" :value="cart.id">
              小车 {{ cart.id }} ({{ cart.isOnline ? '在线' : '离线' }})
            </option>
          </select>
          
          <div class="coordinate-inputs">
            <input 
              v-model.number="targetLatitude" 
              type="number" 
              step="0.000001" 
              placeholder="纬度"
              class="coord-input"
            >
            <input 
              v-model.number="targetLongitude" 
              type="number" 
              step="0.000001" 
              placeholder="经度"
              class="coord-input"
            >
            <input 
              v-model="targetDestination" 
              type="text" 
              placeholder="目的地名称"
              class="dest-input"
            >
          </div>
          
          <button 
            @click="sendGpsCommand" 
            :disabled="!selectedCartId || !targetLatitude || !targetLongitude"
            class="btn-gps"
          >
            📍 发送GPS指令
          </button>
          
          <button 
            @click="toggleCartStatus" 
            :disabled="!selectedCartId"
            class="btn-toggle"
          >
            🔄 切换在线状态
          </button>
        </div>
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
            <span class="value">{{ enhancedCarts.length }}/{{ maxCarts }}</span>
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
      
      <div class="control-section">
        <h3>📦 发货区管理</h3>
        <div class="packaging-stats">
          <div class="stat-item">
            <span class="label">当前库存:</span>
            <span class="value highlight">{{ packagingCounter }}</span>
          </div>
          <div class="stat-item">
            <span class="label">送货阈值:</span>
            <span class="value">{{ packagingTarget }}</span>
          </div>
          <div class="stat-item">
            <span class="label">可送货量:</span>
            <span class="value" :class="packagingCounter >= 100 ? 'text-success' : 'text-warning'">
              {{ packagingCounter >= 100 ? '✅ 可送货' : '⚠️ 不足' }}
            </span>
          </div>
          <div class="stat-item">
            <span class="label">总生产量:</span>
            <span class="value">{{ totalProduced }}</span>
          </div>
        </div>
        
        <div class="packaging-controls">
          <button @click="manualDelivery" class="btn-warning">
            🚚 手动送货
          </button>
          <button @click="resetPackagingCounter" class="btn-secondary">
            🔄 重置计数
          </button>
          <button @click="addTestProducts" class="btn-info">
            📦 添加测试产品
          </button>
        </div>
        
        <div class="auto-delivery-toggle">
          <label>
            <input 
              type="checkbox" 
              v-model="autoDeliveryEnabled"
            >
            自动送货 (满{{ packagingTarget }}个)
          </label>
        </div>
      </div>
      
      <div class="control-section">
        <h3>⚡ 实时生产控制</h3>
        <div class="production-controls">
          <div class="speed-control">
            <label>生产速度: {{ realTimeProduction.productionSpeed }}x</label>
            <input 
              type="range" 
              min="1" 
              max="5" 
              step="1"
              v-model.number="realTimeProduction.productionSpeed"
              @input="adjustProductionSpeed(realTimeProduction.productionSpeed)"
              class="speed-slider"
            >
          </div>
          
          <div class="production-stats">
            <div class="stat-item">
              <span class="label">生产状态:</span>
              <span :class="['status', realTimeProduction.isRunning ? 'running' : 'stopped']">
                {{ realTimeProduction.isRunning ? '运行中' : '已停止' }}
              </span>
            </div>
            <div class="stat-item">
              <span class="label">当前批次:</span>
              <span class="value">{{ realTimeProduction.currentBatch }}</span>
            </div>
            <div class="stat-item">
              <span class="label">日目标:</span>
              <span class="value">{{ realTimeProduction.dailyTarget }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="status-section">
        <h3>🚚 送货记录</h3>
        <div class="delivery-history">
          <div v-if="deliveryHistory.length === 0" class="no-deliveries">
            暂无送货记录
          </div>
          <div 
            v-for="delivery in deliveryHistory.slice(0, 5)" 
            :key="delivery.id"
            class="delivery-item"
            :class="delivery.status"
          >
            <div class="delivery-header">
              <span class="delivery-id">#{{ delivery.id }}</span>
              <span :class="['delivery-status', delivery.status]">
                {{ getDeliveryStatusText(delivery.status) }}
              </span>
            </div>
            <div class="delivery-details">
              <span>数量: {{ delivery.quantity }}个</span>
              <span>时间: {{ formatTime(delivery.timestamp) }}</span>
            </div>
            <div class="delivery-destination">
              目的地: {{ delivery.destination }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="status-section">
        <h3>📊 实时GPS状态</h3>
        <div class="gps-status-grid">
          <div v-for="cart in enhancedCarts" :key="cart.id" class="cart-status">
            <div class="cart-header">
              <span class="cart-name">🚛 {{ cart.id }}</span>
              <span :class="['online-status', cart.isOnline ? 'online' : 'offline']">
                {{ cart.isOnline ? '在线' : '离线' }}
              </span>
            </div>
            <div class="gps-info">
              <div class="gps-coords">📍 {{ cart.latitude.toFixed(6) }}, {{ cart.longitude.toFixed(6) }}</div>
              <div class="gps-details">
                <span>速度: {{ cart.speed.toFixed(1) }} km/h</span>
                <span>方向: {{ cart.heading.toFixed(0) }}°</span>
                <span>精度: ±{{ cart.gpsAccuracy.toFixed(1) }}m</span>
              </div>
              <div class="cart-status-info">
                <span>状态: {{ getStatusText(cart.status) }}</span>
                <span v-if="cart.destination">目标: {{ cart.destination }}</span>
              </div>
            </div>
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
import { ref, onMounted, reactive, onUnmounted } from 'vue'
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

// 包装区生产计数器
const packagingCounter = ref(0)
const packagingTarget = ref(1000) // 每1000个触发送货
const totalProduced = ref(0)
const autoDeliveryEnabled = ref(true)
const productionRate = ref(50) // 每分钟生产数量
const lastDeliveryTime = ref(0)

// 实时生产状态
const realTimeProduction = ref({
  isRunning: false,
  currentBatch: 0,
  productionSpeed: 1, // 1-5倍速
  dailyTarget: 5000,
  todayProduced: 0
})

// 送货记录
const deliveryHistory = ref<Array<{
  id: number
  timestamp: number
  quantity: number
  destination: string
  status: 'pending' | 'in-transit' | 'delivered'
  estimatedArrival: number
}>>([])

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
let deliveryIdCounter = 1
let productionInterval: number | null = null

// GPS控制相关状态
const selectedCartId = ref('')
const targetLatitude = ref<number>()
const targetLongitude = ref<number>()
const targetDestination = ref('')

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
  locationWS.connect()
  enhancedAnimationLoop()
  startRealTimeProduction() // 启动实时生产
}

function stopProduction() {
  isProducing.value = false
  locationWS.disconnect()
  stopRealTimeProduction() // 停止实时生产
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
}

// 开始实时生产模拟
function startRealTimeProduction() {
  if (productionInterval) {
    clearInterval(productionInterval)
  }
  
  realTimeProduction.value.isRunning = true
  
  // 根据生产速度设置间隔时间
  const baseInterval = 1000 // 基础间隔1秒
  const interval = baseInterval / realTimeProduction.value.productionSpeed
  
  productionInterval = setInterval(() => {
    if (realTimeProduction.value.isRunning && isProducing.value) {
      simulateProduction()
    }
  }, interval)
  
  console.log('🏭 实时生产模拟已启动')
}

// 停止实时生产模拟
function stopRealTimeProduction() {
  if (productionInterval) {
    clearInterval(productionInterval)
    productionInterval = null
  }
  realTimeProduction.value.isRunning = false
  console.log('🏭 实时生产模拟已停止')
}

// 模拟生产过程
function simulateProduction() {
  // 模拟生产随机数量的产品（1-5个）
  const producedCount = Math.floor(Math.random() * 5) + 1
  
  // 更新包装区计数器
  packagingCounter.value += producedCount
  totalProduced.value += producedCount
  realTimeProduction.value.todayProduced += producedCount
  
//   console.log(`📦 包装区新增 ${producedCount} 个产品，当前总数: ${packagingCounter.value}`)
  
  // 检查是否达到送货阈值
  if (autoDeliveryEnabled.value && packagingCounter.value >= packagingTarget.value) {
    triggerAutoDelivery()
  }
  
  // 更新生产批次
  realTimeProduction.value.currentBatch = Math.floor(packagingCounter.value / 100)
}

// 触发自动送货
function triggerAutoDelivery() {
  const deliveryQuantity = Math.floor(packagingCounter.value / packagingTarget.value) * packagingTarget.value
  
  if (deliveryQuantity > 0) {
    // 创建送货记录
    const delivery = {
      id: deliveryIdCounter++,
      timestamp: Date.now(),
      quantity: deliveryQuantity,
      destination: '客户配送中心',
      status: 'pending' as const,
      estimatedArrival: Date.now() + (30 * 60 * 1000) // 预计30分钟送达
    }
    
    deliveryHistory.value.unshift(delivery)
    
    // 减少包装区库存
    packagingCounter.value -= deliveryQuantity
    lastDeliveryTime.value = Date.now()
    
    // 派遣送货小车
    dispatchDeliveryCart(delivery)
    
    console.log(`🚚 自动触发送货: ${deliveryQuantity} 个产品已安排配送`)
    
    // 更新送货状态
    setTimeout(() => {
      delivery.status = 'in-transit'
      console.log(`🚛 送货 #${delivery.id} 已出发`)
    }, 2000)
    
    setTimeout(() => {
      delivery.status = 'delivered'
      console.log(`✅ 送货 #${delivery.id} 已送达`)
    }, delivery.estimatedArrival - Date.now())
  }
}

// 派遣送货小车
function dispatchDeliveryCart(delivery: any) {
  // 寻找空闲小车 - 修改为使用enhancedCarts
  const availableCart = enhancedCarts.value.find(cart => cart.status === 'idle' && cart.isOnline)
  
  if (availableCart) {
    // 创建送货订单
    const deliveryOrder = new ProductionOrder(
      delivery.id,
      `批量产品 x${delivery.quantity}`,
      delivery.quantity,
      '发货区',
      'urgent'
    )
    
    // 分配给小车 - 使用增强版分配函数
    assignEnhancedOrderToCart(deliveryOrder, availableCart)
    
    console.log(`🚛 小车 ${availableCart.id} 已被派遣执行送货任务 #${delivery.id}`)
  } else {
    console.log('⚠️ 暂无可用小车，送货任务已排队等待')
    // 自动部署新小车（如果可能）
    if (enhancedCarts.value.length < maxCarts) {
      // 部署增强小车
      const availableSpot = factoryLayout.parkingSpots.find(spot => 
        !enhancedCarts.value.some(c => 
          Math.abs(c.x - spot.x) < 10 && Math.abs(c.y - spot.y) < 10
        )
      )
      
      if (availableSpot) {
        const newCart = new EnhancedFactoryCart(`enhanced-cart-${enhancedCarts.value.length + 1}`, availableSpot)
        
        // 创建新小车的SVG元素（增强版）
        const cartGroup = svg.append('g')
          .attr('class', 'enhanced-cart')
          .attr('id', `cart-${newCart.id}`)
        
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
        
        // GPS精度圆圈
        cartGroup.append('circle')
          .attr('class', 'gps-accuracy')
          .attr('r', 0)
          .attr('fill', 'rgba(33, 150, 243, 0.2)')
          .attr('stroke', '#2196f3')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
        
        // 方向指示器
        cartGroup.append('polygon')
          .attr('class', 'direction-indicator')
          .attr('points', '0,-15 -5,-10 5,-10')
          .attr('fill', '#ff4444')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
        
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
          .text(enhancedCarts.value.length + 1)
        
        // GPS坐标显示
        cartGroup.append('text')
          .attr('class', 'gps-coords')
          .attr('x', 0)
          .attr('y', -20)
          .attr('text-anchor', 'middle')
          .attr('font-size', '6px')
          .attr('fill', '#666')
          .text(`${newCart.latitude.toFixed(6)}, ${newCart.longitude.toFixed(6)}`)
        
        // 货物指示器
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
        
        newCart.element = cartGroup
        enhancedCarts.value.push(newCart)
        
        // 递归尝试分配
        setTimeout(() => dispatchDeliveryCart(delivery), 1000)
      }
    }
  }
}

// 手动触发送货
function manualDelivery() {
  console.log(`📦 当前包装区库存: ${packagingCounter.value}个`)
  
  if (packagingCounter.value >= 10) { // 降低最低送货要求到10个
    // 手动送货时，即使不满1000个也可以送货
    const deliveryQuantity = packagingCounter.value >= 100 ? 
      Math.floor(packagingCounter.value / 100) * 100 : // 按100的倍数送货
      packagingCounter.value // 全部送货
    
    if (deliveryQuantity > 0) {
      // 创建送货记录
      const delivery = {
        id: deliveryIdCounter++,
        timestamp: Date.now(),
        quantity: deliveryQuantity,
        destination: '客户配送中心',
        status: 'pending' as const,
        estimatedArrival: Date.now() + (30 * 60 * 1000) // 预计30分钟送达
      }
      
      deliveryHistory.value.unshift(delivery)
      
      // 减少包装区库存
      packagingCounter.value -= deliveryQuantity
      lastDeliveryTime.value = Date.now()
      
      // 派遣送货小车
      dispatchDeliveryCart(delivery)
      
      console.log(`🚚 手动送货: ${deliveryQuantity} 个产品已安排配送`)
      
      // 更新送货状态
      setTimeout(() => {
        delivery.status = 'in-transit'
        console.log(`🚛 送货 #${delivery.id} 已出发`)
      }, 2000)
      
      setTimeout(() => {
        delivery.status = 'delivered'
        console.log(`✅ 送货 #${delivery.id} 已送达`)
      }, delivery.estimatedArrival - Date.now())
    }
  } else if (packagingCounter.value > 0) {
    console.log(`⚠️ 包装区产品数量较少(${packagingCounter.value}个)，建议至少10个再送货`)
    // 提供强制送货选项
    if (confirm(`当前只有${packagingCounter.value}个产品，是否强制送货？`)) {
      // 强制送货逻辑
      const delivery = {
        id: deliveryIdCounter++,
        timestamp: Date.now(),
        quantity: packagingCounter.value,
        destination: '客户配送中心',
        status: 'pending' as const,
        estimatedArrival: Date.now() + (30 * 60 * 1000)
      }
      
      deliveryHistory.value.unshift(delivery)
      packagingCounter.value = 0
      lastDeliveryTime.value = Date.now()
      dispatchDeliveryCart(delivery)
      
      console.log(`🚚 强制送货: ${delivery.quantity} 个产品已安排配送`)
    }
  } else {
    console.log('⚠️ 包装区暂无产品，无法安排送货')
    // 提供测试数据选项
    if (confirm('包装区暂无产品，是否添加测试数据？')) {
      packagingCounter.value = 150 // 添加150个测试产品
      totalProduced.value += 150
      console.log('✅ 已添加150个测试产品到包装区')
    }
  }
}

// 调整生产速度
function adjustProductionSpeed(speed: number) {
  realTimeProduction.value.productionSpeed = Math.max(1, Math.min(5, speed))
  
  if (realTimeProduction.value.isRunning) {
    // 重启生产以应用新速度
    stopRealTimeProduction()
    startRealTimeProduction()
  }
  
  console.log(`⚡ 生产速度已调整为 ${realTimeProduction.value.productionSpeed}x`)
}

// 重置包装区计数器
function resetPackagingCounter() {
  packagingCounter.value = 0
  console.log('🔄 包装区计数器已重置')
}

// 添加测试产品
function addTestProducts() {
  const testAmount = 150
  packagingCounter.value += testAmount
  totalProduced.value += testAmount
  realTimeProduction.value.todayProduced += testAmount
  console.log(`📦 已添加 ${testAmount} 个测试产品到包装区`)
}

// 获取送货状态文本
function getDeliveryStatusText(status: string): string {
  const statusMap = {
    pending: '准备中',
    'in-transit': '运输中',
    delivered: '已送达'
  }
  return statusMap[status] || status
}

// 格式化时间
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
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
  if (enhancedCarts.value.length < maxCarts) {
    const availableSpot = factoryLayout.parkingSpots.find(spot => 
      !enhancedCarts.value.some(c => 
        Math.abs(c.x - spot.x) < 10 && Math.abs(c.y - spot.y) < 10
      )
    )
    
    if (availableSpot) {
      const newCart = new EnhancedFactoryCart(`enhanced-cart-${enhancedCarts.value.length + 1}`, availableSpot)
      
      // 创建新小车的SVG元素（增强版）
      const cartGroup = svg.append('g')
        .attr('class', 'enhanced-cart')
        .attr('id', `cart-${newCart.id}`)
      
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
      
      // GPS精度圆圈
      cartGroup.append('circle')
        .attr('class', 'gps-accuracy')
        .attr('r', 0)
        .attr('fill', 'rgba(33, 150, 243, 0.2)')
        .attr('stroke', '#2196f3')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
      
      // 方向指示器
      cartGroup.append('polygon')
        .attr('class', 'direction-indicator')
        .attr('points', '0,-15 -5,-10 5,-10')
        .attr('fill', '#ff4444')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
      
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
        .text(enhancedCarts.value.length + 1)
      
      // GPS坐标显示
      cartGroup.append('text')
        .attr('class', 'gps-coords')
        .attr('x', 0)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '6px')
        .attr('fill', '#666')
        .text(`${newCart.latitude.toFixed(6)}, ${newCart.longitude.toFixed(6)}`)
      
      // 货物指示器
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
      
      newCart.element = cartGroup
      enhancedCarts.value.push(newCart)
    }
  }
}

function recallAllCarts() {
  enhancedCarts.value.forEach(cart => {
    // 清空当前任务
    cart.cargo = null
    cart.destination = null
    cart.plannedPath = []
    cart.currentPathIndex = 0
    
    // 寻找可用的停车位
    const availableParkingSpot = factoryLayout.parkingSpots.find(spot => 
      !enhancedCarts.value.some(otherCart => 
        otherCart.id !== cart.id && 
        Math.abs(otherCart.x - spot.x) < 10 && 
        Math.abs(otherCart.y - spot.y) < 10
      )
    )
    
    if (availableParkingSpot) {
      // 设置GPS目标为停车位
      const gpsCoord = svgToGps(availableParkingSpot.x, availableParkingSpot.y)
      cart.setGpsDestination(gpsCoord.latitude, gpsCoord.longitude, '停车位')
      
      console.log(`🚗 小车 ${cart.id} 正在返回停车位`)
    } else {
      // 如果没有可用停车位，直接设置为空闲状态
      cart.status = 'idle'
      console.log(`⚠️ 小车 ${cart.id} 无可用停车位，就地待命`)
    }
  })
  
  // 清空所有待处理订单
  pendingOrders.value = []
  
  console.log('📢 所有小车已收到召回指令')
}

// 发送GPS指令
function sendGpsCommand() {
  if (selectedCartId.value && targetLatitude.value && targetLongitude.value) {
    moveCartToGpsLocation(
      selectedCartId.value, 
      targetLatitude.value, 
      targetLongitude.value, 
      targetDestination.value || '目标位置'
    )
    
    // 清空输入
    targetLatitude.value = undefined
    targetLongitude.value = undefined
    targetDestination.value = ''
  }
}

// 切换小车状态
function toggleCartStatus() {
  if (selectedCartId.value) {
    toggleCartOnlineStatus(selectedCartId.value)
  }
}

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap = {
    idle: '空闲',
    moving: '移动中',
    loading: '装载中',
    unloading: '卸载中',
    arrived: '已到达'
  }
  return statusMap[status] || status
}

// GPS定位系统配置
const gpsConfig = {
  // 工厂坐标系统（模拟真实GPS坐标）
  factoryBounds: {
    minLat: 39.9042,  // 模拟北京某工厂纬度范围
    maxLat: 39.9142,
    minLng: 116.4074, // 模拟北京某工厂经度范围
    maxLng: 116.4174
  },
  // SVG坐标系统
  svgBounds: {
    width: 1000,
    height: 400
  },
  updateInterval: 1000, // 位置更新间隔（毫秒）
  precision: 6 // GPS精度（小数位数）
}

// 实时定位数据结构
interface LocationData {
  cartId: string
  timestamp: number
  latitude: number
  longitude: number
  speed: number // km/h
  heading: number // 方向角度 0-360
  accuracy: number // 精度（米）
  status: 'idle' | 'moving' | 'loading' | 'unloading'
  orderId?: string
  destination?: {
    latitude: number
    longitude: number
    name: string
  }
}

// 路径点数据结构
interface PathPoint {
  latitude: number
  longitude: number
  x: number
  y: number
  timestamp: number
  estimatedArrival?: number
}

// 增强的小车类
class EnhancedFactoryCart extends FactoryCart {
  // GPS相关属性
  latitude: number = 0
  longitude: number = 0
  gpsAccuracy: number = 5
  heading: number = 0
  speed: number = 0 // km/h
  
  // 路径规划
  plannedPath: PathPoint[] = []
  currentPathIndex: number = 0
  
  // 实时状态
  lastUpdateTime: number = 0
  isOnline: boolean = true
  batteryLevel: number = 100
  
  constructor(id: string, startPosition: {x: number, y: number}) {
    super(id, startPosition)
    
    // 初始化GPS坐标
    const gpsCoord = svgToGps(startPosition.x, startPosition.y)
    this.latitude = gpsCoord.latitude
    this.longitude = gpsCoord.longitude
    this.lastUpdateTime = Date.now()
  }
  
  // 更新GPS位置
  updateGpsLocation(locationData: LocationData) {
    this.latitude = locationData.latitude
    this.longitude = locationData.longitude
    this.speed = locationData.speed
    this.heading = locationData.heading
    this.gpsAccuracy = locationData.accuracy
    this.status = locationData.status
    this.lastUpdateTime = locationData.timestamp
    
    // 转换为SVG坐标
    const svgCoord = gpsToSvg(this.latitude, this.longitude)
    this.x = svgCoord.x
    this.y = svgCoord.y
  }
  
  // 设置目标位置（GPS坐标）
  setGpsDestination(latitude: number, longitude: number, destinationName: string) {
    this.destination = destinationName
    
    // 生成路径规划
    this.plannedPath = generateGpsPath(
      this.latitude, this.longitude,
      latitude, longitude
    )
    this.currentPathIndex = 0
    this.status = 'moving'
  }
  
  // 沿GPS路径移动
  moveAlongGpsPath(): boolean {
    if (this.currentPathIndex < this.plannedPath.length) {
      const targetPoint = this.plannedPath[this.currentPathIndex]
      
      // 计算到目标点的距离
      const distance = calculateGpsDistance(
        this.latitude, this.longitude,
        targetPoint.latitude, targetPoint.longitude
      )
      
      // 如果距离很近，移动到下一个路径点
      if (distance < 0.00001) { // 约1米精度
        this.currentPathIndex++
        return this.currentPathIndex < this.plannedPath.length
      }
      
      // 平滑移动到目标点
      const moveSpeed = 0.00001 // GPS坐标移动速度
      const deltaLat = targetPoint.latitude - this.latitude
      const deltaLng = targetPoint.longitude - this.longitude
      const totalDistance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng)
      
      if (totalDistance > moveSpeed) {
        this.latitude += (deltaLat / totalDistance) * moveSpeed
        this.longitude += (deltaLng / totalDistance) * moveSpeed
      } else {
        this.latitude = targetPoint.latitude
        this.longitude = targetPoint.longitude
      }
      
      // 更新SVG坐标
      const svgCoord = gpsToSvg(this.latitude, this.longitude)
      this.x = svgCoord.x
      this.y = svgCoord.y
      
      // 计算方向角
      this.heading = calculateHeading(
        this.latitude, this.longitude,
        targetPoint.latitude, targetPoint.longitude
      )
      
      return true
    }
    return false
  }
}

// 坐标转换函数
function gpsToSvg(latitude: number, longitude: number): {x: number, y: number} {
  const { factoryBounds, svgBounds } = gpsConfig
  
  const x = ((longitude - factoryBounds.minLng) / (factoryBounds.maxLng - factoryBounds.minLng)) * svgBounds.width
  const y = ((factoryBounds.maxLat - latitude) / (factoryBounds.maxLat - factoryBounds.minLat)) * svgBounds.height
  
  return { x: Math.max(0, Math.min(svgBounds.width, x)), y: Math.max(0, Math.min(svgBounds.height, y)) }
}

function svgToGps(x: number, y: number): {latitude: number, longitude: number} {
  const { factoryBounds, svgBounds } = gpsConfig
  
  const longitude = factoryBounds.minLng + (x / svgBounds.width) * (factoryBounds.maxLng - factoryBounds.minLng)
  const latitude = factoryBounds.maxLat - (y / svgBounds.height) * (factoryBounds.maxLat - factoryBounds.minLat)
  
  return { 
    latitude: parseFloat(latitude.toFixed(gpsConfig.precision)), 
    longitude: parseFloat(longitude.toFixed(gpsConfig.precision)) 
  }
}

// GPS距离计算（Haversine公式）
function calculateGpsDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // 地球半径（米）
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lng2-lng1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // 距离（米）
}

// 计算方向角
function calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δλ = (lng2-lng1) * Math.PI/180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ)

  const θ = Math.atan2(y, x)

  return (θ*180/Math.PI + 360) % 360 // 转换为0-360度
}

// GPS路径规划（简化版A*算法）
function generateGpsPath(startLat: number, startLng: number, endLat: number, endLng: number): PathPoint[] {
  const path: PathPoint[] = []
  const steps = 10 // 路径分段数
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const lat = startLat + (endLat - startLat) * t
    const lng = startLng + (endLng - startLng) * t
    const svgCoord = gpsToSvg(lat, lng)
    
    path.push({
      latitude: lat,
      longitude: lng,
      x: svgCoord.x,
      y: svgCoord.y,
      timestamp: Date.now() + i * 1000
    })
  }
  
  return path
}

// 模拟实时位置数据
function simulateLocationData(cartId: string): LocationData {
  const cart = enhancedCarts.value.find(c => c.id === cartId)
  if (!cart) throw new Error(`Cart ${cartId} not found`)
  
  // 添加GPS噪声模拟真实GPS精度
  const noise = () => (Math.random() - 0.5) * 0.00001 // ±5米精度
  
  return {
    cartId,
    timestamp: Date.now(),
    latitude: cart.latitude + noise(),
    longitude: cart.longitude + noise(),
    speed: cart.speed,
    heading: cart.heading,
    accuracy: cart.gpsAccuracy + Math.random() * 3, // 3-8米精度
    status: cart.status as any
  }
}

// 增强的小车数组
const enhancedCarts = ref<EnhancedFactoryCart[]>([])

// 实时位置更新定时器
let locationUpdateTimer: number

// WebSocket连接（模拟）
class LocationWebSocket {
  private callbacks: ((data: LocationData) => void)[] = []
  private timer: number = 0
  
  connect() {
    console.log('🔗 连接到位置服务...')
    
    // 模拟实时数据推送
    this.timer = setInterval(() => {
      enhancedCarts.value.forEach(cart => {
        if (cart.isOnline) {
          const locationData = simulateLocationData(cart.id)
          this.callbacks.forEach(callback => callback(locationData))
        }
      })
    }, gpsConfig.updateInterval)
  }
  
  disconnect() {
    console.log('🔌 断开位置服务连接')
    clearInterval(this.timer)
  }
  
  onLocationUpdate(callback: (data: LocationData) => void) {
    this.callbacks.push(callback)
  }
  
  // 发送位置指令
  sendLocationCommand(cartId: string, latitude: number, longitude: number, destinationName: string) {
    console.log(`📍 发送位置指令给小车 ${cartId}: ${latitude}, ${longitude} -> ${destinationName}`)
    
    const cart = enhancedCarts.value.find(c => c.id === cartId)
    if (cart) {
      cart.setGpsDestination(latitude, longitude, destinationName)
    }
  }
}

const locationWS = new LocationWebSocket()

// 修改初始化函数
function initializeEnhancedCarts() {
  enhancedCarts.value = []
  
  // 创建增强小车
  for (let i = 0; i < 3; i++) {
    const parkingSpot = factoryLayout.parkingSpots[i]
    const cart = new EnhancedFactoryCart(`cart-${i + 1}`, { x: parkingSpot.x, y: parkingSpot.y })
    
    // 创建小车的SVG元素（增强版）
    const cartGroup = svg.append('g')
      .attr('class', 'enhanced-cart')
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
    
    // GPS精度圆圈
    cartGroup.append('circle')
      .attr('class', 'gps-accuracy')
      .attr('r', 0)
      .attr('fill', 'rgba(33, 150, 243, 0.2)')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
    
    // 方向指示器
    cartGroup.append('polygon')
      .attr('class', 'direction-indicator')
      .attr('points', '0,-15 -5,-10 5,-10')
      .attr('fill', '#ff4444')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
    
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
    
    // GPS坐标显示
    cartGroup.append('text')
      .attr('class', 'gps-coords')
      .attr('x', 0)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '6px')
      .attr('fill', '#666')
      .text(`${cart.latitude.toFixed(6)}, ${cart.longitude.toFixed(6)}`)
    
    // 货物指示器
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
    enhancedCarts.value.push(cart)
  }
}

// 增强的动画循环
function enhancedAnimationLoop() {
  if (!isProducing.value) return
  
  // 更新所有增强小车
  enhancedCarts.value.forEach(cart => {
    updateEnhancedCartPosition(cart)
    updateEnhancedCartVisual(cart)
  })
  
  // 处理订单分配
  processEnhancedOrderAssignment()
  
  // 继续动画
  animationFrame = requestAnimationFrame(enhancedAnimationLoop)
}

// 更新增强小车位置
function updateEnhancedCartPosition(cart: EnhancedFactoryCart) {
  if (cart.status === 'moving' && cart.plannedPath.length > 0) {
    const stillMoving = cart.moveAlongGpsPath()
    if (!stillMoving) {
      cart.status = 'arrived'
      handleEnhancedCartArrival(cart)
    }
  }
}

// 更新增强小车视觉效果
function updateEnhancedCartVisual(cart: EnhancedFactoryCart) {
  if (cart.element) {
    cart.element.attr('transform', `translate(${cart.x}, ${cart.y})`)
    
    // 更新GPS精度圆圈
    const accuracyRadius = Math.max(3, cart.gpsAccuracy / 2)
    cart.element.select('.gps-accuracy')
      .attr('r', accuracyRadius)
      .style('opacity', cart.isOnline ? 0.6 : 0.2)
    
    // 更新方向指示器
    cart.element.select('.direction-indicator')
      .attr('transform', `rotate(${cart.heading})`)
      .style('opacity', cart.speed > 0 ? 1 : 0.3)
    
    // 更新GPS坐标显示
    cart.element.select('.gps-coords')
      .text(`${cart.latitude.toFixed(6)}, ${cart.longitude.toFixed(6)}`)
    
    // 更新货物指示器
    const cargoIndicator = cart.element.select('.cargo-indicator')
    cargoIndicator.style('display', cart.cargo ? 'block' : 'none')
    
    // 根据状态和在线状态改变小车颜色
    const cartBody = cart.element.select('rect')
    const statusColors = {
      idle: cart.isOnline ? '#2196f3' : '#999',
      moving: cart.isOnline ? '#4caf50' : '#666',
      loading: cart.isOnline ? '#ff9800' : '#ccc',
      unloading: cart.isOnline ? '#f44336' : '#aaa'
    }
    cartBody.attr('fill', statusColors[cart.status] || '#2196f3')
  }
}

// 处理增强小车到达
function handleEnhancedCartArrival(cart: EnhancedFactoryCart) {
  if (cart.cargo && cart.destination) {
    cart.status = 'unloading'
    setTimeout(() => {
      cart.unloadCargo()
      completedOrders.value++
      
      // 返回停车位（使用GPS坐标）
      const parkingSpot = factoryLayout.parkingSpots.find(spot => 
        !enhancedCarts.value.some(c => 
          Math.abs(c.x - spot.x) < 10 && Math.abs(c.y - spot.y) < 10 && c.id !== cart.id
        )
      )
      
      if (parkingSpot) {
        const gpsCoord = svgToGps(parkingSpot.x, parkingSpot.y)
        cart.setGpsDestination(gpsCoord.latitude, gpsCoord.longitude, '停车位')
      }
    }, 1000)
  }
}

// 处理增强订单分配
function processEnhancedOrderAssignment() {
  const idleCarts = enhancedCarts.value.filter(cart => cart.status === 'idle' && cart.isOnline)
  const unassignedOrders = pendingOrders.value.filter(order => !order.assignedCart)
  
  for (let i = 0; i < Math.min(idleCarts.length, unassignedOrders.length); i++) {
    const cart = idleCarts[i]
    const order = unassignedOrders[i]
    
    assignEnhancedOrderToCart(order, cart)
  }
}

// 分配增强订单给小车
function assignEnhancedOrderToCart(order: ProductionOrder, cart: EnhancedFactoryCart) {
  order.assignedCart = cart.id
  cart.loadCargo(order)
  
  // 设置GPS目的地
  const destination = factoryLayout.productionAreas.find(area => area.label === order.destination)
  if (destination) {
    const gpsCoord = svgToGps(destination.x + destination.width/2, destination.y + destination.height/2)
    cart.setGpsDestination(gpsCoord.latitude, gpsCoord.longitude, order.destination)
    
    // 通过WebSocket发送位置指令
    locationWS.sendLocationCommand(cart.id, gpsCoord.latitude, gpsCoord.longitude, order.destination)
  }
  
  // 从待处理订单中移除
  const index = pendingOrders.value.indexOf(order)
  if (index > -1) {
    pendingOrders.value.splice(index, 1)
  }
}

// 手动控制小车位置
function moveCartToGpsLocation(cartId: string, latitude: number, longitude: number, destinationName: string) {
  locationWS.sendLocationCommand(cartId, latitude, longitude, destinationName)
}

// 切换小车在线状态
function toggleCartOnlineStatus(cartId: string) {
  const cart = enhancedCarts.value.find(c => c.id === cartId)
  if (cart) {
    cart.isOnline = !cart.isOnline
    console.log(`小车 ${cartId} ${cart.isOnline ? '上线' : '离线'}`)
  }
}

// 组件挂载
onMounted(() => {
  initializeFactory()
  initializeEnhancedCarts()
  
  // 设置位置更新监听
  locationWS.onLocationUpdate((locationData) => {
    const cart = enhancedCarts.value.find(c => c.id === locationData.cartId)
    if (cart) {
      cart.updateGpsLocation(locationData)
    }
  })
  
  // 添加一些初始订单
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      addOrder()
    }
  }, 1000)
})

// 组件卸载
onUnmounted(() => {
  locationWS.disconnect()
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})

</script>
<style scoped>
/* 主要布局样式 */
.factory-simulation {
  display: flex;
  height: 100vh;
  width: 100%;
  background: #f5f5f5;
  font-family: 'Arial', sans-serif;
  overflow: hidden;
}

/* 控制面板样式 */
.control-panel {
  width: 320px;
  min-width: 320px;
  background: white;
  border-right: 2px solid #e0e0e0;
  padding: 16px;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
}

/* 工厂布局区域 */
.factory-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

/* SVG容器 */
.factory-svg {
  width: 100%;
  height: calc(100vh - 200px);
  background: white;
  border-radius: 8px;
  margin: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 控制面板内部样式 */
.control-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.control-section h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

/* 按钮样式 */
.btn-primary, .btn-danger, .btn-success, .btn-info, .btn-warning {
  padding: 8px 16px;
  margin: 4px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
  transform: translateY(-1px);
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
  transform: translateY(-1px);
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
  transform: translateY(-1px);
}



button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* 状态面板样式 */
.status-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-section h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 8px;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  font-weight: 600;
  color: #333;
}

/* 包装区管理样式 */
.packaging-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.text-success {
  color: #28a745;
  font-weight: 600;
}

.text-warning {
  color: #ffc107;
  font-weight: 600;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 11px;
}

.value.highlight {
  color: #007bff;
  font-weight: 700;
  font-size: 14px;
}

.packaging-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.auto-delivery-toggle {
  padding: 8px;
  background: #e3f2fd;
  border-radius: 4px;
  font-size: 11px;
}

.auto-delivery-toggle label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

/* 实时生产控制样式 */
.production-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.speed-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.speed-control label {
  font-size: 11px;
  font-weight: 500;
}

.speed-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
}

.production-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 送货记录样式 */
.delivery-history {
  max-height: 200px;
  overflow-y: auto;
}

.no-deliveries {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.delivery-item {
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  border-left: 3px solid #007bff;
  background: #f8f9fa;
  font-size: 10px;
}

.delivery-item.pending {
  border-left-color: #ffc107;
  background: #fffbf0;
}

.delivery-item.in-transit {
  border-left-color: #17a2b8;
  background: #f0f8ff;
}

.delivery-item.delivered {
  border-left-color: #28a745;
  background: #f0fff4;
}

.delivery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.delivery-id {
  font-weight: 600;
  color: #007bff;
}

.delivery-status {
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
}

.delivery-status.pending {
  background: #fff3cd;
  color: #856404;
}

.delivery-status.in-transit {
  background: #cce7ff;
  color: #004085;
}

.delivery-status.delivered {
  background: #d4edda;
  color: #155724;
}

.delivery-details {
  display: flex;
  gap: 12px;
  color: #666;
  margin-bottom: 4px;
}

.delivery-destination {
  color: #28a745;
  font-weight: 500;
}

.status.running {
  color: #28a745;
  font-weight: 600;
}

.status.stopped {
  color: #dc3545;
  font-weight: 600;
}

/* 订单队列样式 */
.order-queue {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 300px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-height: 180px;
  overflow-y: auto;
}

.order-queue h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 11px;
  border-left: 3px solid #007bff;
}

.order-item.high {
  border-left-color: #dc3545;
  background: #fff5f5;
}

.order-item.medium {
  border-left-color: #ffc107;
  background: #fffbf0;
}

.order-item.low {
  border-left-color: #28a745;
  background: #f0fff4;
}

.order-id {
  font-weight: 600;
  color: #007bff;
}

.order-product {
  font-weight: 500;
  color: #333;
}

.order-quantity {
  color: #666;
}

.order-destination {
  color: #28a745;
  font-weight: 500;
}

.gps-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cart-selector {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.coordinate-inputs {
  display: flex;
  gap: 5px;
}

.coord-input, .dest-input {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
  width: 80px;
}

.dest-input {
  width: 100px;
}

.btn-gps {
  background: #4caf50;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.btn-toggle {
  background: #ff9800;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.gps-status-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.cart-status {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
  font-size: 10px;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.cart-name {
  font-weight: bold;
}

.online-status.online {
  color: #4caf50;
  font-weight: bold;
}

.online-status.offline {
  color: #f44336;
  font-weight: bold;
}

.gps-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.gps-coords {
  font-family: monospace;
  color: #2196f3;
  font-weight: bold;
}

.gps-details {
  display: flex;
  gap: 10px;
  color: #666;
}

.cart-status-info {
  display: flex;
  gap: 10px;
  color: #333;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .control-panel {
    width: 280px;
    min-width: 280px;
  }
  
  .factory-svg {
    height: calc(100vh - 180px);
  }
  
  .order-queue {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .factory-simulation {
    flex-direction: column;
    height: auto;
  }
  
  .control-panel {
    width: 100%;
    min-width: auto;
    max-height: 300px;
  }
  
  .factory-svg {
    height: 400px;
    margin: 8px;
  }
  
  .order-queue {
    position: relative;
    bottom: auto;
    right: auto;
    width: 100%;
    margin: 8px;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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

/* SVG增强样式 */
:deep(.enhanced-cart) {
  cursor: pointer;
  transition: all 0.3s;
}

:deep(.enhanced-cart:hover) {
  filter: drop-shadow(0 0 8px rgba(33, 150, 243, 0.8));
}

:deep(.gps-accuracy) {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.3; }
  100% { opacity: 0.6; }
}

:deep(.direction-indicator) {
  transition: transform 0.5s ease;
}
</style>