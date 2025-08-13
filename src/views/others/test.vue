<template>
  <div class="cad-viewer-container">
    <!-- CAD工具栏 -->
    <div class="cad-toolbar">
      <div class="toolbar-center">
       <!-- <button class="tool-btn" title="缩放">
          <span class="icon">🔍</span>
        </button>
        <button class="tool-btn" title="平移">
          <span class="icon">✋</span>
        </button>
        <button class="tool-btn" title="测量">
          <span class="icon">📏</span>
        </button> -->
        <button class="tool-btn" title="图层" @click="showLayers = !showLayers">
          <span class="icon">📋</span>
        </button>
      </div>
      
      <div class="toolbar-right">
        <span class="zoom-level">{{ zoomLevel }}%</span>
        <button class="tool-btn" @click="zoomIn">+</button>
        <button class="tool-btn" @click="zoomOut">-</button>
      </div>
    </div>
    
    <!-- 图层控制面板 -->
    <div class="layer-panel" v-show="showLayers">
      <h4>图层控制</h4>
      <div class="layer-item" v-for="layer in layers" :key="layer.name">
        <input type="checkbox" v-model="layer.visible" :id="layer.name">
        <label :for="layer.name">
          <span class="layer-color" :style="{backgroundColor: layer.color}"></span>
          {{ layer.name }}
        </label>
      </div>
    </div>
    
    <!-- 主CAD绘图区域 -->
    <svg 
      ref="cadSvg" 
      class="cad-drawing" 
      viewBox="0 0 1600 1000" 
      preserveAspectRatio="xMidYMid meet"
      @wheel="handleZoom"
      @mousedown="startPan"
      @mousemove="handlePan"
      @mouseup="endPan"
    >
      <!-- 定义样式和图案 -->
      <defs>
        <!-- 网格图案 -->
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
        </pattern>
        
        <!-- 设备填充图案 -->
        <pattern id="equipmentFill" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#74b9ff"/>
          <rect width="2" height="2" fill="#0984e3"/>
        </pattern>
      </defs>
      
      <!-- 背景 -->
      <rect width="100%" height="100%" fill="#2c3e50"/>
      
      <!-- 顶部设备区域 -->
      <g class="top-equipment-area" v-show="layers[0].visible">
        <!-- 顶部空箱放置区 -->
        <g class="top-empty-box-area">
          <!-- 空箱放置区标题 -->
          <text x="500" y="40" text-anchor="middle" font-size="16" fill="white" font-weight="bold">空箱放置区</text>
          
          <!-- 空箱单元 -->
          <g class="empty-box-units">
            <!-- 箱子1 -->
            <g class="box-unit-1">
              <image x="200" y="50" width="80" height="60" href="/src/static/image/box.svg"/>
            </g>
            
            <!-- 箱子2 -->
            <g class="box-unit-2">
              <image x="300" y="50" width="80" height="60" href="/src/static/image/box.svg"/>
            </g>
            
            <!-- 箱子3 -->
            <g class="box-unit-3">
              <image x="400" y="50" width="80" height="60" href="/src/static/image/box.svg"/>
            </g>
            
            <!-- 箱子4 -->
            <g class="box-unit-4">
              <image x="500" y="50" width="80" height="60" href="/src/static/image/box.svg"/>
            </g>
            
            <!-- 箱子5 -->
            <g class="box-unit-5">
              <image x="600" y="50" width="80" height="60" href="/src/static/image/box.svg"/>
            </g>
            
            <!-- 箱子6 -->
            <g class="box-unit-6">
              <image x="700" y="50" width="80" height="60" href="/src/static/image/box.svg"/>
            </g>
          </g>
        </g>
      </g>
      
      <!-- 主要工艺设备区域 -->
      <g class="main-process-area" v-show="layers[1].visible">
        <!-- 左侧蓝绿色设备组 -->
        <g class="left-equipment-group">
          <!-- 垂直排列的蓝绿色设备 -->
          <rect x="50" y="150" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="50" y="230" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="50" y="310" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="50" y="390" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="50" y="470" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="50" y="550" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="50" y="630" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="50" y="710" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
        </g>
        
        <!-- 中央大型设备单元 -->
        <g class="central-equipment">
          <!-- 上层中央设备组 -->
          <g class="upper-central">
            <!-- 蓝绿色设备块 -->
            <rect x="150" y="120" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
            <rect x="230" y="120" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
            <rect x="310" y="120" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
            <rect x="390" y="120" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
            
            <!-- 白色设备块 -->
            <rect x="470" y="120" width="60" height="80" fill="white" stroke="#34495e" stroke-width="2"/>
            <rect x="550" y="120" width="60" height="80" fill="white" stroke="#34495e" stroke-width="2"/>
            <rect x="630" y="120" width="60" height="80" fill="white" stroke="#34495e" stroke-width="2"/>
          </g>
          
          <!-- 主要工艺平台 -->
          <rect x="150" y="220" width="600" height="40" fill="#ecf0f1" stroke="#34495e" stroke-width="3"/>
          
          <!-- 下层设备组 -->
          <g class="lower-equipment">
            <!-- 红色设备单元 -->
            <g class="red-equipment-units">
              <rect x="180" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
              <rect x="240" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
              <rect x="300" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
              <rect x="360" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
              <rect x="420" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
              <rect x="480" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
              <rect x="540" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
              <rect x="600" y="280" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            </g>
            
            <!-- 红色设备下方的连接单元 -->
            <g class="connection-units">
              <rect x="180" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
              <rect x="240" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
              <rect x="300" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
              <rect x="360" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
              <rect x="420" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
              <rect x="480" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
              <rect x="540" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
              <rect x="600" y="350" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            </g>
          </g>
        </g>
        
        <!-- 下层工艺平台 -->
        <rect x="150" y="400" width="600" height="40" fill="#ecf0f1" stroke="#34495e" stroke-width="3"/>
        
        <!-- 底部设备区域 -->
        <g class="bottom-equipment">
          <!-- 底部红色设备组 -->
          <g class="bottom-red-units">
            <rect x="180" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="240" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="300" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="360" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="420" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="480" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="540" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="600" y="460" width="40" height="50" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
          </g>
          
          <!-- 底部连接单元 -->
          <g class="bottom-connections">
            <rect x="180" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            <rect x="240" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            <rect x="300" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            <rect x="360" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            <rect x="420" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            <rect x="480" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            <rect x="540" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
            <rect x="600" y="530" width="40" height="30" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
          </g>
        </g>
      </g>
      
      <!-- 底部工艺区域 -->
      <g class="bottom-process-area" v-show="layers[2].visible">
        <!-- 底部工艺平台 -->
        <rect x="150" y="580" width="600" height="40" fill="#ecf0f1" stroke="#34495e" stroke-width="3"/>
        
        <!-- 底部设备单元 -->
        <g class="bottom-units">
          <!-- 蓝绿色底部设备 -->
          <rect x="180" y="640" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="260" y="640" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="340" y="640" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="420" y="640" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          
          <!-- 白色底部设备 -->
          <rect x="500" y="640" width="60" height="80" fill="white" stroke="#34495e" stroke-width="2"/>
          <rect x="580" y="640" width="60" height="80" fill="white" stroke="#34495e" stroke-width="2"/>
        </g>
      </g>
      
      <!-- 右侧设备区域 -->
      <g class="right-equipment-area" v-show="layers[3].visible">
        <!-- 右侧蓝绿色设备组 -->
        <g class="right-equipment-group">
          <rect x="800" y="150" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="880" y="150" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          
          <rect x="800" y="250" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="880" y="250" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          
          <rect x="800" y="350" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="880" y="350" width="60" height="80" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
        </g>
        
        <!-- 右侧白色设备 -->
        <g class="right-white-equipment">
          <rect x="970" y="150" width="80" height="60" fill="white" stroke="#34495e" stroke-width="2"/>
          <rect x="970" y="230" width="80" height="60" fill="white" stroke="#34495e" stroke-width="2"/>
          <rect x="970" y="310" width="80" height="60" fill="white" stroke="#34495e" stroke-width="2"/>
        </g>
        
        <!-- 右侧控制设备 -->
        <g class="right-control-equipment">
          <rect x="1080" y="150" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="1080" y="230" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="1080" y="310" width="40" height="60" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
        </g>
      </g>
      
      <!-- 连接管道和线路 -->
      <g class="piping-connections" v-show="layers[4].visible">
        <!-- 主要连接线 -->
        <g class="main-connections">
          <!-- 水平主管道 -->
          <path d="M 100 240 L 750 240" stroke="#f39c12" stroke-width="4" fill="none"/>
          <path d="M 100 420 L 750 420" stroke="#f39c12" stroke-width="4" fill="none"/>
          <path d="M 100 600 L 750 600" stroke="#f39c12" stroke-width="4" fill="none"/>
          
          <!-- 垂直连接 -->
          <path d="M 200 260 L 200 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 260 260 L 260 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 320 260 L 320 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 380 260 L 380 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 440 260 L 440 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 500 260 L 500 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 560 260 L 560 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 620 260 L 620 280" stroke="#f39c12" stroke-width="3" fill="none"/>
          
          <!-- 底部连接 -->
          <path d="M 200 440 L 200 460" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 260 440 L 260 460" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 320 440 L 320 460" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 380 440 L 380 460" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 440 440 L 440 460" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 500 440 L 500 460" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 560 440 L 560 460" stroke="#f39c12" stroke-width="3" fill="none"/>
          <path d="M 620 440 L 620 460" stroke="#f39c12" stroke-width="3" fill="none"/>
        </g>
      </g>
      
      <!-- 底部设备区域 -->
      <g class="bottom-equipment-area">
        <!-- 底部蓝绿色设备组 -->
        <g class="bottom-teal-group">
          <rect x="100" y="800" width="80" height="40" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="200" y="800" width="80" height="40" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="300" y="800" width="80" height="40" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
          <rect x="400" y="800" width="80" height="40" fill="#16a085" stroke="#0f6674" stroke-width="2"/>
        </g>
      </g>
    </svg>
    
    <!-- 状态栏 -->
    <div class="status-bar">
      <span>坐标: {{ mouseCoords.x }}, {{ mouseCoords.y }}</span>
      <span>缩放: {{ zoomLevel }}%</span>
      <span>图层: {{ visibleLayerCount }}/{{ layers.length }}</span>
      <span>工艺流程图 - P&ID</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const cadSvg = ref<SVGElement>()
