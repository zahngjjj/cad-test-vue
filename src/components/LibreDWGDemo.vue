<template>
  <div class="libredwg-demo">
    <div class="header">
      <h2>LibreDWG-Web DWG文件解析Demo</h2>
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
        <button @click="exportToJSON" :disabled="!dwgData">
          导出为JSON
        </button>
        <button @click="clearViewer">
          清空视图
        </button>
      </div>
    </div>
    
    <div class="content">
      <!-- 3D渲染区域 -->
      <div class="viewer-section">
        <h3>3D视图</h3>
        <div ref="threeContainer" class="three-container"></div>
      </div>
      
      <!-- 数据信息区域 -->
      <div class="info-section">
        <h3>DWG文件信息</h3>
        <div class="info-content">
          <div v-if="dwgInfo" class="dwg-info">
            <div v-if="dwgInfo" class="dwg-info">
              <p><strong>文件版本:</strong> {{ dwgInfo.version }}</p>
              <p><strong>实体数量:</strong> {{ dwgInfo.entityCount }}</p>
              <p><strong>支持的实体:</strong> {{ dwgInfo.supportedEntities }}</p>
              <p><strong>不支持的实体:</strong> {{ dwgInfo.unsupportedEntities }}</p>
              <p><strong>图层数量:</strong> {{ dwgInfo.layerCount }}</p>
              <p><strong>块定义数量:</strong> {{ dwgInfo.blockCount }}</p>
            </div>
          </div>
          
          <div v-if="entities.length > 0" class="entities-list">
            <h4>实体列表 (前20个):</h4>
            <div class="entity-item" v-for="(entity, index) in entities.slice(0, 20)" :key="index">
              <span class="entity-type">{{ entity.type }}</span>
              <span class="entity-layer">图层: {{ entity.layer || 'Default' }}</span>
            </div>
          </div>
          
          <div v-if="errorMessage" class="error-message">
            <p><strong>错误:</strong> {{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'

// 响应式数据
const loading = ref(false)
const dwgData = ref<any>(null)
const dwgInfo = ref<any>(null)
const entities = ref<any[]>([])
const errorMessage = ref('')

// DOM引用
const threeContainer = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()

// Three.js相关变量
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let currentModel: THREE.Group
let libredwg: LibreDwg

// 组件生命周期
onMounted(async () => {
  await initLibreDWG()
  initThreeJS()
})

onUnmounted(() => {
  if (renderer) {
    renderer.dispose()
  }
})

// 初始化LibreDWG
async function initLibreDWG() {
  try {
    libredwg = await LibreDwg.create()

  } catch (error) {

    errorMessage.value = 'LibreDWG初始化失败，请检查wasm文件是否正确加载'
  }
}

// 初始化Three.js场景
function initThreeJS() {
  if (!threeContainer.value) return
  
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf8f9fa)
  
  // 创建相机
  const container = threeContainer.value
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    10000
  )
  camera.position.set(100, 100, 100)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  
  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(200, 200, 200)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)
  
  // 添加网格
  const gridHelper = new THREE.GridHelper(1000, 50, 0x888888, 0xcccccc)
  scene.add(gridHelper)
  
  // 开始渲染循环
  animate()
  
  // 处理窗口大小变化
  window.addEventListener('resize', onWindowResize)
}

// 渲染循环
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

