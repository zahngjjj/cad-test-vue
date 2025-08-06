<template>
  <div class="dwg-svg-demo">
    <div class="header">
      <h2>DWG转SVG Demo - 支持缩放和平移</h2>
      <div class="controls">
        <input 
          ref="fileInput" 
          type="file" 
          @change="loadDWGFile" 
          accept=".dwg" 
          style="display: none"
        />
        <button @click="$refs.fileInput.click()" :disabled="loading">
          {{ loading ? '加载中...' : '选择DWG文件' }}
        </button>
        <button @click="downloadSVG" :disabled="!svgContent">
          下载SVG
        </button>
        <button @click="resetView" :disabled="!svgContent">
          重置视图
        </button>
      </div>
    </div>

    <div class="content">
      <div class="info-panel" v-if="dwgInfo">
        <h3>文件信息</h3>
        <p><strong>版本:</strong> {{ dwgInfo.version }}</p>
        <p><strong>实体数量:</strong> {{ dwgInfo.entityCount }}</p>
        <p><strong>支持的实体:</strong> {{ dwgInfo.supportedEntities }}</p>
        <p><strong>不支持的实体:</strong> {{ dwgInfo.unsupportedEntities }}</p>
      </div>

      <div class="svg-container" ref="svgContainer">
        <div class="zoom-controls">
          <button @click="zoomIn">放大</button>
          <button @click="zoomOut">缩小</button>
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        </div>
        
        <div 
          class="svg-viewer" 
          ref="svgViewer"
          @wheel="handleWheel"
          @mousedown="startPan"
          @mousemove="handlePan"
          @mouseup="endPan"
          @mouseleave="endPan"
        >
          <svg 
            ref="svgElement"
            v-if="svgContent"
            :viewBox="viewBox"
            :style="svgStyle"
            v-html="svgContent"
          >
          </svg>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message">
        <p><strong>错误:</strong> {{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'

// 响应式数据
const loading = ref(false)
const dwgData = ref<any>(null)
const dwgInfo = ref<any>(null)
const svgContent = ref('')
const errorMessage = ref('')

// SVG视图控制
const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const lastPanPoint = ref({ x: 0, y: 0 })
const svgBounds = ref({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 })

// DOM引用
const fileInput = ref<HTMLInputElement>()
const svgContainer = ref<HTMLElement>()
const svgViewer = ref<HTMLElement>()
const svgElement = ref<SVGElement>()

// LibreDWG实例
let libredwg: LibreDwg

// 计算属性
const viewBox = computed(() => {
  const { minX, minY, maxX, maxY } = svgBounds.value
  const width = (maxX - minX) / zoomLevel.value
  const height = (maxY - minY) / zoomLevel.value
  const centerX = (minX + maxX) / 2 + panX.value
  const centerY = (minY + maxY) / 2 + panY.value
  
  return `${centerX - width/2} ${centerY - height/2} ${width} ${height}`
})

const svgStyle = computed(() => ({
  width: '100%',
  height: '100%',
  cursor: isPanning.value ? 'grabbing' : 'grab'
}))

// 组件生命周期
onMounted(async () => {
  await initLibreDWG()
})

// 初始化LibreDWG
async function initLibreDWG() {
  try {
    libredwg = await LibreDwg.create()
    console.log('LibreDWG初始化成功')
  } catch (error) {
    console.error('LibreDWG初始化失败:', error)
    errorMessage.value = 'LibreDWG初始化失败，请检查wasm文件是否正确加载'
  }
}

// BigInt转换函数
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item))
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToString(value)
    }
    return result
  }
  
  return obj
}

