<template>
  <div class="factory-layout" ref="factoryRef">
    <svg ref="svgRef" class="factory-svg"></svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import type { Cart, Equipment, Delivery } from '@/types/factory'

// Props
const props = defineProps<{
  carts: Cart[]
  equipmentList: Equipment[]
  pendingDeliveries: Delivery[]
}>()

// Emits
const emit = defineEmits<{
  'cart-clicked': [cart: Cart]
}>()

// 组件引用
const svgRef = ref<SVGElement>()
const factoryRef = ref<HTMLElement>()

// 网格配置
const GRID_SIZE = 1000
let SVG_WIDTH = 1000
let SVG_HEIGHT = 600
let svg: any

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
  
  // 背景图片
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

// 绘制设备
function drawEquipment() {
  const equipment = svg.selectAll('.equipment')
    .data(props.equipmentList)
    .enter()
    .append('g')
    .attr('class', 'equipment')
  
  equipment.append('rect')
    .attr('x', d => (d.gridX / (GRID_SIZE - 1)) * SVG_WIDTH - 24)
    .attr('y', d => (d.gridY / (GRID_SIZE - 1)) * SVG_HEIGHT - 15)
    .attr('width', 48)
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
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white')
    .text(d => d.name)
}

// 初始化小车
function initializeCarts() {
  const startPositions = [
    { x: 100, y: 100 },
    { x: 140, y: 100 },
    { x: 180, y: 100 }
  ]
  
  // 绘制停车区域
  drawParkingArea(startPositions)
  
  // 创建小车
  props.carts.forEach((cart, index) => {
    createCartElement(cart, startPositions[index])
  })
}

// 绘制停车区域
function drawParkingArea(positions: {x: number, y: number}[]) {
  const parkingArea = svg.append('g')
    .attr('class', 'parking-area')
  
  // 停车区域背景框
  parkingArea.append('rect')
    .attr('x', (positions[0].x / (GRID_SIZE - 1)) * SVG_WIDTH - 60)
    .attr('y', (positions[0].y / (GRID_SIZE - 1)) * SVG_HEIGHT - 50)
    .attr('width', 260)
    .attr('height', 100)
    .attr('fill', 'rgba(135, 206, 250, 0.08)')
    .attr('stroke', '#87CEEB')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '8,4')
    .attr('rx', 8)
  
  // 停车区域标题
  parkingArea.append('text')
    .attr('x', (positions[1].x / (GRID_SIZE - 1)) * SVG_WIDTH)
    .attr('y', (positions[0].y / (GRID_SIZE - 1)) * SVG_HEIGHT - 55)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#4682B4')
    .text('🅿️ 停车区')
  
  // 停车位标识
  positions.forEach((pos, index) => {
    const parkingSpot = parkingArea.append('g')
      .attr('class', `parking-spot-${index + 1}`)
    
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
    
    parkingSpot.append('text')
      .attr('x', (pos.x / (GRID_SIZE - 1)) * SVG_WIDTH)
      .attr('y', (pos.y / (GRID_SIZE - 1)) * SVG_HEIGHT + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('fill', '#4682B4')
      .text(`P${index + 1}`)
  })
}

// 创建小车元素
function createCartElement(cart: Cart, position: {x: number, y: number}) {
  const cartGroup = svg.append('g')
    .attr('class', 'grid-cart')
    .attr('id', `cart-${cart.id}`)
    .style('cursor', 'pointer')
    .on('click', function(event) {
      event.stopPropagation()
      showCartPhoto(cart, d3.pointer(event, svg.node()))
    })
  
  // GPS精度圆圈
  cartGroup.append('circle')
    .attr('class', 'gps-accuracy')
    .attr('r', 15)
    .attr('fill', 'rgba(33, 150, 243, 0.1)')
    .attr('stroke', '#2196f3')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0.6)
  
  // 小车主体
  cartGroup.append('rect')
    .attr('x', -12)
    .attr('y', -8)
    .attr('width', 24)
    .attr('height', 16)
    .attr('fill', '#2196f3')
    .attr('stroke', '#1976d2')
    .attr('stroke-width', 2)
    .attr('rx', 3)
  
  // 方向指示器
  cartGroup.append('polygon')
    .attr('class', 'direction-indicator')
    .attr('points', '0,-18 -6,-12 6,-12')
    .attr('fill', '#ff4444')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1)
  
  // 小车轮子
  cartGroup.append('circle')
    .attr('cx', -8)
    .attr('cy', 6)
    .attr('r', 3)
    .attr('fill', '#333')
    .attr('stroke', '#666')
    .attr('stroke-width', 1)
  
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
    .text(cart.id.split('-')[1])
  
  // 网格坐标显示
  cartGroup.append('text')
    .attr('class', 'grid-coords')
    .attr('x', 0)
    .attr('y', -25)
    .attr('text-anchor', 'middle')
    .attr('font-size', '6px')
    .attr('fill', '#666')
    .text(`(${Math.round(cart.gridX)}, ${Math.round(cart.gridY)})`)
  
  // 货物指示器
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
  
  // 设置初始位置
  const svgPos = {
    x: (position.x / (GRID_SIZE - 1)) * SVG_WIDTH,
    y: (position.y / (GRID_SIZE - 1)) * SVG_HEIGHT
  }
  
  cartGroup.attr('transform', `translate(${svgPos.x}, ${svgPos.y})`)
}

