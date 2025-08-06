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
}

function stopProduction() {
  isProducing.value = false
  locationWS.disconnect()
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