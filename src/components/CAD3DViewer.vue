<template>
  <div class="cad-3d-viewer">
    <div class="controls">
      <input type="file" @change="loadCADFile" accept=".dwg,.dxf" />
      <button @click="resetView">重置视图</button>
      <button @click="exportImage">导出图片</button>
    </div>
    <div ref="containerRef" class="viewer-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'

const containerRef = ref<HTMLDivElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let libredwg: LibreDwg

onMounted(async () => {
  await initLibreDWG()
  initThreeJS()
  animate()
})

async function initLibreDWG() {
  libredwg = new LibreDwg()
  await libredwg.init()
}

function initThreeJS() {
  if (!containerRef.value) return
  
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)
  
  // 创建相机
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(10, 10, 10)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  
  // 添加到容器
  containerRef.value.appendChild(renderer.domElement)
  
  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)
  
  // 添加网格
  const gridHelper = new THREE.GridHelper(100, 100)
  scene.add(gridHelper)
  
  // 添加坐标轴
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
}

async function loadCADFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !libredwg) return
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // 解析 CAD 文件
    const dwg = libredwg.dwg_read_data(uint8Array, Dwg_File_Type.DWG)
    if (!dwg) throw new Error('无法解析 CAD 文件')
    
    const db = libredwg.convert(dwg)
    
    // 清除之前的模型
    clearScene()
    
    // 渲染 3D 模型
    render3DModel(db)
    
    // 调整相机视图
    fitCameraToModel()
    
    libredwg.dwg_free(dwg)
  } catch (error) {
    console.error('CAD 文件加载失败:', error)
  }
}

function render3DModel(db: any) {
  if (!db.entities) return
  
  const group = new THREE.Group()
  
  db.entities.forEach((entity: any) => {
    const object = createThreeObjectFromEntity(entity)
    if (object) {
      group.add(object)
    }
  })
  
  scene.add(group)
}

// 修复 EllipseCurve 的使用方式
function createThreeObjectFromEntity(entity: any): THREE.Object3D | null {
  const material = new THREE.LineBasicMaterial({ 
    color: entity.color || 0x000000
    // 注意：linewidth 在 WebGL 中可能不起作用，移除这个属性
  })
  
  switch (entity.type) {
    case 'LINE':
      if (entity.start && entity.end) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(entity.start.x, entity.start.y, entity.start.z || 0),
          new THREE.Vector3(entity.end.x, entity.end.y, entity.end.z || 0)
        ])
        return new THREE.Line(geometry, material)
      }
      break
      
    case 'CIRCLE':
      if (entity.center && entity.radius) {
        const geometry = new THREE.RingGeometry(entity.radius - 0.1, entity.radius + 0.1, 32)
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: entity.color || 0x000000 }))
        mesh.position.set(entity.center.x, entity.center.y, entity.center.z || 0)
        return mesh
      }
      break
      
    case 'ARC':
      if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
        // 修复 EllipseCurve 的使用
        const curve = new THREE.EllipseCurve(
          0, 0, // 相对于中心点的偏移
          entity.radius, entity.radius,
          entity.startAngle, entity.endAngle,
          false, 0
        )
        const points = curve.getPoints(50)
        const geometry = new THREE.BufferGeometry().setFromPoints(
          points.map(p => new THREE.Vector3(
            p.x + entity.center.x, 
            p.y + entity.center.y, 
            entity.center.z || 0
          ))
        )
        return new THREE.Line(geometry, material)
      }
      break
  }
  
  return null
}

function clearScene() {
  const objectsToRemove = scene.children.filter(child => 
    !(child instanceof THREE.GridHelper) && 
    !(child instanceof THREE.AxesHelper) &&
    !(child instanceof THREE.Light)
  )
  
  objectsToRemove.forEach(object => {
    scene.remove(object)
  })
}

function fitCameraToModel() {
  const box = new THREE.Box3().setFromObject(scene)
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

function resetView() {
  camera.position.set(10, 10, 10)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}

function exportImage() {
  const link = document.createElement('a')
  link.download = 'cad-3d-view.png'
  link.href = renderer.domElement.toDataURL()
  link.click()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

onUnmounted(() => {
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.cad-3d-viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.controls {
  padding: 10px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.controls button {
  margin-left: 10px;
  padding: 5px 15px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #0056b3;
}

.viewer-container {
  flex: 1;
  position: relative;
}
</style>