// 窗口大小变化处理
function onWindowResize() {
  if (!threeContainer.value) return
  
  const container = threeContainer.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

// 加载DWG文件
// 在loadDWGFile函数中添加更多调试信息
async function loadDWGFile(event: Event) {
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
    
    // 使用LibreDWG解析DWG文件
    console.log('开始解析DWG文件...')
    const dwg = libredwg.dwg_read_data(uint8Array, Dwg_File_Type.DWG)
    
    if (!dwg) {
      throw new Error('无法解析DWG文件 - dwg_read_data返回null')
    }
    
    console.log('DWG解析成功，开始转换...')
    // 转换为更易用的数据结构
    const db = libredwg.convert(dwg)
    console.log('转换完成，实体数量:', db.entities?.length || 0)
    
    // 处理 BigInt 类型
    const processedDb = convertBigIntToString(db)
    dwgData.value = processedDb
    
    // 提取文件信息
    extractDWGInfo(processedDb)
    
    // 在Three.js中渲染
    renderDWGInThreeJS(processedDb)
    
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

// 提取DWG文件信息
// 在extractDWGInfo函数中添加实体类型统计
function extractDWGInfo(db: any) {
  const entityTypes = new Map()
  let supportedCount = 0
  let unsupportedCount = 0
  
  if (db.entities) {
    db.entities.forEach((entity: any) => {
      const type = entity.type || 'Unknown'
      entityTypes.set(type, (entityTypes.get(type) || 0) + 1)
      
      // 统计支持的实体类型
      const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'INSERT', 'HATCH', 'TEXT', 'MTEXT', 'POINT', 'ELLIPSE']
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
    layerCount: db.layers?.length || 0,
    blockCount: db.blocks?.length || 0,
    supportedEntities: supportedCount,
    unsupportedEntities: unsupportedCount,
    entityTypes: Array.from(entityTypes.entries()).map(([type, count]) => ({ type, count }))
  }
  
  // 提取实体信息
  entities.value = (db.entities || []).map((entity: any) => ({
    type: entity.type || 'Unknown',
    layer: entity.layer,
    color: entity.color,
    handle: entity.handle
  }))
}

// 在Three.js中渲染DWG数据
function renderDWGInThreeJS(db: any) {
  // 清除之前的模型
  if (currentModel) {
    scene.remove(currentModel)
  }
  
  currentModel = new THREE.Group()
  let createdObjectsCount = 0
  let skippedObjectsCount = 0
  
  // 渲染实体
  if (db.entities) {

    db.entities.forEach((entity: any, index: number) => {
      // 打印前几个实体的详细信息
      if (index < 5) {
        console.log(`实体 ${index}:`, entity)
      }
      
      const object = createThreeObjectFromEntity(entity)
      if (object) {
        currentModel.add(object)
        createdObjectsCount++
      } else {
        skippedObjectsCount++
      }
    })
  }
  

  
  scene.add(currentModel)
  
  // 调整相机以适应模型
  fitCameraToModel()
}

// 从DWG实体创建Three.js对象
function createThreeObjectFromEntity(entity: any): THREE.Object3D | null {
  const color = entity.color || 0x000000
  const material = new THREE.LineBasicMaterial({ color })
  
  try {
    switch (entity.type) {
      case 'LINE':
        // 尝试多种可能的属性名
        let startPoint, endPoint
        
        // 方式1: 直接的点属性
        if (entity.start && entity.end) {
          startPoint = entity.start
          endPoint = entity.end
        }
        // 方式2: pt1, pt2
        else if (entity.pt1 && entity.pt2) {
          startPoint = entity.pt1
          endPoint = entity.pt2
        }
        // 方式3: start_pt, end_pt
        else if (entity.start_pt && entity.end_pt) {
          startPoint = entity.start_pt
          endPoint = entity.end_pt
        }
        // 方式4: point1, point2
        else if (entity.point1 && entity.point2) {
          startPoint = entity.point1
          endPoint = entity.point2
        }
        // 方式5: startPoint, endPoint
        else if (entity.startPoint && entity.endPoint) {
          startPoint = entity.startPoint
          endPoint = entity.endPoint
        }
        // 方式6: 检查是否有数组形式的坐标
        else if (entity.points && entity.points.length >= 2) {
          startPoint = entity.points[0]
          endPoint = entity.points[1]
        }
        // 方式7: 检查是否有vertices
        else if (entity.vertices && entity.vertices.length >= 2) {
          startPoint = entity.vertices[0]
          endPoint = entity.vertices[1]
        }
        // 方式8: 尝试从实体的其他属性中提取坐标
        else {
          // 打印实体的所有属性，帮助调试

          
          // 尝试查找包含x,y坐标的属性
          const possiblePoints = []
          for (const [key, value] of Object.entries(entity)) {
            if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
              possiblePoints.push({ key, value })
            }
          }
      
          
          if (possiblePoints.length >= 2) {
            startPoint = possiblePoints[0].value
            endPoint = possiblePoints[1].value
          }
        }
        
        if (startPoint && endPoint && 
            typeof startPoint.x === 'number' && typeof startPoint.y === 'number' &&
            typeof endPoint.x === 'number' && typeof endPoint.y === 'number') {
          
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z || 0),
            new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z || 0)
          ])
          
  
          
          return new THREE.Line(geometry, material)
        } else {
          console.log('LINE实体无法找到有效的起点和终点')
        }
        break
        
      case 'CIRCLE':
   
        const center = entity.center || entity.centerPoint || entity.cp
        const radius = entity.radius || entity.r
        
        if (center && radius) {
          const geometry = new THREE.CircleGeometry(radius, 32)
          const circle = new THREE.LineLoop(new THREE.EdgesGeometry(geometry), material)
          circle.position.set(center.x, center.y, center.z || 0)
          return circle
        }
        break
        
      case 'ARC':

        const arcCenter = entity.center || entity.centerPoint || entity.cp
        const arcRadius = entity.radius || entity.r
        const startAngle = entity.startAngle || entity.start_angle
        const endAngle = entity.endAngle || entity.end_angle
        
        if (arcCenter && arcRadius && startAngle !== undefined && endAngle !== undefined) {
          const geometry = new THREE.CircleGeometry(
            arcRadius, 
            32, 
            startAngle, 
            endAngle - startAngle
          )
          const arc = new THREE.LineLoop(new THREE.EdgesGeometry(geometry), material)
          arc.position.set(arcCenter.x, arcCenter.y, arcCenter.z || 0)
          return arc
        }
        break
        
      case 'POLYLINE':
      case 'LWPOLYLINE':

        const vertices = entity.vertices || entity.points || entity.vertexList
        
        if (vertices && vertices.length > 0) {
          const points = vertices.map((vertex: any) => 
            new THREE.Vector3(vertex.x, vertex.y, vertex.z || 0)
          )
          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          return new THREE.Line(geometry, material)
        }
        break
        
      case 'SPLINE':
        // 样条曲线处理
        if (entity.controlPoints && entity.controlPoints.length > 0) {
          const points = entity.controlPoints.map((point: any) => 
            new THREE.Vector3(point.x, point.y, point.z || 0)
          )
          // 使用CatmullRomCurve3创建平滑曲线
          const curve = new THREE.CatmullRomCurve3(points)
          const curvePoints = curve.getPoints(50)
          const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints)
          return new THREE.Line(geometry, material)
        } else if (entity.fitPoints && entity.fitPoints.length > 0) {
          const points = entity.fitPoints.map((point: any) => 
            new THREE.Vector3(point.x, point.y, point.z || 0)
          )
          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          return new THREE.Line(geometry, material)
        }
        break
        
      case 'INSERT':
        // 块插入处理 - 用简单的十字标记表示
        if (entity.insertionPoint) {
          const group = new THREE.Group()
          const size = entity.scale?.x || 5
          
          // 创建十字标记
          const crossGeometry1 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-size, 0, 0),
            new THREE.Vector3(size, 0, 0)
          ])
          const crossGeometry2 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -size, 0),
            new THREE.Vector3(0, size, 0)
          ])
          
          const cross1 = new THREE.Line(crossGeometry1, material)
          const cross2 = new THREE.Line(crossGeometry2, material)
          
          group.add(cross1)
          group.add(cross2)
          group.position.set(
            entity.insertionPoint.x, 
            entity.insertionPoint.y, 
            entity.insertionPoint.z || 0
          )
          
          return group
        }
        break
        
      case 'HATCH':
        // 填充处理 - 用边界线表示
        if (entity.boundary && entity.boundary.length > 0) {
          const group = new THREE.Group()
          
          entity.boundary.forEach((loop: any) => {
            if (loop.edges && loop.edges.length > 0) {
              const points: THREE.Vector3[] = []
              
              loop.edges.forEach((edge: any) => {
                if (edge.start) {
                  points.push(new THREE.Vector3(edge.start.x, edge.start.y, edge.start.z || 0))
                }
                if (edge.end) {
                  points.push(new THREE.Vector3(edge.end.x, edge.end.y, edge.end.z || 0))
                }
              })
              
              if (points.length > 0) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points)
                const line = new THREE.Line(geometry, material)
                group.add(line)
              }
            }
          })
          
          return group.children.length > 0 ? group : null
        }
        break
        
      case 'TEXT':
      case 'MTEXT':
        // 文本实体用小方块表示
        if (entity.position || entity.insertionPoint) {
          const pos = entity.position || entity.insertionPoint
          const geometry = new THREE.BoxGeometry(2, 2, 2)
          const textMaterial = new THREE.MeshBasicMaterial({ color: color })
          const cube = new THREE.Mesh(geometry, textMaterial)
          cube.position.set(pos.x, pos.y, pos.z || 0)
          return cube
        }
        break
        
      case 'POINT':
        // 点实体
        if (entity.position) {
          const geometry = new THREE.SphereGeometry(0.5, 8, 6)
          const pointMaterial = new THREE.MeshBasicMaterial({ color: color })
          const sphere = new THREE.Mesh(geometry, pointMaterial)
          sphere.position.set(entity.position.x, entity.position.y, entity.position.z || 0)
          return sphere
        }
        break
        
      case 'ELLIPSE':
        // 椭圆处理
        if (entity.center && entity.majorAxis && entity.minorAxis) {
          const radiusX = Math.sqrt(entity.majorAxis.x ** 2 + entity.majorAxis.y ** 2)
          const radiusY = entity.minorAxis || radiusX * 0.5
          const geometry = new THREE.EllipseCurve(
            0, 0,
            radiusX, radiusY,
            0, 2 * Math.PI,
            false,
            0
          )
          const points = geometry.getPoints(50)
          const ellipseGeometry = new THREE.BufferGeometry().setFromPoints(
            points.map(p => new THREE.Vector3(p.x, p.y, 0))
          )
          const ellipse = new THREE.Line(ellipseGeometry, material)
          ellipse.position.set(entity.center.x, entity.center.y, entity.center.z || 0)
          return ellipse
        }
        break
        
      default:
        // 对于不支持的实体类型，输出调试信息

        if (entity.position || entity.center || entity.insertionPoint) {
          const pos = entity.position || entity.center || entity.insertionPoint
          const geometry = new THREE.SphereGeometry(0.2, 4, 3)
          const unknownMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 })
          const point = new THREE.Mesh(geometry, unknownMaterial)
          point.position.set(pos.x, pos.y, pos.z || 0)
          return point
        }
        return null
    }
  } catch (error) {
    console.error('创建Three.js对象时出错:', error, entity)
    return null
  }
  
  return null
}

