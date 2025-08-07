<template>
  <div class="grid-factory-demo">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-section">
        <h3>🏭 设备产量控制</h3>
        <button @click="startProduction" :disabled="isProducing" class="btn-primary">
          开始生产
        </button>
        <button @click="stopProduction" :disabled="!isProducing" class="btn-danger">
          停止生产
        </button>
        <!-- <div class="production-rate">
          <label>产量速率: {{ productionRate }}/分钟</label>
          <input 
            type="range" 
            min="10" 
            max="100" 
            step="10"
            v-model.number="productionRate"
            class="rate-slider"
          >
        </div> -->
      </div>
      
      <!-- 设备产量监控 -->
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
          <!-- 调试信息 -->
          <div style="font-size: 10px; color: #999;">
            <!-- 开始时间: {{ productionStartTime }} -->
          </div>
        </div>
          <button @click="resetTotalProduction" class="btn-reset" :disabled="isProducing">
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
            <div 
              v-for="equipment in equipmentList" 
              :key="equipment.id"
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
          </div>
        </div>
      </div>
      
      <div class="control-section">
        <h3>🚛 小车调度</h3>
        <button @click="deployCart" class="btn-info">
          派遣小车
        </button>
        <button @click="recallAllCarts" class="btn-warning">
          召回所有小车
        </button>
        <div class="cart-controls">
          <select v-model="selectedCartId" class="cart-selector">
            <option value="">选择小车</option>
            <option v-for="cart in carts" :key="cart.id" :value="cart.id">
              小车 {{ cart.id }} ({{ cart.status }})
            </option>
          </select>
          <div class="grid-inputs">
            <input 
              v-model.number="targetGridX" 
              type="number" 
              min="0" 
              max="999" 
              placeholder="网格X"
              class="grid-input"
            >
            <input 
              v-model.number="targetGridY" 
              type="number" 
              min="0" 
              max="999" 
              placeholder="网格Y"
              class="grid-input"
            >
          </div>
          <button 
            @click="sendGridCommand" 
            :disabled="!selectedCartId || targetGridX === undefined || targetGridY === undefined"
            class="btn-grid"
          >
            📍 发送网格指令
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
            <span class="label">当前产量:</span>
            <span class="value">{{ currentProduction }}</span>
          </div>
          <div class="status-item">
            <span class="label">活跃小车:</span>
            <span class="value">{{ carts.length }}</span>
          </div>
          <div class="status-item">
            <span class="label">待送货物:</span>
            <span class="value">{{ pendingDeliveries.length }}</span>
          </div>
        </div>
      </div>
      
      <div class="status-section">
        <h3>🚚 小车状态</h3>
        <div class="cart-status-grid">
          <div v-for="cart in carts" :key="cart.id" class="cart-status">
            <div class="cart-header">
              <span class="cart-name">🚛 {{ cart.id }}</span>
              <span :class="['cart-status-text', cart.status]">
                {{ getStatusText(cart.status) }}
              </span>
            </div>
            <div class="cart-info">
              <div class="grid-coords">📍 网格: ({{ cart.gridX }}, {{ cart.gridY }})</div>
              <div class="cart-details">
                <span>速度: {{ cart.speed }} 格/秒</span>
                <span v-if="cart.cargo">货物: {{ cart.cargo.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工厂布局 -->
    <div class="factory-layout" ref="factoryRef">
      <svg ref="svgRef" class="factory-svg"></svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted ,computed} from 'vue'
import * as d3 from 'd3'

// 组件引用
const svgRef = ref<SVGElement>()
const factoryRef = ref<HTMLElement>()

// 网格配置
const GRID_SIZE = 1000 // 1000x1000网格
const CELL_SIZE = 1 // 每个网格单元的像素大小
// 移除固定的SVG_WIDTH和SVG_HEIGHT，改为动态获取
let SVG_WIDTH = 1000
let SVG_HEIGHT = 600

// 生产状态
const isProducing = ref(false)
const productionRate = ref(50) // 每分钟产量
const currentProduction = ref(0)

// 小车和货物数据
const carts = ref<GridCart[]>([])
const pendingDeliveries = ref<Delivery[]>([])
const selectedCartId = ref('')
const targetGridX = ref<number>()
const targetGridY = ref<number>()

// 添加当前时间用于实时更新
const currentTime = ref(Date.now())

// 设备列表 - 添加车间属性和累计产量字段
const equipmentList = ref([
  { id: 'eq1', name: '生产线A', workshop: '生产车间', currentProduction: 0, totalProduced: 0, maxProduction: 60, status: 'idle', gridX: 600, gridY: 100 },
  { id: 'eq2', name: '生产线B', workshop: '生产车间', currentProduction: 0, totalProduced: 0, maxProduction: 80, status: 'idle', gridX: 800, gridY: 450 },
  { id: 'eq3', name: '包装机', workshop: '包装车间', currentProduction: 0, totalProduced: 0, maxProduction: 40, status: 'idle', gridX: 700, gridY: 500 },
  { id: 'eq4', name: '质检台', workshop: '质检车间', currentProduction: 0, totalProduced: 0, maxProduction: 50, status: 'idle', gridX: 750, gridY: 220 }
])

// 添加生产开始时间记录
const productionStartTime = ref<number | null>(null)
const totalFactoryProduced = ref(0)

// 添加重置累计产量函数
function resetTotalProduction() {
  equipmentList.value.forEach(equipment => {
    equipment.totalProduced = 0
  })
  totalFactoryProduced.value = 0
  productionStartTime.value = 0
  currentTime.value = Date.now() // 重置当前时间
}

// 获取生产时长
const productionDuration = computed(() => {
  if (!productionStartTime.value) return '未开始'
  const duration = Math.floor((currentTime.value - productionStartTime.value) / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}分${seconds}秒`
})

// 车间累计产量计算
const workshopTotals = computed(() => {
  const totals = {}
  equipmentList.value.forEach(equipment => {
    if (!totals[equipment.workshop]) {
      totals[equipment.workshop] = {
        name: equipment.workshop,
        currentProduction: 0,
        totalProduced: 0,
        maxProduction: 0,
        equipmentCount: 0,
        runningCount: 0
      }
    }
    totals[equipment.workshop].currentProduction += equipment.currentProduction
    totals[equipment.workshop].totalProduced += equipment.totalProduced
    totals[equipment.workshop].maxProduction += equipment.maxProduction
    totals[equipment.workshop].equipmentCount += 1
    if (equipment.status === 'running') {
      totals[equipment.workshop].runningCount += 1
    }
  })
  return Object.values(totals)
})

// 网格小车类
class GridCart {
  constructor(id: string, gridX: number, gridY: number) {
    this.id = id
    this.gridX = gridX
    this.gridY = gridY
    this.status = 'idle'
    this.cargo = null
    this.speed = 1 // 降低速度，原来是2
    this.path = []
    this.pathIndex = 0
  }
  
  id: string
  gridX: number
  gridY: number
  status: string
  cargo: any
  speed: number
  path: {x: number, y: number}[]
  pathIndex: number
  element?: any
  
  // 移动到目标网格位置
  moveToGrid(targetGridX: number, targetGridY: number) {
    const dx = targetGridX - this.gridX
    const dy = targetGridY - this.gridY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > this.speed) {
      this.gridX += (dx / distance) * this.speed
      this.gridY += (dy / distance) * this.speed
      return false // 未到达
    } else {
      this.gridX = targetGridX
      this.gridY = targetGridY
      return true // 已到达
    }
  }
  
  // 沿路径移动
  moveAlongPath() {
    if (this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex]
      if (this.moveToGrid(target.x, target.y)) {
        this.pathIndex++
      }
      return this.pathIndex < this.path.length
    }
    return false
  }
  
  // 设置网格路径
  setGridPath(path: {x: number, y: number}[]) {
    this.path = path
    this.pathIndex = 0
  }
  
  // 网格坐标转SVG坐标
  getSVGPosition() {
    return {
      x: (this.gridX / (GRID_SIZE - 1)) * SVG_WIDTH,
      y: (this.gridY / (GRID_SIZE - 1)) * SVG_HEIGHT
    }
  }
}

// 货物类
interface Delivery {
  id: number
  type: string
  fromGridX: number
  fromGridY: number
  toGridX: number
  toGridY: number
  status: string
  assignedCart?: string
}

let svg: any
let animationFrame: number
let productionInterval: number | null = null
let deliveryIdCounter = 1

// 初始化工厂布局
function initializeFactory() {
  if (!svgRef.value || !factoryRef.value) return
  
  // 动态获取容器尺寸
  const containerRect = factoryRef.value.getBoundingClientRect()
  SVG_WIDTH = containerRect.width
  SVG_HEIGHT = containerRect.height
  
  svg = d3.select(svgRef.value)
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
  
  // 添加定义
  const defs = svg.append('defs')
  
  // 直接添加背景图片，不使用pattern
  svg.append('image')
    .attr('href', '/src/static/image/bg.jpg')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', SVG_WIDTH)
    .attr('height', SVG_HEIGHT)
    .attr('preserveAspectRatio', 'xMidYMid slice')
  
  // 网格pattern
  const gridPattern = defs.append('pattern')
    .attr('id', 'grid')
    .attr('width', SVG_WIDTH / 100)
    .attr('height', SVG_HEIGHT / 100)
    .attr('patternUnits', 'userSpaceOnUse')
  
  gridPattern.append('path')
    .attr('d', `M ${SVG_WIDTH / 100} 0 L 0 0 0 ${SVG_HEIGHT / 100}`)
    .attr('fill', 'none')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.3)
    .attr('opacity', 0.4)
  
  // 添加网格覆盖层
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'url(#grid)')
  
  // 绘制设备
  drawEquipment()
  
  // 初始化小车
  initializeCarts()
  
  // 添加网格坐标显示
  addGridCoordinates()
}

// 绘制设备 - 统一坐标转换公式
function drawEquipment() {
  const equipment = svg.selectAll('.equipment')
    .data(equipmentList.value)
    .enter()
    .append('g')
    .attr('class', 'equipment')
  
  equipment.append('rect')
    .attr('x', d => (d.gridX / (GRID_SIZE - 1)) * SVG_WIDTH - 20)
    .attr('y', d => (d.gridY / (GRID_SIZE - 1)) * SVG_HEIGHT - 15)
    .attr('width', 40)
    .attr('height', 30)
    .attr('fill', '#4caf50')
    .attr('stroke', '#2e7d32')
    .attr('stroke-width', 2)
    .attr('rx', 3)
  
  equipment.append('text')
    .attr('x', d => (d.gridX / (GRID_SIZE - 1)) * SVG_WIDTH)
    .attr('y', d => (d.gridY / (GRID_SIZE - 1)) * SVG_HEIGHT)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '8px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white')
    .text(d => d.name)
  
  // 设备产量指示器
  equipment.append('circle')
    .attr('class', 'production-indicator')
    .attr('cx', d => (d.gridX / (GRID_SIZE - 1)) * SVG_WIDTH + 15)
    .attr('cy', d => (d.gridY / (GRID_SIZE - 1)) * SVG_HEIGHT - 10)
    .attr('r', 3)
    .attr('fill', '#ff5722')
    .style('display', 'none')
}

// 初始化小车 - 增强版样式
function initializeCarts() {
  const startPositions = [
    { x: 100, y: 100 },  // 小车1起始位置
    { x: 140, y: 100 },  // 小车2起始位置
    { x: 180, y: 100 }   // 小车3起始位置
  ]
  
  // 绘制停车区域标识
  const parkingArea = svg.append('g')
    .attr('class', 'parking-area')
  
  // 停车区域背景框 - 扩大范围覆盖3辆小车
  parkingArea.append('rect')
    .attr('x', (startPositions[0].x / (GRID_SIZE - 1)) * SVG_WIDTH - 60)
    .attr('y', (startPositions[0].y / (GRID_SIZE - 1)) * SVG_HEIGHT - 50)
    .attr('width', 260)
    .attr('height', 100)
    .attr('fill', 'rgba(135, 206, 250, 0.08)')
    .attr('stroke', '#87CEEB')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '8,4')
    .attr('rx', 8)
  
  // 停车区域标题 - 改为浅蓝色
  parkingArea.append('text')
    .attr('x', (startPositions[1].x / (GRID_SIZE - 1)) * SVG_WIDTH)
    .attr('y', (startPositions[0].y / (GRID_SIZE - 1)) * SVG_HEIGHT - 55)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#4682B4')
    .text('🅿️ 停车区')
  
  // 停车位标识 - 细线条浅蓝色
  startPositions.forEach((pos, index) => {
    const parkingSpot = parkingArea.append('g')
      .attr('class', `parking-spot-${index + 1}`)
    
    // 停车位框线 - 更细的线条
    parkingSpot.append('rect')
      .attr('x', (pos.x / (GRID_SIZE - 1)) * SVG_WIDTH - 18)
      .attr('y', (pos.y / (GRID_SIZE - 1)) * SVG_HEIGHT - 12)
      .attr('width', 36)
      .attr('height', 24)
      .attr('fill', 'none')
      .attr('stroke', '#87CEEB')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,2')
      .attr('rx', 4)
    
    // 停车位编号 - 浅蓝色
    parkingSpot.append('text')
      .attr('x', (pos.x / (GRID_SIZE - 1)) * SVG_WIDTH)
      .attr('y', (pos.y / (GRID_SIZE - 1)) * SVG_HEIGHT + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('fill', '#4682B4')
      .text(`P${index + 1}`)
  })
  
  for (let i = 0; i < 3; i++) {
    const cart = new GridCart(`cart-${i + 1}`, startPositions[i].x, startPositions[i].y)
    
    const cartGroup = svg.append('g')
      .attr('class', 'grid-cart')
      .attr('id', `cart-${cart.id}`)
    
    // GPS精度圆圈（参考 FactorySimulation）
    cartGroup.append('circle')
      .attr('class', 'gps-accuracy')
      .attr('r', 15)
      .attr('fill', 'rgba(33, 150, 243, 0.1)')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.6)
    
    // 小车主体（增大尺寸，参考 FactorySimulation）
    cartGroup.append('rect')
      .attr('x', -12)
      .attr('y', -8)
      .attr('width', 24)
      .attr('height', 16)
      .attr('fill', '#2196f3')
      .attr('stroke', '#1976d2')
      .attr('stroke-width', 2)
      .attr('rx', 3)
    
    // 方向指示器（三角形箭头）
    cartGroup.append('polygon')
      .attr('class', 'direction-indicator')
      .attr('points', '0,-18 -6,-12 6,-12')
      .attr('fill', '#ff4444')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
    
    // 小车轮子（左轮）
    cartGroup.append('circle')
      .attr('cx', -8)
      .attr('cy', 6)
      .attr('r', 3)
      .attr('fill', '#333')
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
    
    // 小车轮子（右轮）
    cartGroup.append('circle')
      .attr('cx', 8)
      .attr('cy', 6)
      .attr('r', 3)
      .attr('fill', '#333')
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
    
    // 小车编号
    cartGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '8px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .text(i + 1)
    
    // 网格坐标显示
    cartGroup.append('text')
      .attr('class', 'grid-coords')
      .attr('x', 0)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '6px')
      .attr('fill', '#666')
      .text(`(${cart.gridX}, ${cart.gridY})`)
    
    // 货物指示器（增强版）
    cartGroup.append('rect')
      .attr('class', 'cargo-indicator')
      .attr('x', -6)
      .attr('y', -14)
      .attr('width', 12)
      .attr('height', 6)
      .attr('fill', '#ff9800')
      .attr('stroke', '#f57c00')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .style('display', 'none')
    
    // 状态指示灯
    cartGroup.append('circle')
      .attr('class', 'status-indicator')
      .attr('cx', 10)
      .attr('cy', -6)
      .attr('r', 2)
      .attr('fill', '#4caf50') // 绿色表示空闲
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
    
    cart.element = cartGroup
    carts.value.push(cart)
  }
}

// 添加网格坐标显示
function addGridCoordinates() {
  // 添加X轴坐标
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * SVG_WIDTH
    svg.append('text')
      .attr('x', x)
      .attr('y', SVG_HEIGHT - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text(Math.round((i / 10) * GRID_SIZE))
  }
  
  // 添加Y轴坐标
  for (let i = 0; i <= 10; i++) {
    const y = (i / 10) * SVG_HEIGHT
    svg.append('text')
      .attr('x', 5)
      .attr('y', y)
      .attr('text-anchor', 'start')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text(Math.round((i / 10) * GRID_SIZE))
  }
}

// 开始生产 - 添加自动运货功能
function startProduction() {
  if (isProducing.value) return
  
  isProducing.value = true
  productionStartTime.value = Date.now()
  
  equipmentList.value.forEach(equipment => {
    equipment.status = 'running'
    equipment.currentProduction = Math.floor(Math.random() * equipment.maxProduction * 0.8) + equipment.maxProduction * 0.2
  })
  
  // 启动累计产量计算和时间更新
  productionInterval = setInterval(() => {
    // 更新当前时间以触发 productionDuration 重新计算
    currentTime.value = Date.now()
    
    equipmentList.value.forEach(equipment => {
      if (equipment.status === 'running') {
        // 每秒累加产量（当前产量/60，因为当前产量是每分钟的）
        const incrementPerSecond = equipment.currentProduction / 60
        const previousTotal = equipment.totalProduced
        equipment.totalProduced += incrementPerSecond
        
        // 检查是否达到100的倍数，触发自动运货
        const previousMilestone = Math.floor(previousTotal / 100)
        const currentMilestone = Math.floor(equipment.totalProduced / 100)
        
        if (currentMilestone > previousMilestone) {
          // 产量达到100的倍数，触发自动运货
          triggerAutoDelivery(equipment, currentMilestone * 100)
        }
      }
    })
    
    // 计算工厂总产量
    totalFactoryProduced.value = equipmentList.value.reduce((sum, eq) => sum + eq.totalProduced, 0)
    
    currentProduction.value++
    
    // 随机生成送货任务（保留原有逻辑）
    if (Math.random() < 0.3) {
      generateDeliveryTask()
    }
    
    // 更新设备指示器
    updateEquipmentIndicators()
  }, 1000)
}

// 停止生产
function stopProduction() {
  if (!isProducing.value) return
  
  isProducing.value = false
  
  equipmentList.value.forEach(equipment => {
    equipment.status = 'idle'
    equipment.currentProduction = 0
  })
  
  if (productionInterval) {
    clearInterval(productionInterval)
    productionInterval = null
  }
  // 停止时间更新，但保持 productionStartTime 以显示总时长
}

// 生成送货任务
function generateDeliveryTask() {
  const fromEquipment = equipmentList.value[Math.floor(Math.random() * equipmentList.value.length)]
  const toEquipment = equipmentList.value[Math.floor(Math.random() * equipmentList.value.length)]
  
  if (fromEquipment.id !== toEquipment.id) {
    const delivery: Delivery = {
      id: deliveryIdCounter++,
      type: '产品',
      fromGridX: fromEquipment.gridX,
      fromGridY: fromEquipment.gridY,
      toGridX: toEquipment.gridX,
      toGridY: toEquipment.gridY,
      status: 'pending'
    }
    
    pendingDeliveries.value.push(delivery)
  }
}

// 新增：触发自动运货功能 - 修改目标选择逻辑
function triggerAutoDelivery(equipment: any, totalProduced: number) {
  console.log(`🚚 设备 ${equipment.name} 产量达到 ${totalProduced}，触发自动运货`)
  
  // 根据设备类型选择合适的目标
  let targetEquipment
  
  if (equipment.name.includes('生产线')) {
    // 生产线的货物优先运到质检台，其次是包装机
    const qualityCheck = equipmentList.value.find(eq => eq.name === '质检台')
    const packagingMachine = equipmentList.value.find(eq => eq.name === '包装机')
    
    targetEquipment = qualityCheck || packagingMachine
  } else if (equipment.name === '质检台') {
    // 质检台的货物运到包装机
    targetEquipment = equipmentList.value.find(eq => eq.name === '包装机')
  } else {
    // 其他设备随机选择（排除自己）
    const availableTargets = equipmentList.value.filter(eq => eq.id !== equipment.id)
    targetEquipment = availableTargets[Math.floor(Math.random() * availableTargets.length)]
  }
  
  if (!targetEquipment) {
    console.log('⚠️ 未找到合适的目标设备')
    return
  }
  
  // 创建自动运货任务
  const autoDelivery: Delivery = {
    id: deliveryIdCounter++,
    type: `自动运货-${Math.floor(totalProduced)}件`,
    fromGridX: equipment.gridX,
    fromGridY: equipment.gridY,
    toGridX: targetEquipment.gridX,
    toGridY: targetEquipment.gridY,
    status: 'pending'
  }
  
  pendingDeliveries.value.push(autoDelivery)
  
  console.log(`📦 ${equipment.name} → ${targetEquipment.name}：自动运货任务已创建`)
  
  // 立即尝试派遣小车
  setTimeout(() => {
    autoDeployCart(autoDelivery)
  }, 500)
}

// 新增：自动派遣小车函数
function autoDeployCart(delivery: Delivery) {
  const availableCart = carts.value.find(cart => cart.status === 'idle')
  
  if (availableCart) {
    availableCart.status = 'moving'
    availableCart.cargo = { type: delivery.type }
    delivery.status = 'assigned'
    delivery.assignedCart = availableCart.id
    
    // 设置路径：先到取货点，再到目的地
    const path = [
      { x: delivery.fromGridX, y: delivery.fromGridY },
      { x: delivery.toGridX, y: delivery.toGridY }
    ]
    
    availableCart.setGridPath(path)
    
    console.log(`🚛 小车 ${availableCart.id} 已自动派遣执行运货任务`)
  } else {
    console.log('⚠️ 暂无空闲小车，自动运货任务已排队等待')
    // 可以考虑添加队列优先级，让自动运货任务优先执行
  }
}

// 修改派遣小车函数，优先处理自动运货任务
function deployCart() {
  const availableCart = carts.value.find(cart => cart.status === 'idle')
  
  // 优先处理自动运货任务（包含"自动运货"关键字的任务）
  let pendingDelivery = pendingDeliveries.value.find(delivery => 
    delivery.status === 'pending' && delivery.type.includes('自动运货')
  )
  
  // 如果没有自动运货任务，处理普通任务
  if (!pendingDelivery) {
    pendingDelivery = pendingDeliveries.value.find(delivery => delivery.status === 'pending')
  }
  
  if (availableCart && pendingDelivery) {
    availableCart.status = 'moving'
    availableCart.cargo = { type: pendingDelivery.type }
    pendingDelivery.status = 'assigned'
    pendingDelivery.assignedCart = availableCart.id
    
    // 设置路径：先到取货点，再到目的地
    const path = [
      { x: pendingDelivery.fromGridX, y: pendingDelivery.fromGridY },
      { x: pendingDelivery.toGridX, y: pendingDelivery.toGridY }
    ]
    
    availableCart.setGridPath(path)
  }
}

// 召回所有小车
function recallAllCarts() {
  const startPositions = [
    { x: 100, y: 100 },  // 小车1起始位置
    { x: 140, y: 100 },  // 小车2起始位置
    { x: 180, y: 100 }   // 小车3起始位置
  ]
  
  carts.value.forEach((cart, index) => {
    cart.status = 'returning'
    cart.cargo = null
    // 返回对应的起始位置
    cart.setGridPath([startPositions[index]])
  })
}

// 发送网格指令
function sendGridCommand() {
  const cart = carts.value.find(c => c.id === selectedCartId.value)
  if (cart && targetGridX.value !== undefined && targetGridY.value !== undefined) {
    cart.status = 'moving'
    cart.setGridPath([{ x: targetGridX.value, y: targetGridY.value }])
  }
}

// 动画循环
function animationLoop() {
  // 移除生产状态检查，让小车始终可以移动
  // 更新所有小车位置
  carts.value.forEach(cart => {
    updateCartPosition(cart)
    updateCartVisual(cart)
  })
  
  // 继续动画
  animationFrame = requestAnimationFrame(animationLoop)
}

// 更新小车位置
function updateCartPosition(cart: GridCart) {
  if (cart.status === 'moving' && cart.path.length > 0) {
    const stillMoving = cart.moveAlongPath()
    if (!stillMoving) {
      cart.status = 'idle'
      // 处理到达事件
      handleCartArrival(cart)
    }
  }
}

// 更新小车视觉效果 - 增强版
function updateCartVisual(cart: GridCart) {
  if (cart.element) {
    const svgPos = cart.getSVGPosition()
    cart.element.attr('transform', `translate(${svgPos.x}, ${svgPos.y})`)
    
    // 更新网格坐标显示
    const coordsText = cart.element.select('.grid-coords')
    coordsText.text(`(${Math.round(cart.gridX)}, ${Math.round(cart.gridY)})`)
    
    // 更新货物指示器
    const cargoIndicator = cart.element.select('.cargo-indicator')
    cargoIndicator.style('display', cart.cargo ? 'block' : 'none')
    
    // 根据状态改变小车颜色和状态指示灯
    const cartBody = cart.element.select('rect')
    const statusIndicator = cart.element.select('.status-indicator')
    const gpsAccuracy = cart.element.select('.gps-accuracy')
    
    const statusColors = {
      idle: { body: '#2196f3', indicator: '#4caf50', gps: 'rgba(33, 150, 243, 0.1)' },
      moving: { body: '#4caf50', indicator: '#ff9800', gps: 'rgba(76, 175, 80, 0.2)' },
      loading: { body: '#ff9800', indicator: '#f44336', gps: 'rgba(255, 152, 0, 0.2)' },
      returning: { body: '#9c27b0', indicator: '#9c27b0', gps: 'rgba(156, 39, 176, 0.2)' }
    }
    
    const colors = statusColors[cart.status] || statusColors.idle
    cartBody.attr('fill', colors.body)
    statusIndicator.attr('fill', colors.indicator)
    gpsAccuracy.attr('fill', colors.gps)
    
    // 移动时的GPS精度圆圈动画
    if (cart.status === 'moving') {
      gpsAccuracy
        .transition()
        .duration(1000)
        .attr('r', 20)
        .transition()
        .duration(1000)
        .attr('r', 15)
    }
  }
}

// 修改处理小车到达函数，添加自动运货完成的日志
function handleCartArrival(cart: GridCart) {
  // 找到对应的送货任务
  const delivery = pendingDeliveries.value.find(d => d.assignedCart === cart.id)
  if (delivery) {
    delivery.status = 'completed'
    
    // 如果是自动运货任务，记录完成日志
    if (delivery.type.includes('自动运货')) {
      console.log(`✅ 自动运货任务完成: ${delivery.type}`)
    }
    
    cart.cargo = null
    // 从待处理列表中移除
    const index = pendingDeliveries.value.indexOf(delivery)
    if (index > -1) {
      pendingDeliveries.value.splice(index, 1)
    }
  }
}

// 更新设备指示器
function updateEquipmentIndicators() {
  svg.selectAll('.production-indicator')
    .style('display', d => d.status === 'running' ? 'block' : 'none')
    .transition()
    .duration(500)
    .attr('r', d => d.status === 'running' ? 5 : 3)
}

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap = {
    idle: '空闲',
    moving: '移动中',
    loading: '装载中',
    returning: '返回中'
  }
  return statusMap[status] || status
}

// 组件挂载
onMounted(() => {
  initializeFactory()
  // 启动动画循环，不依赖生产状态
  animationLoop()
})

// 组件卸载
onUnmounted(() => {
  if (productionInterval) {
    clearInterval(productionInterval)
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

<style scoped>
.grid-factory-demo {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.control-panel {
  width: 320px;
  min-width: 320px;
  background: white;
  border-right: 1px solid #ddd;
  padding: 16px;
  overflow-y: auto;
  box-shadow: 2px 0 4px rgba(0,0,0,0.1);
}

.control-section {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.control-section h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
}

.btn-primary, .btn-danger, .btn-info, .btn-warning, .btn-grid {
  padding: 8px 16px;
  margin: 4px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.btn-primary { background: #2196f3; color: white; }
.btn-danger { background: #f44336; color: white; }
.btn-info { background: #00bcd4; color: white; }
.btn-warning { background: #ff9800; color: white; }
.btn-grid { background: #4caf50; color: white; }

.btn-primary:disabled, .btn-danger:disabled, .btn-grid:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.production-rate {
  margin-top: 12px;
}

.rate-slider {
  width: 100%;
  margin-top: 8px;
}

.cart-controls {
  margin-top: 12px;
}

.cart-selector {
  width: 100%;
  padding: 6px;
  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.grid-inputs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.grid-input {
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.status-section {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
}

.status-section h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
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
  padding: 6px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
}

.label {
  font-weight: bold;
  color: #666;
}

.value {
  color: #333;
  font-weight: bold;
}

.status.running {
  color: #4caf50;
  font-weight: bold;
}

.status.stopped {
  color: #f44336;
  font-weight: bold;
}

.cart-status-grid {
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

.cart-status-text.idle {
  color: #2196f3;
}

.cart-status-text.moving {
  color: #4caf50;
}

.cart-status-text.loading {
  color: #ff9800;
}

.cart-status-text.returning {
  color: #9c27b0;
}

.cart-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.grid-coords {
  font-family: monospace;
  color: #2196f3;
  font-weight: bold;
}

.cart-details {
  display: flex;
  gap: 10px;
  color: #666;
}

.factory-layout {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: stretch;
  min-height: 100vh; /* 确保最小高度 */
}

.factory-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.equipment-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 250px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.equipment-panel h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
}

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.factory-summary {
  margin-bottom: 16px;
  padding: 10px;
  background: linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%);
  border: 2px solid #ff9800;
  border-radius: 8px;
}

.factory-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.factory-label {
  font-weight: bold;
  color: #e65100;
  font-size: 13px;
}

.factory-value {
  color: #ff5722;
  font-weight: bold;
  font-size: 16px;
}

.factory-duration {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
}

.duration-label {
  color: #666;
}

.duration-value {
  color: #333;
  font-weight: bold;
}

.btn-reset {
  width: 100%;
  padding: 4px 8px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
}

.btn-reset:hover:not(:disabled) {
  background: #f57c00;
}

.btn-reset:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.workshop-summary {
  margin-bottom: 16px;
}

.workshop-summary h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 12px;
  font-weight: bold;
}

.workshop-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.workshop-item {
  padding: 8px;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border: 1px solid #2196f3;
  border-radius: 6px;
  font-size: 11px;
}

.workshop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.workshop-name {
  font-weight: bold;
  color: #1976d2;
}

.workshop-total {
  color: #2196f3;
  font-weight: bold;
  font-size: 12px;
}

.workshop-details {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 10px;
}

.workshop-current {
  color: #2196f3;
  font-weight: bold;
}

.equipment-details h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 12px;
  font-weight: bold;
}

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.equipment-item {
  padding: 6px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 10px;
  background: white;
}

.equipment-item.running {
  background: #e8f5e8;
  border-color: #4caf50;
}

.equipment-item.idle {
  background: #f5f5f5;
  border-color: #ccc;
}

.equipment-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.equipment-name {
  font-weight: bold;
}

.equipment-total {
  color: #2196f3;
  font-weight: bold;
}

.equipment-meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 9px;
}

.equipment-current {
  color: #4caf50;
}

.equipment-workshop {
  color: #9c27b0;
  font-weight: bold;
}

.equipment-status {
  color: #666;
}

/* SVG 样式 */
:deep(.grid-cart) {
  cursor: pointer;
  transition: all 0.3s;
}

:deep(.grid-cart:hover) {
  filter: drop-shadow(0 0 5px rgba(33, 150, 243, 0.8));
}

:deep(.equipment) {
  cursor: pointer;
  transition: all 0.3s;
}

:deep(.equipment:hover) {
  opacity: 0.8;
}

:deep(.production-indicator) {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}
</style>