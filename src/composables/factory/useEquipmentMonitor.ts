import { ref, computed, watch } from 'vue'
import type { Equipment, WorkshopTotal } from '@/types/factory'

export function useEquipmentMonitor() {
  // 设备列表
  const equipmentList = ref<Equipment[]>([
    {
      id: 'eq1',
      name: '生产线A',
      workshop: '生产车间',
      currentProduction: 0,
      totalProduced: 0,
      maxProduction: 120, // 车间产量从60提升到120
      status: 'idle',
      gridX: 600,
      gridY: 100
    },
    {
      id: 'eq2',
      name: '生产线B',
      workshop: '生产车间',
      currentProduction: 0,
      totalProduced: 0,
      maxProduction: 160, // 车间产量从80提升到160
      status: 'idle',
      gridX: 800,
      gridY: 450
    },
    {
      id: 'eq3',
      name: '包装机',
      workshop: '包装车间',
      currentProduction: 0,
      totalProduced: 0,
      maxProduction: 80, // 车间产量从40提升到80
      status: 'idle',
      gridX: 700,
      gridY: 500
    },
    {
      id: 'eq4',
      name: '质检台',
      workshop: '质检车间',
      currentProduction: 0,
      totalProduced: 0,
      maxProduction: 100, // 车间产量从50提升到100
      status: 'idle',
      gridX: 750,
      gridY: 220
    }
  ])

  // 车间累计产量计算
  const workshopTotals = computed<WorkshopTotal[]>(() => {
    const totals: Record<string, WorkshopTotal> = {}

    equipmentList.value.forEach(equipment => {
      if (!totals[equipment.workshop]) {
        totals[equipment.workshop] = {
          name: equipment.workshop,
          currentProduction: 0,
          totalProduced: 0,
          maxProduction: 0,
          equipmentCount: 0,
          runningCount: 0
        }
      }

      const workshop = totals[equipment.workshop]
      workshop.currentProduction += equipment.currentProduction
      workshop.totalProduced += equipment.totalProduced
      workshop.maxProduction += equipment.maxProduction
      workshop.equipmentCount += 1

      if (equipment.status === 'running') {
        workshop.runningCount += 1
      }
    })

    return Object.values(totals)
  })

  // 启动设备生产
  function startEquipmentProduction() {
    equipmentList.value.forEach(equipment => {
      equipment.status = 'running'
      equipment.currentProduction = Math.floor(equipment.maxProduction * (0.7 + Math.random() * 0.3))
    })
  }

  // 停止设备生产
  function stopEquipmentProduction() {
    equipmentList.value.forEach(equipment => {
      equipment.status = 'idle'
      equipment.currentProduction = 0
    })
  }

  // 更新设备产量
  function updateEquipmentProduction() {
    equipmentList.value.forEach(equipment => {
      if (equipment.status === 'running') {
        // 每秒增加的产量 = 当前产量/60
        const increment = equipment.currentProduction / 60
        equipment.totalProduced += increment
      }
    })
  }

  // 重置设备产量
  function resetEquipmentProduction() {
    equipmentList.value.forEach(equipment => {
      equipment.totalProduced = 0
      equipment.currentProduction = 0
    })
  }

  // 获取设备效率
  function getEquipmentEfficiency(equipmentId: string): number {
    const equipment = equipmentList.value.find(eq => eq.id === equipmentId)
    if (!equipment || equipment.maxProduction === 0) return 0

    return (equipment.currentProduction / equipment.maxProduction) * 100
  }

  // 获取车间效率
  function getWorkshopEfficiency(workshopName: string): number {
    const workshop = workshopTotals.value.find(w => w.name === workshopName)
    if (!workshop || workshop.maxProduction === 0) return 0

    return (workshop.currentProduction / workshop.maxProduction) * 100
  }

  // 设备状态变更监听
  function onEquipmentStatusChange(callback: (equipment: Equipment) => void) {
    watch(
      () => equipmentList.value.map(eq => ({ id: eq.id, status: eq.status })),
      (newStatuses, oldStatuses) => {
        if (oldStatuses) {
          newStatuses.forEach((newStatus, index) => {
            const oldStatus = oldStatuses[index]
            if (newStatus.status !== oldStatus?.status) {
              const equipment = equipmentList.value.find(eq => eq.id === newStatus.id)
              if (equipment) {
                callback(equipment)
              }
            }
          })
        }
      },
      { deep: true }
    )
  }

  return {
    // 状态
    equipmentList,
    workshopTotals,

    // 方法
    startEquipmentProduction,
    stopEquipmentProduction,
    updateEquipmentProduction,
    resetEquipmentProduction,
    getEquipmentEfficiency,
    getWorkshopEfficiency,
    onEquipmentStatusChange
  }
}