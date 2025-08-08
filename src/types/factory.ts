// 小车类型定义
export interface Cart {
  id: string
  gridX: number
  gridY: number
  status: 'idle' | 'moving' | 'loading' | 'delivering' | 'returning'
  cargo: Cargo | null
  speed: number
  path: GridPosition[]
  pathIndex: number
  element?: any,
  photo?: string,  // 小车照片URL
  remarks?: string // 备注信息
}

// 货物类型定义
export interface Cargo {
  id: string
  type: string
  weight?: number
  destination?: GridPosition
}

// 网格位置类型定义
export interface GridPosition {
  x: number
  y: number
}

// 设备类型定义
export interface Equipment {
  id: string
  name: string
  workshop: string
  currentProduction: number
  totalProduced: number
  maxProduction: number
  status: 'idle' | 'running' | 'maintenance' | 'error'
  gridX: number
  gridY: number
}

// 车间汇总类型定义
export interface WorkshopTotal {
  name: string
  currentProduction: number
  totalProduced: number
  maxProduction: number
  equipmentCount: number
  runningCount: number
}

// 配送任务类型定义
export interface Delivery {
  id: number
  type: string
  fromGridX: number
  fromGridY: number
  toGridX: number
  toGridY: number
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  assignedCart?: string
  priority?: number
  createdAt?: number
}

// 生产统计类型定义
export interface ProductionStats {
  totalProduced: number
  currentRate: number
  startTime: number | null
  duration: string
  efficiency: number
}

// 工厂配置类型定义
export interface FactoryConfig {
  gridSize: number
  cellSize: number
  svgWidth: number
  svgHeight: number
  maxCarts: number
  productionRate: number
}

// 动画配置类型定义
export interface AnimationConfig {
  frameRate: number
  cartSpeed: number
  productionInterval: number
  updateInterval: number
}