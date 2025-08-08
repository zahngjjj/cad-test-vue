import type { Cart, GridPosition, Cargo } from '@/types/factory'

export class GridCart implements Cart {
  id: string
  gridX: number
  gridY: number
  status: 'idle' | 'moving' | 'loading' | 'delivering' | 'returning'
  cargo: Cargo | null
  speed: number
  path: GridPosition[]
  pathIndex: number
  element?: any
  photo?: string    // 新增
  remarks?: string  // 新增
  
  constructor(id: string, gridX: number, gridY: number) {
    this.id = id
    this.gridX = gridX
    this.gridY = gridY
    this.status = 'idle'
    this.cargo = null
    this.speed = 1 // 格/秒
    this.path = []
    this.pathIndex = 0
    this.photo = undefined
    this.remarks = undefined
  }
  
  // 移动到目标网格位置
  moveToGrid(targetGridX: number, targetGridY: number): boolean {
    const dx = targetGridX - this.gridX
    const dy = targetGridY - this.gridY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > this.speed) {
      this.gridX += (dx / distance) * this.speed
      this.gridY += (dy / distance) * this.speed
      return false // 未到达
    } else {
      this.gridX = targetGridX
      this.gridY = targetGridY
      return true // 已到达
    }
  }
  
  // 沿路径移动
  moveAlongPath(): boolean {
    if (this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex]
      if (this.moveToGrid(target.x, target.y)) {
        this.pathIndex++
      }
      return this.pathIndex < this.path.length
    }
    return false
  }
  
  // 设置网格路径
  setGridPath(path: GridPosition[]): void {
    this.path = [...path]
    this.pathIndex = 0
  }
  
  // 添加路径点
  addPathPoint(point: GridPosition): void {
    this.path.push(point)
  }
  
  // 清除路径
  clearPath(): void {
    this.path = []
    this.pathIndex = 0
  }
  
  // 获取当前目标点
  getCurrentTarget(): GridPosition | null {
    if (this.pathIndex < this.path.length) {
      return this.path[this.pathIndex]
    }
    return null
  }
  
  // 获取剩余路径长度
  getRemainingDistance(): number {
    if (this.pathIndex >= this.path.length) return 0
    
    let distance = 0
    let currentX = this.gridX
    let currentY = this.gridY
    
    for (let i = this.pathIndex; i < this.path.length; i++) {
      const target = this.path[i]
      const dx = target.x - currentX
      const dy = target.y - currentY
      distance += Math.sqrt(dx * dx + dy * dy)
      currentX = target.x
      currentY = target.y
    }
    
    return distance
  }
  
  // 网格坐标转SVG坐标
  getSVGPosition(gridSize: number = 1000, svgWidth: number = 1000, svgHeight: number = 600): GridPosition {
    return {
      x: (this.gridX / (gridSize - 1)) * svgWidth,
      y: (this.gridY / (gridSize - 1)) * svgHeight
    }
  }
  
  // 装载货物
  loadCargo(cargo: Cargo): void {
    this.cargo = cargo
    this.status = 'loading'
  }
  
  // 卸载货物
  unloadCargo(): Cargo | null {
    const cargo = this.cargo
    this.cargo = null
    return cargo
  }
  
  // 检查是否有货物
  hasCargo(): boolean {
    return this.cargo !== null
  }
  
  // 重置小车状态
  reset(): void {
    this.status = 'idle'
    this.cargo = null
    this.clearPath()
  }
  
  // 获取小车信息
  getInfo(): string {
    return `小车 ${this.id}: 位置(${Math.round(this.gridX)}, ${Math.round(this.gridY)}), 状态: ${this.status}, 货物: ${this.cargo ? this.cargo.type : '无'}`
  }
}