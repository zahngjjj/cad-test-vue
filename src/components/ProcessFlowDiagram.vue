<template>
  <div class="process-flow-container">
    <!-- 背景层 -->
    <div 
      class="custom-background"
      :style="{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        backgroundImage: `url(${bgImage})`,
        transformOrigin: '0 0'
      }"
    ></div>
    
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
import { ref, onMounted } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'

// 修改图片导入方式
import bgImageUrl from '../static/image/bg.png'

// 导入样式文件
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

// 视口状态
const viewport = ref({ x: 0, y: 0, zoom: 1 })
const bgImage = ref(bgImageUrl)
const vueFlowRef = ref(null)

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
  
  // 连接线定义 - 使用 VueFlow 原生动画
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true,  // VueFlow 原生动画
    style: { stroke: '#0066cc', strokeWidth: 3 }
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    animated: true,  // VueFlow 原生动画
    style: { stroke: '#0066cc', strokeWidth: 3 }
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'smoothstep',
    animated: true,  // VueFlow 原生动画
    style: { stroke: '#0066cc', strokeWidth: 3 }
  }
])

function onConnect(connection: any) {
  console.log('连接创建:', connection)
  elements.value.push(connection)
}

function onNodeClick(event: any) {
  console.log('节点点击:', event.node)
}

// 模拟实时数据更新
onMounted(() => {
  setInterval(() => {
    // 更新罐体液位
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
</style>