// 显示小车照片详情
function showCartPhoto(cart: Cart, clickPosition: [number, number]) {
  // 移除已存在的照片详情
  svg.select('.cart-photo-detail').remove()
  
  // 弹框尺寸定义
  const panelWidth = 200
  const panelHeight = 160
  const panelHalfWidth = panelWidth / 2
  const panelHalfHeight = panelHeight / 2
  
  // 获取SVG容器尺寸
  const svgElement = svg.node() as SVGSVGElement
  const svgRect = svgElement.getBoundingClientRect()
  const svgWidth = svgRect.width
  const svgHeight = svgRect.height
  
  // 计算调整后的位置
  let adjustedX = clickPosition[0]
  let adjustedY = clickPosition[1]
  
  // 边界检测和位置调整
  // 左边界检测
  if (adjustedX - panelHalfWidth < 0) {
    adjustedX = panelHalfWidth + 10 // 留10px边距
  }
  
  // 右边界检测
  if (adjustedX + panelHalfWidth > svgWidth) {
    adjustedX = svgWidth - panelHalfWidth - 10 // 留10px边距
  }
  
  // 上边界检测（弹框在点击位置上方显示）
  if (adjustedY - panelHeight < 0) {
    adjustedY = panelHeight + 10 // 留10px边距
  }
  
  // 下边界检测
  if (adjustedY + 40 > svgHeight) { // 40是弹框底部到中心的距离
    adjustedY = svgHeight - 40 - 10 // 留10px边距
  }
  
  // 创建照片详情组
  const photoDetail = svg.append('g')
    .attr('class', 'cart-photo-detail')
    .attr('transform', `translate(${adjustedX}, ${adjustedY})`)
  
  // 背景面板
  const panel = photoDetail.append('g')
    .attr('class', 'photo-panel')
  
  // 面板背景
  panel.append('rect')
    .attr('x', -panelHalfWidth)
    .attr('y', -120)
    .attr('width', panelWidth)
    .attr('height', panelHeight)
    .attr('fill', 'rgba(255, 255, 255, 0.95)')
    .attr('stroke', '#2196f3')
    .attr('stroke-width', 2)
    .attr('rx', 8)
    .attr('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))')
  
  // 小车照片
  if (cart.photo) {
    panel.append('image')
      .attr('x', -80)
      .attr('y', -100)
      .attr('width', 160)
      .attr('height', 80)
      .attr('href', cart.photo)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .style('border-radius', '4px')
  } else {
    // 默认照片占位符
    panel.append('rect')
      .attr('x', -80)
      .attr('y', -100)
      .attr('width', 160)
      .attr('height', 80)
      .attr('fill', '#f0f0f0')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1)
      .attr('rx', 4)
    
    panel.append('text')
      .attr('x', 0)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#999')
      .text('📷 暂无照片')
  }
  
  // 小车信息
  panel.append('text')
    .attr('x', 0)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .text(`小车 ${cart.id}`)
  
  panel.append('text')
    .attr('x', 0)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .text(`位置: (${Math.round(cart.gridX)}, ${Math.round(cart.gridY)})`)
  
  panel.append('text')
    .attr('x', 0)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .text(`状态: ${getStatusText(cart.status)}`)
  
  // 关闭按钮
  const closeButton = panel.append('g')
    .attr('class', 'close-button')
    .style('cursor', 'pointer')
    .on('click', function(event) {
      event.stopPropagation()
      hideCartPhoto()
    })
  
  closeButton.append('circle')
    .attr('cx', 85)
    .attr('cy', -105)
    .attr('r', 12)
    .attr('fill', '#ff4444')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
  
  closeButton.append('text')
    .attr('x', 85)
    .attr('y', -105)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white')
    .text('×')
  
  // 3秒后自动关闭
  setTimeout(() => {
    hideCartPhoto()
  }, 3000)
}

// 隐藏小车照片详情
function hideCartPhoto() {
  svg.select('.cart-photo-detail')
    .transition()
    .duration(300)
    .style('opacity', 0)
    .remove()
}

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'idle': '空闲',
    'moving': '移动中',
    'loading': '装载中',
    'delivering': '配送中',
    'returning': '返回中'
  }
  return statusMap[status] || status
}

// 点击SVG空白区域关闭照片详情
function initializeSVG() {
  // ... existing code ...
  
  // 添加点击事件监听
  svg.on('click', function(event) {
    // 如果点击的不是小车，则关闭照片详情
    if (!event.target.closest('.grid-cart')) {
      hideCartPhoto()
    }
  })
}

// 添加网格坐标显示
function addGridCoordinates() {
  // 实现网格坐标显示逻辑
}

// 暴露方法给父组件
defineExpose({
  initializeFactory,
  svg: () => svg
})

// 生命周期
onMounted(() => {
  initializeFactory()
})

// 监听数据变化
watch(() => props.carts, () => {
  // 更新小车显示
}, { deep: true })

watch(() => props.equipmentList, () => {
  // 更新设备显示
}, { deep: true })
</script>

<style scoped>
.factory-layout {
  flex: 1;
  height: 100vh;
  background: #000;
  position: relative;
  overflow: hidden;
}

.factory-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* SVG内部样式通过D3设置 */
</style>