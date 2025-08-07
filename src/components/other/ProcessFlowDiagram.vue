<template>
  <div class="process-flow-container">
    <!-- 动画控制面板 -->
    <div class="animation-controls">
      <div class="control-group">
        <button @click="startFlowAnimation" :disabled="animationState.isRunning" class="btn-start">
          开始流动动画
        </button>
        <button @click="stopFlowAnimation" :disabled="!animationState.isRunning" class="btn-stop">
          停止动画
        </button>
        <button @click="resetAnimation" class="btn-reset">
          重置位置
        </button>
      </div>
      <div class="status-display">
        <span class="status-text">状态: {{ animationState.isRunning ? '运行中' : '已停止' }}</span>
        <span class="progress-text" v-if="animationState.isRunning">
          进度: {{ animationState.currentIndex + 1 }}/{{ flowPath.length }}
        </span>
      </div>
    </div>

    <!-- 背景层 -->
    <div 
      class="custom-background"
      :style="{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        backgroundImage: `url(${bgImage})`,
        transformOrigin: '0 0'
      }"
    ></div>
    
    <!-- D3 动画覆盖层 -->
    <svg 
      ref="animationSvg" 
      class="animation-overlay"
      :style="{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: '0 0'
      }"
    ></svg>
    
    <VueFlow
      v-model="elements"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="4"
      @connect="onConnect"
      @node-click="onNodeClick"
      @viewport-change="onViewportChange"
      ref="vueFlowRef"
    >
      <Background pattern="none" />
      <Controls />
      
      <!-- 自定义节点模板 -->
      <template #node-tank="{ data }">
        <div class="tank-node">
          <div class="tank-body">
            <div class="tank-level" :style="{ height: data.level + '%' }"></div>
          </div>
          <div class="tank-label">{{ data.label }}</div>
        </div>
      </template>
      
      <template #node-valve="{ data }">
        <div class="valve-node" :class="{ open: data.isOpen }">
          <div class="valve-symbol"></div>
          <div class="valve-label">{{ data.label }}</div>
        </div>
      </template>
      
      <template #node-pump="{ data }">
        <div class="pump-node" :class="{ running: data.isRunning }">
          <div class="pump-symbol"></div>
          <div class="pump-label">{{ data.label }}</div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import * as d3 from 'd3'

// 修改图片导入方式
import bgImageUrl from '../static/image/bg.png'

// 导入样式文件
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

// 视口状态
const viewport = ref({ x: 0, y: 0, zoom: 1 })
const bgImage = ref(bgImageUrl)
const vueFlowRef = ref(null)
const animationSvg = ref<SVGElement>()

// 动画状态
const animationState = ref({
  isRunning: false,
  currentIndex: 0,
  isPaused: false
})

// 动画配置
const animationConfig = {
  moveDuration: 1000,    // 每段运动时间
  pauseDuration: 3000,   // 停顿时间
  autoRestart: false     // 关闭自动重启
}

// 流动路径定义
const flowPath = ref([
  { from: '1', to: '2' },
  { from: '2', to: '3' },
  { from: '3', to: '4' }
])

// D3 动画变量
let particle: any = null
let dashedLines: any = null
let svg: any = null

// 视口变化处理
function onViewportChange(newViewport: any) {
  viewport.value = newViewport
}

const elements = ref([
  // 节点定义
  {
    id: '1',
    type: 'tank',
    position: { x: 100, y: 100 },
    data: { 
      label: '原料罐 A',
      level: 75,
      capacity: 1000,
      temperature: 25
    }
  },
  {
    id: '2',
    type: 'valve',
    position: { x: 300, y: 150 },
    data: { 
      label: '进料阀',
      isOpen: true,
      flowRate: 50
    }
  },
  {
    id: '3',
    type: 'pump',
    position: { x: 500, y: 100 },
    data: { 
      label: '循环泵',
      isRunning: true,
      speed: 1200
    }
  },
  {
    id: '4',
    type: 'tank',
    position: { x: 700, y: 100 },
    data: { 
      label: '反应器',
      level: 60,
      capacity: 2000,
      temperature: 85
    }
  },
  
  // 连接线定义 - 使用虚线样式
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: false,  // 关闭 VueFlow 原生动画，使用 D3 动画
    style: { 
      stroke: '#0066cc', 
      strokeWidth: 4,
      strokeDasharray: '10,5'
    }
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    animated: false,
    style: { 
      stroke: '#0066cc', 
      strokeWidth: 4,
      strokeDasharray: '10,5'
    }
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'smoothstep',
    animated: false,
    style: { 
      stroke: '#0066cc', 
      strokeWidth: 4,
      strokeDasharray: '10,5'
    }
  }
])

function onConnect(connection: any) {
  console.log('连接创建:', connection)
  elements.value.push(connection)
}

function onNodeClick(event: any) {
  console.log('节点点击:', event.node)
}

