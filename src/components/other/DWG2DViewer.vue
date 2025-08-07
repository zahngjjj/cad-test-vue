<template>
  <div class="dwg-viewer">
    <div class="controls">
      <input type="file" @change="loadFile" accept=".dwg" />
      <button @click="zoomIn">放大</button>
      <button @click="zoomOut">缩小</button>
      <button @click="resetView">重置视图</button>
      <button @click="pan">平移</button>
    </div>
    <canvas 
      ref="canvas" 
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'

const canvas = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D
let libredwg: LibreDwg
let entities: any[] = []
let viewport = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  width: 800,
  height: 600
}

class DWG2DRenderer {
  constructor(context: CanvasRenderingContext2D) {
    this.ctx = context
  }
  
  clear() {
    this.ctx.clearRect(0, 0, viewport.width, viewport.height)
  }
  
  transformPoint(x: number, y: number) {
    return {
      x: (x * viewport.scale) + viewport.offsetX,
      y: (y * viewport.scale) + viewport.offsetY
    }
  }
  
  drawLine(start: any, end: any) {
    const p1 = this.transformPoint(start.x, start.y)
    const p2 = this.transformPoint(end.x, end.y)
    
    this.ctx.beginPath()
    this.ctx.moveTo(p1.x, p1.y)
    this.ctx.lineTo(p2.x, p2.y)
    this.ctx.stroke()
  }
  
  drawCircle(center: any, radius: number) {
    const p = this.transformPoint(center.x, center.y)
    const r = radius * viewport.scale
    
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, r, 0, 2 * Math.PI)
    this.ctx.stroke()
  }
  
  drawArc(center: any, radius: number, startAngle: number, endAngle: number) {
    const p = this.transformPoint(center.x, center.y)
    const r = radius * viewport.scale
    
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, r, startAngle, endAngle)
    this.ctx.stroke()
  }
  
  drawPolyline(vertices: any[]) {
    if (vertices.length < 2) return
    
    this.ctx.beginPath()
    const firstPoint = this.transformPoint(vertices[0].x, vertices[0].y)
    this.ctx.moveTo(firstPoint.x, firstPoint.y)
    
    for (let i = 1; i < vertices.length; i++) {
      const point = this.transformPoint(vertices[i].x, vertices[i].y)
      this.ctx.lineTo(point.x, point.y)
    }
    
    this.ctx.stroke()
  }
}

let renderer: DWG2DRenderer

onMounted(async () => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')!
    canvas.value.width = viewport.width
    canvas.value.height = viewport.height
    renderer = new DWG2DRenderer(ctx)
    
    // 初始化 LibreDWG
    libredwg = await LibreDwg.create()
    console.log('LibreDWG 初始化成功')
  }
})

