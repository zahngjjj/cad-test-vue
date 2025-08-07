import type { GridPosition, Cart, Equipment } from '@/types/factory'

// 计算两点之间的距离
export function calculateDistance(point1: GridPosition, point2: GridPosition): number {
  const dx = point2.x - point1.x
  const dy = point2.y - point1.y
  return Math.sqrt(dx * dx + dy * dy)
}

// 生成路径点
export function generatePath(start: GridPosition, end: GridPosition, obstacles: GridPosition[] = []): GridPosition[] {
  // 简单的直线路径，可以扩展为A*算法
  const path: GridPosition[] = []
  
  const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y))
  
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 1 : i / steps
    const x = Math.round(start.x + (end.x - start.x) * t)
    const y = Math.round(start.y + (end.y - start.y) * t)
    path.push({ x, y })
  }
  
  return path
}

// 检查位置是否被占用
export function isPositionOccupied(position: GridPosition, carts: Cart[], equipment: Equipment[]): boolean {
  // 检查小车占用
  for (const cart of carts) {
    if (Math.round(cart.gridX) === position.x && Math.round(cart.gridY) === position.y) {
      return true
    }
  }
  
  // 检查设备占用
  for (const eq of equipment) {
    if (eq.gridX === position.x && eq.gridY === position.y) {
      return true
    }
  }
  
  return false
}

// 查找最近的空闲位置
export function findNearestFreePosition(
  target: GridPosition, 
  carts: Cart[], 
  equipment: Equipment[], 
  maxRadius: number = 10
): GridPosition | null {
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const position = { x: target.x + dx, y: target.y + dy }
          
          // 检查边界
          if (position.x >= 0 && position.x < 1000 && position.y >= 0 && position.y < 1000) {
            if (!isPositionOccupied(position, carts, equipment)) {
              return position
            }
          }
        }
      }
    }
  }
  
  return null
}

// 网格坐标转SVG坐标
export function gridToSVG(
  gridPos: GridPosition, 
  gridSize: number = 1000, 
  svgWidth: number = 1000, 
  svgHeight: number = 600
): GridPosition {
  return {
    x: (gridPos.x / (gridSize - 1)) * svgWidth,
    y: (gridPos.y / (gridSize - 1)) * svgHeight
  }
}

// SVG坐标转网格坐标
export function svgToGrid(
  svgPos: GridPosition, 
  gridSize: number = 1000, 
  svgWidth: number = 1000, 
  svgHeight: number = 600
): GridPosition {
  return {
    x: Math.round((svgPos.x / svgWidth) * (gridSize - 1)),
    y: Math.round((svgPos.y / svgHeight) * (gridSize - 1))
  }
}

// 格式化时间
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}时${minutes}分${secs}秒`
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`
  } else {
    return `${secs}秒`
  }
}

// 生成唯一ID
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `${prefix}${timestamp}${random}`
}

// 限制数值范围
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// 线性插值
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

// 计算效率百分比
export function calculateEfficiency(current: number, max: number): number {
  if (max === 0) return 0
  return Math.round((current / max) * 100)
}