// 获取节点中心位置
function getNodeCenter(nodeId: string) {
  const node = elements.value.find(el => el.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  
  // 根据节点类型调整中心点偏移
  const offsetMap = {
    tank: { x: 40, y: 50 },
    valve: { x: 30, y: 30 },
    pump: { x: 30, y: 30 }
  }
  
  const offset = offsetMap[node.type as keyof typeof offsetMap] || { x: 30, y: 30 }
  
  return {
    x: node.position.x + offset.x,
    y: node.position.y + offset.y
  }
}

// 初始化 D3 动画层
function initD3AnimationLayer() {
  if (!animationSvg.value) return
  
  svg = d3.select(animationSvg.value)
    .attr('width', '100%')
    .attr('height', '100%')
    .style('position', 'absolute')
    .style('top', '0')
    .style('left', '0')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
  
  // 创建虚线连接线（用于流动动画）
  const links = flowPath.value.map(path => {
    const sourcePos = getNodeCenter(path.from)
    const targetPos = getNodeCenter(path.to)
    return {
      source: sourcePos,
      target: targetPos,
      id: `${path.from}-${path.to}`
    }
  })
  
  // 绘制虚线
  dashedLines = svg.selectAll('.d3-flow-line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'd3-flow-line')
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y)
    .attr('stroke', '#ff6b35')
    .attr('stroke-width', 3)
    .attr('stroke-dasharray', '8,4')
    .attr('stroke-dashoffset', 0)
    .attr('opacity', 0.8)
  
  // 创建粒子
  const startPos = getNodeCenter('1')
  particle = svg.append('circle')
    .attr('class', 'd3-particle')
    .attr('r', 6)
    .attr('fill', '#ff4444')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2)
    .attr('cx', startPos.x)
    .attr('cy', startPos.y)
    .style('filter', 'drop-shadow(0 0 6px rgba(255, 68, 68, 0.8))')
    .attr('opacity', 1)
  
  console.log('D3 动画层初始化完成')
}

// 虚线流动动画
function animateDashedFlow() {
  if (!dashedLines) return
  
  function flowAnimation() {
    dashedLines
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', -12)
      .on('end', function() {
        d3.select(this).attr('stroke-dashoffset', 0)
        if (animationState.value.isRunning) {
          flowAnimation()
        }
      })
  }
  
  flowAnimation()
}

// 粒子动画
function animateParticle() {
  if (!particle) return
  
  animationState.value.isRunning = true
  animationState.value.currentIndex = 0
  
  // 重置粒子位置
  const startPos = getNodeCenter('1')
  particle
    .attr('cx', startPos.x)
    .attr('cy', startPos.y)
    .attr('opacity', 1)
    .attr('r', 6)
  
  function moveToNextSegment() {
    if (animationState.value.currentIndex < flowPath.value.length && animationState.value.isRunning) {
      const currentPath = flowPath.value[animationState.value.currentIndex]
      const targetPos = getNodeCenter(currentPath.to)
      
      console.log(`粒子移动到第 ${animationState.value.currentIndex + 1} 段路径`)
      
      particle
        .transition()
        .duration(animationConfig.moveDuration)
        .ease(d3.easeLinear)
        .attr('cx', targetPos.x)
        .attr('cy', targetPos.y)
        .on('end', () => {
          animationState.value.currentIndex++
          
          if (animationState.value.currentIndex < flowPath.value.length) {
            // 停顿并闪烁
            console.log(`停顿 ${animationConfig.pauseDuration}ms`)
            animationState.value.isPaused = true
            
            const blinkInterval = setInterval(() => {
              if (!animationState.value.isPaused) {
                clearInterval(blinkInterval)
                return
              }
              particle
                .transition()
                .duration(200)
                .attr('opacity', 0.3)
                .transition()
                .duration(200)
                .attr('opacity', 1)
            }, 400)
            
            setTimeout(() => {
              animationState.value.isPaused = false
              clearInterval(blinkInterval)
              particle.attr('opacity', 1)
              moveToNextSegment()
            }, animationConfig.pauseDuration)
          } else {
            // 到达终点
            console.log('粒子到达终点')
            animationState.value.isRunning = false
            
            // 终点闪烁效果
            particle
              .transition()
              .duration(300)
              .attr('r', 10)
              .transition()
              .duration(300)
              .attr('r', 6)
          }
        })
    }
  }
  
  moveToNextSegment()
}

// 控制函数
function startFlowAnimation() {
  if (animationState.value.isRunning) return
  
  console.log('开始流动动画')
  animateDashedFlow()
  animateParticle()
}

function stopFlowAnimation() {
  console.log('停止流动动画')
  animationState.value.isRunning = false
  animationState.value.isPaused = false
  
  if (particle) {
    particle.interrupt()
  }
  if (dashedLines) {
    dashedLines.interrupt()
  }
}

function resetAnimation() {
  stopFlowAnimation()
  
  if (particle) {
    const startPos = getNodeCenter('1')
    particle
      .attr('cx', startPos.x)
      .attr('cy', startPos.y)
      .attr('opacity', 1)
      .attr('r', 6)
  }
  
  if (dashedLines) {
    dashedLines.attr('stroke-dashoffset', 0)
  }
  
  animationState.value.currentIndex = 0
  console.log('重置动画状态')
}

