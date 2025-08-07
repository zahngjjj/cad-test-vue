import { ref, type Ref } from 'vue'
import type { Cart, Equipment } from '@/types/factory'

export function useFactoryAnimation(
    carts: Ref<Cart[]>,
    equipmentList: Ref<Equipment[]>,
    updateCartPositionsCallback?: () => void // 添加这个参数
) {
    // 动画状态
    const isAnimating = ref(false)
    const animationFrame = ref<number>()
    const lastUpdateTime = ref(0)

    // 动画配置
    const config = {
        frameRate: 60,
        updateInterval: 1000 / 60, // 60 FPS
        cartUpdateInterval: 100, // 小车位置更新间隔
        productionUpdateInterval: 1000 // 生产数据更新间隔
    }

    // 上次更新时间记录
    let lastCartUpdate = 0
    let lastProductionUpdate = 0

    // 动画循环
    function animationLoop(currentTime: number) {
        if (!isAnimating.value) return

        const deltaTime = currentTime - lastUpdateTime.value
        lastUpdateTime.value = currentTime

        // 更新小车位置
        if (currentTime - lastCartUpdate >= config.cartUpdateInterval) {
            updateCartPositions()
            updateCartVisuals()
            lastCartUpdate = currentTime
        }

        // 更新生产数据
        if (currentTime - lastProductionUpdate >= config.productionUpdateInterval) {
            updateProductionVisuals()
            lastProductionUpdate = currentTime
        }

        // 请求下一帧
        animationFrame.value = requestAnimationFrame(animationLoop)
    }

    // 更新小车位置
    // 更新小车位置
    function updateCartPositions() {
        // 调用传入的位置更新函数
        if (updateCartPositionsCallback) {
            updateCartPositionsCallback()
        }
    
        carts.value.forEach(cart => {
            if ((cart.status === 'moving' || cart.status === 'returning') && cart.path.length > 0) {
                updateCartElement(cart)
            }
        })
    }


    // 更新小车视觉效果
    function updateCartVisuals() {
        carts.value.forEach(cart => {
            const element = document.getElementById(`cart-${cart.id}`)
            if (!element) return

            // 更新小车颜色和状态
            const cartRect = element.querySelector('rect')
            const gpsCircle = element.querySelector('.gps-accuracy')

            if (cartRect) {
                switch (cart.status) {
                    case 'idle':
                        cartRect.setAttribute('fill', '#2196f3')
                        break
                    case 'moving':
                        cartRect.setAttribute('fill', '#4caf50')
                        break
                    case 'loading':
                        cartRect.setAttribute('fill', '#ff9800')
                        break
                    case 'delivering':
                        cartRect.setAttribute('fill', '#9c27b0')
                        break
                    case 'returning':
                        cartRect.setAttribute('fill', '#e91e63')
                        break
                }
            }

            // GPS精度圆圈动画
            if (gpsCircle && cart.status === 'moving') {
                const currentOpacity = parseFloat(gpsCircle.getAttribute('opacity') || '0.6')
                const newOpacity = 0.3 + Math.sin(Date.now() / 500) * 0.3
                gpsCircle.setAttribute('opacity', newOpacity.toString())
            }

            // 货物指示器
            const cargoIndicator = element.querySelector('.cargo-indicator')
            if (cargoIndicator) {
                cargoIndicator.style.display = cart.cargo ? 'block' : 'none'
            }

            // 更新坐标显示
            const coordsText = element.querySelector('.grid-coords')
            if (coordsText) {
                coordsText.textContent = `(${Math.round(cart.gridX)}, ${Math.round(cart.gridY)})`
            }
        })
    }

    // 更新单个小车元素
    function updateCartElement(cart: Cart) {
        const element = document.getElementById(`cart-${cart.id}`)
        if (!element) return

        // 计算SVG坐标
        const GRID_SIZE = 1000
        const containerRect = element.closest('.factory-layout')?.getBoundingClientRect()
        if (!containerRect) return

        const SVG_WIDTH = containerRect.width
        const SVG_HEIGHT = containerRect.height

        const svgX = (cart.gridX / (GRID_SIZE - 1)) * SVG_WIDTH
        const svgY = (cart.gridY / (GRID_SIZE - 1)) * SVG_HEIGHT

        // 平滑移动
        element.style.transition = 'transform 0.1s ease-out'
        element.setAttribute('transform', `translate(${svgX}, ${svgY})`)
    }

    // 更新生产视觉效果
    function updateProductionVisuals() {
        equipmentList.value.forEach(equipment => {
            const indicator = document.querySelector(`#equipment-${equipment.id} .production-indicator`)
            if (indicator) {
                if (equipment.status === 'running') {
                    indicator.style.display = 'block'
                    // 闪烁效果
                    const opacity = 0.5 + Math.sin(Date.now() / 300) * 0.5
                    indicator.setAttribute('opacity', opacity.toString())
                } else {
                    indicator.style.display = 'none'
                }
            }
        })
    }

    // 开始动画
    function startAnimation() {
        if (isAnimating.value) return

        isAnimating.value = true
        lastUpdateTime.value = performance.now()
        lastCartUpdate = 0
        lastProductionUpdate = 0

        animationFrame.value = requestAnimationFrame(animationLoop)
        console.log('动画已启动')
    }

    // 停止动画
    function stopAnimation() {
        if (!isAnimating.value) return

        isAnimating.value = false

        if (animationFrame.value) {
            cancelAnimationFrame(animationFrame.value)
        }

        console.log('动画已停止')
    }

    // 暂停/恢复动画
    function toggleAnimation() {
        if (isAnimating.value) {
            stopAnimation()
        } else {
            startAnimation()
        }
    }

    // 设置动画帧率
    function setFrameRate(fps: number) {
        config.frameRate = Math.max(1, Math.min(120, fps))
        config.updateInterval = 1000 / config.frameRate
    }

    return {
        // 状态
        isAnimating,

        // 方法
        startAnimation,
        stopAnimation,
        toggleAnimation,
        setFrameRate,
        updateCartElement
    }
}