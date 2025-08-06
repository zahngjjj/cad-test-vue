<template>
  <div class="cad-viewer">
    <div ref="container" class="viewer-container"></div>
    <div class="controls">
      <input type="file" @change="loadFile" accept=".dxf,.dwg" />
      <button @click="exportDXF">导出DXF</button>
      <button @click="resetView">重置视图</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import DxfParser from 'dxf-parser'
import DxfWriter from 'dxf-writer'

const container = ref<HTMLElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let currentModel: THREE.Group

onMounted(() => {
  initThreeJS()
})

onUnmounted(() => {
  if (renderer) {
    renderer.dispose()
  }
})

function initThreeJS() {
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    container.value!.clientWidth / container.value!.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 10)

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  container.value!.appendChild(renderer.domElement)

  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.25

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  // 开始渲染循环
  animate()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (file.name.toLowerCase().endsWith('.dxf')) {
      parseDXF(content)
    } else if (file.name.toLowerCase().endsWith('.dwg')) {
      // DWG文件需要特殊处理
      alert('DWG文件支持需要额外的库，建议先转换为DXF格式')
    }
  }
  reader.readAsText(file)
}

function parseDXF(dxfContent: string) {
  try {
    const parser = new DxfParser()
    const dxf = parser.parseSync(dxfContent)
    
    // 清除之前的模型
    if (currentModel) {
      scene.remove(currentModel)
    }
    
    currentModel = new THREE.Group()
    
    // 解析实体
    dxf.entities.forEach((entity: any) => {
      const geometry = createGeometryFromEntity(entity)
      if (geometry) {
        currentModel.add(geometry)
      }
    })
    
    scene.add(currentModel)
    
    // 调整相机位置以适应模型
    fitCameraToModel()
    
  } catch (error) {
    console.error('DXF解析错误:', error)
    alert('DXF文件解析失败')
  }
}

function createGeometryFromEntity(entity: any): THREE.Object3D | null {
  const material = new THREE.LineBasicMaterial({ 
    color: entity.color || 0x000000 
  })
  
  switch (entity.type) {
    case 'LINE':
      // 添加安全检查
      if (!entity.start || !entity.end || 
          typeof entity.start.x === 'undefined' || typeof entity.start.y === 'undefined' ||
          typeof entity.end.x === 'undefined' || typeof entity.end.y === 'undefined') {
        console.warn('LINE实体缺少必要的坐标信息:', entity)
        return null
      }
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(entity.start.x, entity.start.y, entity.start.z || 0),
        new THREE.Vector3(entity.end.x, entity.end.y, entity.end.z || 0)
      ])
      return new THREE.Line(lineGeometry, material)
      
    case 'CIRCLE':
      // 添加安全检查
      if (!entity.center || typeof entity.center.x === 'undefined' || 
          typeof entity.center.y === 'undefined' || typeof entity.radius === 'undefined') {
        console.warn('CIRCLE实体缺少必要的信息:', entity)
        return null
      }
      const circleGeometry = new THREE.CircleGeometry(entity.radius, 32)
      const circle = new THREE.Line(circleGeometry, material)
      circle.position.set(entity.center.x, entity.center.y, entity.center.z || 0)
      return circle
      
    case 'ARC':
      // 添加安全检查
      if (!entity.center || typeof entity.center.x === 'undefined' || 
          typeof entity.center.y === 'undefined' || typeof entity.radius === 'undefined' ||
          typeof entity.startAngle === 'undefined' || typeof entity.endAngle === 'undefined') {
        console.warn('ARC实体缺少必要的信息:', entity)
        return null
      }
      const arcGeometry = new THREE.CircleGeometry(
        entity.radius, 
        32, 
        entity.startAngle, 
        entity.endAngle - entity.startAngle
      )
      const arc = new THREE.Line(arcGeometry, material)
      arc.position.set(entity.center.x, entity.center.y, entity.center.z || 0)
      return arc
      
    case 'POLYLINE':
    case 'LWPOLYLINE':
      // 添加安全检查
      if (!entity.vertices || !Array.isArray(entity.vertices) || entity.vertices.length === 0) {
        console.warn('POLYLINE实体缺少顶点信息:', entity)
        return null
      }
      
      // 过滤掉无效的顶点
      const validVertices = entity.vertices.filter((vertex: any) => 
        vertex && typeof vertex.x !== 'undefined' && typeof vertex.y !== 'undefined'
      )
      
      if (validVertices.length === 0) {
        console.warn('POLYLINE实体没有有效的顶点:', entity)
        return null
      }
      
      const points = validVertices.map((vertex: any) => 
        new THREE.Vector3(vertex.x, vertex.y, vertex.z || 0)
      )
      const polylineGeometry = new THREE.BufferGeometry().setFromPoints(points)
      return new THREE.Line(polylineGeometry, material)
      
    default:
      console.warn('不支持的实体类型:', entity.type)
      return null
  }
}

function fitCameraToModel() {
  if (!currentModel) return
  
  const box = new THREE.Box3().setFromObject(currentModel)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
  
  camera.position.set(center.x, center.y, center.z + cameraZ * 1.5)
  camera.lookAt(center)
  controls.target.copy(center)
  controls.update()
}

function exportDXF() {
  if (!currentModel) {
    alert('没有可导出的模型')
    return
  }
  
  const writer = new DxfWriter()
  
  // 遍历模型并添加到DXF
  currentModel.traverse((object) => {
    if (object instanceof THREE.Line) {
      const geometry = object.geometry
      const positions = geometry.attributes.position.array
      
      // 简单的线段导出示例
      for (let i = 0; i < positions.length - 3; i += 6) {
        writer.addLine(
          positions[i], positions[i + 1], positions[i + 2],
          positions[i + 3], positions[i + 4], positions[i + 5]
        )
      }
    }
  })
  
  const dxfContent = writer.toDxfString()
  downloadFile(dxfContent, 'exported.dxf', 'text/plain')
}

function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function resetView() {
  if (currentModel) {
    fitCameraToModel()
  } else {
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    controls.target.set(0, 0, 0)
    controls.update()
  }
}
</script>

<style scoped>
.cad-viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.viewer-container {
  flex: 1;
  position: relative;
}

.controls {
  padding: 10px;
  background: #f5f5f5;
  display: flex;
  gap: 10px;
  align-items: center;
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