// 调整相机以适应模型
function fitCameraToModel() {

  
  if (!currentModel || currentModel.children.length === 0) {

    return
  }
  
  const box = new THREE.Box3().setFromObject(currentModel)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  

  
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim === 0) {

    return
  }
  
  const fov = camera.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
  
  // 确保相机距离不会太近或太远
  cameraZ = Math.max(cameraZ, maxDim)
  cameraZ = Math.min(cameraZ, maxDim * 10)
  
  const newCameraPos = {
    x: center.x + cameraZ,
    y: center.y + cameraZ,
    z: center.z + cameraZ
  }
  
 
  
  camera.position.set(newCameraPos.x, newCameraPos.y, newCameraPos.z)
  camera.lookAt(center)
  controls.target.copy(center)
  controls.update()
}

// 导出为JSON
function exportToJSON() {
  if (!dwgData.value) return
  
  const jsonData = JSON.stringify(dwgData.value, null, 2)
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = 'dwg-data.json'
  link.click()
  
  URL.revokeObjectURL(url)
}

// 清空视图
function clearViewer() {
  if (currentModel) {
    scene.remove(currentModel)
    currentModel = null
  }
  
  dwgData.value = null
  dwgInfo.value = null
  entities.value = []
  errorMessage.value = ''
  
  // 重置相机
  camera.position.set(100, 100, 100)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}
</script>

<style scoped>
.libredwg-demo {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  background: #2c3e50;
  color: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header h2 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.controls button {
  padding: 0.5rem 1rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.controls button:hover:not(:disabled) {
  background: #2980b9;
}

.controls button:disabled {
  background: #7f8c8d;
  cursor: not-allowed;
}

.content {
  flex: 1;
  display: flex;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
}

.viewer-section {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.viewer-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.three-container {
  flex: 1;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

.info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
}

.info-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.info-content {
  flex: 1;
}

.dwg-info {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.dwg-info p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.entities-list {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.entities-list h4 {
  margin: 0 0 1rem 0;
  color: #34495e;
  font-size: 1rem;
}

.entity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: #ecf0f1;
  border-radius: 4px;
  font-size: 0.8rem;
}

.entity-type {
  font-weight: bold;
  color: #2980b9;
}

.entity-layer {
  color: #7f8c8d;
}

.error-message {
  background: #e74c3c;
  color: white;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.error-message p {
  margin: 0;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .content {
    flex-direction: column;
  }
  
  .viewer-section {
    height: 60vh;
  }
  
  .info-section {
    height: 40vh;
  }
}
</style>