// 加载DWG文件
async function loadDWGFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !libredwg) {
    return
  }
  
  loading.value = true
  errorMessage.value = ''
  svgContent.value = ''
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    const dwg = libredwg.dwg_read_data(uint8Array, Dwg_File_Type.DWG)
    if (!dwg) {
      throw new Error('无法解析DWG文件')
    }
    
    const db = libredwg.convert(dwg)
    const processedDb = convertBigIntToString(db)
    dwgData.value = processedDb
    
    // 提取文件信息
    extractDWGInfo(processedDb)
    
    // 转换为SVG
    convertToSVG(processedDb)
    
    libredwg.dwg_free(dwg)
    
  } catch (error) {
    console.error('DWG文件加载失败:', error)
    errorMessage.value = `DWG文件加载失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

// 提取DWG文件信息
function extractDWGInfo(db: any) {
  const entityTypes = new Map()
  let supportedCount = 0
  let unsupportedCount = 0
  
  if (db.entities) {
    db.entities.forEach((entity: any) => {
      const type = entity.type || 'Unknown'
      entityTypes.set(type, (entityTypes.get(type) || 0) + 1)
      
      const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'TEXT', 'MTEXT', 'POINT']
      if (supportedTypes.includes(type)) {
        supportedCount++
      } else {
        unsupportedCount++
      }
    })
  }
  
  dwgInfo.value = {
    version: db.header?.version || 'Unknown',
    entityCount: db.entities?.length || 0,
    supportedEntities: supportedCount,
    unsupportedEntities: unsupportedCount,
    entityTypes: Array.from(entityTypes.entries()).map(([type, count]) => ({ type, count }))
  }
}

// 转换为SVG
function convertToSVG(db: any) {
  if (!db.entities || db.entities.length === 0) {
    svgContent.value = '<text x="50" y="50" fill="red">没有找到可显示的实体</text>'
    return
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const svgElements: string[] = []
  
  // 处理每个实体
  db.entities.forEach((entity: any) => {
    const svgElement = createSVGElement(entity)
    if (svgElement) {
      svgElements.push(svgElement.element)
      
      // 更新边界
      if (svgElement.bounds) {
        minX = Math.min(minX, svgElement.bounds.minX)
        minY = Math.min(minY, svgElement.bounds.minY)
        maxX = Math.max(maxX, svgElement.bounds.maxX)
        maxY = Math.max(maxY, svgElement.bounds.maxY)
      }
    }
  })
  
  // 设置SVG边界
  if (minX !== Infinity) {
    const padding = Math.max((maxX - minX), (maxY - minY)) * 0.1
    svgBounds.value = {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    }
  }
  
  svgContent.value = svgElements.join('\n')
  resetView()
}

// 创建SVG元素
function createSVGElement(entity: any): { element: string, bounds?: any } | null {
  const color = entity.color || '#000000'
  
  try {
    switch (entity.type) {
      case 'LINE':
        return createSVGLine(entity, color)
      case 'CIRCLE':
        return createSVGCircle(entity, color)
      case 'ARC':
        return createSVGArc(entity, color)
      case 'POLYLINE':
      case 'LWPOLYLINE':
        return createSVGPolyline(entity, color)
      case 'TEXT':
      case 'MTEXT':
        return createSVGText(entity, color)
      case 'POINT':
        return createSVGPoint(entity, color)
      default:
        return null
    }
  } catch (error) {
    console.warn('创建SVG元素失败:', entity.type, error)
    return null
  }
}

// 创建SVG线条
function createSVGLine(entity: any, color: string) {
  let startPoint, endPoint
  
  // 尝试多种可能的属性名
  if (entity.start && entity.end) {
    startPoint = entity.start
    endPoint = entity.end
  } else if (entity.pt1 && entity.pt2) {
    startPoint = entity.pt1
    endPoint = entity.pt2
  } else if (entity.start_pt && entity.end_pt) {
    startPoint = entity.start_pt
    endPoint = entity.end_pt
  } else {
    return null
  }
  
  if (!startPoint || !endPoint) return null
  
  const element = `<line x1="${startPoint.x}" y1="${-startPoint.y}" x2="${endPoint.x}" y2="${-endPoint.y}" stroke="${color}" stroke-width="1" fill="none"/>`
  
  return {
    element,
    bounds: {
      minX: Math.min(startPoint.x, endPoint.x),
      minY: Math.min(-startPoint.y, -endPoint.y),
      maxX: Math.max(startPoint.x, endPoint.x),
      maxY: Math.max(-startPoint.y, -endPoint.y)
    }
  }
}

// 创建SVG圆形
function createSVGCircle(entity: any, color: string) {
  const center = entity.center
  const radius = entity.radius
  
  if (!center || !radius) return null
  
  const element = `<circle cx="${center.x}" cy="${-center.y}" r="${radius}" stroke="${color}" stroke-width="1" fill="none"/>`
  
  return {
    element,
    bounds: {
      minX: center.x - radius,
      minY: -center.y - radius,
      maxX: center.x + radius,
      maxY: -center.y + radius
    }
  }
}

// 创建SVG弧形
function createSVGArc(entity: any, color: string) {
  const center = entity.center
  const radius = entity.radius
  const startAngle = entity.startAngle || entity.start_angle
  const endAngle = entity.endAngle || entity.end_angle
  
  if (!center || !radius || startAngle === undefined || endAngle === undefined) return null
  
  const startX = center.x + radius * Math.cos(startAngle)
  const startY = -center.y - radius * Math.sin(startAngle)
  const endX = center.x + radius * Math.cos(endAngle)
  const endY = -center.y - radius * Math.sin(endAngle)
  
  const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0
  
  const element = `<path d="M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}" stroke="${color}" stroke-width="1" fill="none"/>`
  
  return {
    element,
    bounds: {
      minX: center.x - radius,
      minY: -center.y - radius,
      maxX: center.x + radius,
      maxY: -center.y + radius
    }
  }
}

// 创建SVG多段线
function createSVGPolyline(entity: any, color: string) {
  const vertices = entity.vertices || entity.points
  if (!vertices || vertices.length < 2) return null
  
  const points = vertices.map((v: any) => `${v.x},${-v.y}`).join(' ')
  const element = `<polyline points="${points}" stroke="${color}" stroke-width="1" fill="none"/>`
  
  const xs = vertices.map((v: any) => v.x)
  const ys = vertices.map((v: any) => -v.y)
  
  return {
    element,
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys)
    }
  }
}

// 创建SVG文本
function createSVGText(entity: any, color: string) {
  const text = entity.text || entity.textValue
  const position = entity.position || entity.insertionPoint
  
  if (!text || !position) return null
  
  const fontSize = entity.height || 10
  const element = `<text x="${position.x}" y="${-position.y}" fill="${color}" font-size="${fontSize}" font-family="Arial">${text}</text>`
  
  return {
    element,
    bounds: {
      minX: position.x,
      minY: -position.y - fontSize,
      maxX: position.x + text.length * fontSize * 0.6,
      maxY: -position.y
    }
  }
}

// 创建SVG点
function createSVGPoint(entity: any, color: string) {
  const position = entity.position || entity.point
  if (!position) return null
  
  const element = `<circle cx="${position.x}" cy="${-position.y}" r="2" fill="${color}"/>`
  
  return {
    element,
    bounds: {
      minX: position.x - 2,
      minY: -position.y - 2,
      maxX: position.x + 2,
      maxY: -position.y + 2
    }
  }
}

// 缩放控制
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value * 1.2, 10)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.1)
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 平移控制
function startPan(event: MouseEvent) {
  isPanning.value = true
  lastPanPoint.value = { x: event.clientX, y: event.clientY }
}

function handlePan(event: MouseEvent) {
  if (!isPanning.value) return
  
  const deltaX = event.clientX - lastPanPoint.value.x
  const deltaY = event.clientY - lastPanPoint.value.y
  
  const { minX, minY, maxX, maxY } = svgBounds.value
  const scale = (maxX - minX) / (svgViewer.value?.clientWidth || 1000)
  
  panX.value -= deltaX * scale / zoomLevel.value
  panY.value += deltaY * scale / zoomLevel.value
  
  lastPanPoint.value = { x: event.clientX, y: event.clientY }
}

function endPan() {
  isPanning.value = false
}

// 重置视图
function resetView() {
  zoomLevel.value = 1
  panX.value = 0
  panY.value = 0
}

// 下载SVG
function downloadSVG() {
  if (!svgContent.value) return
  
  const { minX, minY, maxX, maxY } = svgBounds.value
  const fullSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}">
${svgContent.value}
</svg>`
  
  const blob = new Blob([fullSVG], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dwg-converted.svg'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.dwg-svg-demo {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: Arial, sans-serif;
}

.header {
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.header h2 {
  margin: 0 0 1rem 0;
  color: #333;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.controls button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.controls button:hover:not(:disabled) {
  background: #0056b3;
}

.controls button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.info-panel {
  width: 300px;
  padding: 1rem;
  background: #f8f9fa;
  border-right: 1px solid #dee2e6;
  overflow-y: auto;
}

.info-panel h3 {
  margin-top: 0;
  color: #333;
}

.svg-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.zoom-controls button {
  padding: 0.25rem 0.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;
}

.zoom-level {
  font-size: 0.8rem;
  font-weight: bold;
  color: #333;
}

.svg-viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}

.error-message {
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin: 1rem;
}
</style>