// 修复后的 loadFile 函数
async function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !libredwg) {
    console.log('文件或LibreDWG未准备好:', { file: !!file, libredwg: !!libredwg })
    return
  }
  
  console.log('开始加载文件:', file.name, '大小:', file.size, 'bytes')
  loading.value = true
  errorMessage.value = ''
  
  try {
    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    console.log('文件读取成功，数据长度:', uint8Array.length)
    
    // 使用LibreDWG解析DWG文件 - 添加缺失的第二个参数
    console.log('开始解析DWG文件...')
    const dwg = libredwg.dwg_read_data(uint8Array, Dwg_File_Type.DWG)
    
    if (!dwg) {
      throw new Error('无法解析DWG文件 - dwg_read_data返回null，可能是文件版本不支持或文件格式问题')
    }
    
    console.log('DWG解析成功，开始转换...')
    // 转换为更易用的数据结构
    const db = libredwg.convert(dwg)
    console.log('转换完成，实体数量:', db.entities?.length || 0)
    
    // 处理 BigInt 类型
    const processedDb = convertBigIntToString(db)
    
    // 渲染到Canvas
    renderToCanvas(processedDb)
    
    // 释放原始dwg数据内存
    libredwg.dwg_free(dwg)
    
  } catch (error) {
    console.error('DWG文件加载失败:', error)
    errorMessage.value = `DWG文件加载失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

// 添加 BigInt 转换函数
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

// 渲染到Canvas
function renderToCanvas(db: any) {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  if (!db.entities || db.entities.length === 0) {
    console.log('没有找到实体数据')
    return
  }
  
  console.log('开始渲染', db.entities.length, '个实体')
  
  // 创建渲染器实例
  const renderer = new DWG2DRenderer(ctx, canvas.width, canvas.height)
  
  // 计算边界框
  const bounds = calculateBounds(db.entities)
  if (bounds) {
    renderer.setBounds(bounds)
  }
  
  // 渲染所有实体
  db.entities.forEach((entity: any, index: number) => {
    // 打印前几个实体的详细信息用于调试
    if (index < 5) {
      console.log(`实体 ${index}:`, entity)
    }
    renderer.renderEntity(entity)
  })
  
  console.log('渲染完成')
}

function calculateBounds() {
  if (entities.length === 0) return
  
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  entities.forEach(entity => {
    switch (entity.type) {
      case 'LINE':
        if (entity.start && entity.end) {
          minX = Math.min(minX, entity.start.x, entity.end.x)
          minY = Math.min(minY, entity.start.y, entity.end.y)
          maxX = Math.max(maxX, entity.start.x, entity.end.x)
          maxY = Math.max(maxY, entity.start.y, entity.end.y)
        }
        break
      case 'CIRCLE':
        if (entity.center && entity.radius) {
          minX = Math.min(minX, entity.center.x - entity.radius)
          minY = Math.min(minY, entity.center.y - entity.radius)
          maxX = Math.max(maxX, entity.center.x + entity.radius)
          maxY = Math.max(maxY, entity.center.y + entity.radius)
        }
        break
      // 其他实体类型...
    }
  })
  
  // 调整视图以适应所有实体
  const width = maxX - minX
  const height = maxY - minY
  const scaleX = viewport.width / width
  const scaleY = viewport.height / height
  viewport.scale = Math.min(scaleX, scaleY) * 0.9
  
  viewport.offsetX = (viewport.width - width * viewport.scale) / 2 - minX * viewport.scale
  viewport.offsetY = (viewport.height - height * viewport.scale) / 2 - minY * viewport.scale
}

function renderEntities() {
  renderer.clear()
  
  entities.forEach(entity => {
    ctx.strokeStyle = entity.color || '#000000'
    ctx.lineWidth = entity.lineweight || 1
    
    switch (entity.type) {
      case 'LINE':
        if (entity.start && entity.end) {
          renderer.drawLine(entity.start, entity.end)
        }
        break
      case 'CIRCLE':
        if (entity.center && entity.radius) {
          renderer.drawCircle(entity.center, entity.radius)
        }
        break
      case 'ARC':
        if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
          renderer.drawArc(entity.center, entity.radius, entity.startAngle, entity.endAngle)
        }
        break
      case 'POLYLINE':
      case 'LWPOLYLINE':
        if (entity.vertices && entity.vertices.length > 0) {
          renderer.drawPolyline(entity.vertices)
        }
        break
    }
  })
}

// 交互功能
function zoomIn() {
  viewport.scale *= 1.2
  renderEntities()
}

function zoomOut() {
  viewport.scale /= 1.2
  renderEntities()
}

function resetView() {
  calculateBounds()
  renderEntities()
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  const factor = event.deltaY > 0 ? 0.9 : 1.1
  viewport.scale *= factor
  renderEntities()
}

// 平移功能
let isDragging = false
let lastMousePos = { x: 0, y: 0 }

function handleMouseDown(event: MouseEvent) {
  isDragging = true
  lastMousePos = { x: event.clientX, y: event.clientY }
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging) return
  
  const deltaX = event.clientX - lastMousePos.x
  const deltaY = event.clientY - lastMousePos.y
  
  viewport.offsetX += deltaX
  viewport.offsetY += deltaY
  
  lastMousePos = { x: event.clientX, y: event.clientY }
  renderEntities()
}

function handleMouseUp() {
  isDragging = false
}
</script>

<style scoped>
.dwg-viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.controls {
  padding: 10px;
  background: #f5f5f5;
  display: flex;
  gap: 10px;
  align-items: center;
}

canvas {
  flex: 1;
  border: 1px solid #ccc;
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}

button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}
</style>