const showLayers = ref(false)
const zoomLevel = ref(100)
const mouseCoords = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

// 图层数据
const layers = ref([
  { name: '空箱放置区', visible: true, color: '#ecf0f1' },
  { name: '主工艺区', visible: true, color: '#16a085' },
  { name: '机器', visible: true, color: '#e74c3c' },
  { name: '右侧设备', visible: true, color: '#16a085' },
  { name: '传输带', visible: true, color: '#f39c12' }
])

// 计算可见图层数量
const visibleLayerCount = computed(() => {
  return layers.value.filter(layer => layer.visible).length
})

// 缩放功能
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + 10, 200)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - 10, 50)
}

function handleZoom(event: WheelEvent) {
  event.preventDefault()
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 平移功能
function startPan(event: MouseEvent) {
  isPanning.value = true
  panStart.value = { x: event.clientX, y: event.clientY }
}

function handlePan(event: MouseEvent) {
  if (!isPanning.value) {
    // 更新鼠标坐标
    const rect = cadSvg.value?.getBoundingClientRect()
    if (rect) {
      mouseCoords.value = {
        x: Math.round(((event.clientX - rect.left) / rect.width) * 1600),
        y: Math.round(((event.clientY - rect.top) / rect.height) * 1000)
      }
    }
    return
  }
  
  // 处理平移逻辑
  const deltaX = event.clientX - panStart.value.x
  const deltaY = event.clientY - panStart.value.y
  
  console.log('平移:', deltaX, deltaY)
}

function endPan() {
  isPanning.value = false
}

onMounted(() => {
  console.log('工艺流程图已加载')
})
</script>

<style scoped>
.cad-viewer-container {
  width: 100vw;
  height: 100vh;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  font-family: 'Arial', sans-serif;
}

/* CAD工具栏 */
.cad-toolbar {
  background: #2d3436;
  color: white;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #636e72;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-center {
  display: flex;
  gap: 4px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cad-btn {
  background: #636e72;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.cad-btn:hover {
  background: #74b9ff;
}

.cad-btn.active {
  background: #0984e3;
  box-shadow: 0 0 8px rgba(9, 132, 227, 0.5);
}

.tool-btn {
  background: #636e72;
  color: white;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.tool-btn:hover {
  background: #74b9ff;
}

.zoom-level {
  font-size: 12px;
  color: #ddd;
  min-width: 40px;
  text-align: center;
}

/* 图层面板 */
.layer-panel {
  position: absolute;
  top: 60px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 200px;
}

.layer-panel h4 {
  margin: 0 0 12px 0;
  color: #2d3436;
  font-size: 14px;
}

.layer-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.layer-item input {
  margin-right: 8px;
}

.layer-item label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 12px;
  color: #2d3436;
}

.layer-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  margin-right: 8px;
  border: 1px solid #ddd;
}

/* CAD绘图区域 */
.cad-drawing {
  flex: 1;
  background: #2c3e50;
  border: 1px solid #34495e;
  cursor: crosshair;
}

.cad-drawing text {
  font-family: 'Arial', sans-serif;
  user-select: none;
}

/* 状态栏 */
.status-bar {
  background: #2d3436;
  color: #ddd;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  border-top: 1px solid #636e72;
}

.status-bar span {
  margin-right: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cad-toolbar {
    flex-direction: column;
    gap: 8px;
  }
  
  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    justify-content: center;
  }
  
  .layer-panel {
    right: 10px;
    left: 10px;
    top: 120px;
  }
  
  .status-bar {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
}
</style>