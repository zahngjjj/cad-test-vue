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
    .text(`(${cart.gridX}, ${cart.gridY})`)
  
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
</style>