// 监听视口变化，更新动画层位置
watch(viewport, () => {
  if (svg) {
    // 重新计算节点位置并更新动画
    nextTick(() => {
      const links = flowPath.value.map(path => {
        const sourcePos = getNodeCenter(path.from)
        const targetPos = getNodeCenter(path.to)
        return {
          source: sourcePos,
          target: targetPos,
          id: `${path.from}-${path.to}`
        }
      })
      
      if (dashedLines) {
        dashedLines
          .data(links)
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)
      }
    })
  }
}, { deep: true })

// 模拟实时数据更新
onMounted(() => {
  // 初始化 D3 动画层
  nextTick(() => {
    initD3AnimationLayer()
  })
  
  // 液位更新
  setInterval(() => {
    const tankNodes = elements.value.filter(el => el.type === 'tank')
    tankNodes.forEach(tank => {
      if (tank.data) {
        tank.data.level = Math.max(0, Math.min(100, 
          tank.data.level + (Math.random() - 0.5) * 5
        ))
      }
    })
  }, 2000)
})
</script>

<style scoped>
.process-flow-container {
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

/* 动画控制面板样式 */
.animation-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1001;
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  min-width: 300px;
}

.control-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.control-group button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 80px;
}

.btn-start {
  background: #4CAF50;
  color: white;
}

.btn-start:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
}

.btn-stop {
  background: #f44336;
  color: white;
}

.btn-stop:hover:not(:disabled) {
  background: #da190b;
  transform: translateY(-1px);
}

.btn-reset {
  background: #2196F3;
  color: white;
}

.btn-reset:hover {
  background: #1976D2;
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.status-display {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
  align-items: center;
}

.status-text {
  font-weight: 500;
}

.progress-text {
  color: #4CAF50;
  font-weight: 500;
}

.custom-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-size: 100% 100%;
  background-position: 0 0;
  background-repeat: repeat;
  opacity: 1;
  z-index: 1;
  pointer-events: none;
}

.animation-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

/* 确保 Vue Flow 在背景之上 */
:deep(.vue-flow) {
  position: relative;
  z-index: 2;
}

:deep(.vue-flow__renderer) {
  position: relative;
  z-index: 2;
}

/* 让 Vue Flow 背景透明 */
:deep(.vue-flow__background) {
  background: transparent !important;
}

/* Vue Flow 基础样式补充 */
:deep(.vue-flow__controls) {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 4;
}

:deep(.vue-flow__controls button) {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  margin: 2px;
  cursor: pointer;
}

:deep(.vue-flow__controls button:hover) {
  background: #f0f0f0;
}

/* 增强虚线流动效果 */
:deep(.vue-flow__edge-path) {
  transition: stroke-width 0.3s ease;
}

:deep(.vue-flow__edge-path:hover) {
  stroke-width: 6px !important;
}

/* 罐体样式 */
.tank-node {
  width: 80px;
  height: 100px;
  position: relative;
}

.tank-body {
  width: 60px;
  height: 80px;
  border: 3px solid #333;
  border-radius: 0 0 10px 10px;
  background: #e0e0e0;
  position: relative;
  overflow: hidden;
}

.tank-level {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: linear-gradient(to top, #4CAF50, #81C784);
  transition: height 0.5s ease;
}

.tank-label {
  text-align: center;
  font-size: 12px;
  margin-top: 5px;
  font-weight: bold;
}

/* 阀门样式 */
.valve-node {
  width: 60px;
  height: 60px;
  position: relative;
}

.valve-symbol {
  width: 40px;
  height: 40px;
  border: 3px solid #666;
  transform: rotate(45deg);
  background: #fff;
  transition: all 0.3s ease;
}

.valve-node.open .valve-symbol {
  background: #4CAF50;
  border-color: #4CAF50;
}

.valve-label {
  text-align: center;
  font-size: 10px;
  margin-top: 5px;
}

/* 泵样式 */
.pump-node {
  width: 60px;
  height: 60px;
  position: relative;
}

.pump-symbol {
  width: 40px;
  height: 40px;
  border: 3px solid #666;
  border-radius: 50%;
  background: #fff;
  position: relative;
  transition: all 0.3s ease;
}

.pump-symbol::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: #666;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.pump-node.running .pump-symbol {
  background: #FF9800;
  border-color: #FF9800;
  animation: pump-rotate 1s linear infinite;
}

.pump-node.running .pump-symbol::before {
  background: #fff;
}

@keyframes pump-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pump-label {
  text-align: center;
  font-size: 10px;
  margin-top: 5px;
}

/* D3 动画元素样式 */
:deep(.d3-flow-line) {
  transition: stroke-width 0.3s ease;
}

:deep(.d3-particle) {
  cursor: pointer;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .animation-controls {
    min-width: 250px;
    padding: 10px;
  }
  
  .control-group {
    flex-direction: column;
  }
  
  .control-group button {
    min-width: 100%;
  }
  
  .status-display {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
