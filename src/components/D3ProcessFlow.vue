<template>
  <div class="d3-process-flow">
    <svg ref="svgRef" width="800" height="600"></svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as d3 from 'd3'
// 导入背景图片
import bgImage from '../static/image/bg.png'

const svgRef = ref<SVGElement>()

onMounted(() => {
  if (!svgRef.value) return
  
  const svg = d3.select(svgRef.value)
  const width = 800
  const height = 600
  
  // 添加背景图片
  svg.append('defs')
    .append('pattern')
    .attr('id', 'backgroundPattern')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', width)
    .attr('height', height)
    .append('image')
    .attr('href', bgImage)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .attr('opacity', 1)
  
  // 添加背景矩形
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'url(#backgroundPattern)')
  
  // 创建节点数据
  const nodes = [
    { id: 'tank1', x: 100, y: 200, type: 'tank', label: '原料罐' },
    { id: 'valve1', x: 250, y: 300, type: 'valve', label: '控制阀' },
    { id: 'reactor', x: 400, y: 260, type: 'reactor', label: '反应器' },
    { id: 'pump1', x: 550, y: 400, type: 'pump', label: '出料泵' }
  ]
  
  // 创建连接数据
  const links = [
    { source: 'tank1', target: 'valve1' },
    { source: 'valve1', target: 'reactor' },
    { source: 'reactor', target: 'pump1' }
  ]
  
  // 绘制虚线连接线
  const linkElements = svg.selectAll('.link')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('x1', d => nodes.find(n => n.id === d.source)?.x || 0)
    .attr('y1', d => nodes.find(n => n.id === d.source)?.y || 0)
    .attr('x2', d => nodes.find(n => n.id === d.target)?.x || 0)
    .attr('y2', d => nodes.find(n => n.id === d.target)?.y || 0)
    .attr('stroke', '#0066cc')
    .attr('stroke-width', 4)
    .attr('stroke-dasharray', '10,5') // 设置虚线样式：10px实线，5px空白
    .attr('stroke-dashoffset', 0) // 初始偏移为0
  
  // 添加虚线流动动画
  function animateDashedLines() {
    linkElements
      .transition()
      .duration(2000) // 2秒完成一个循环
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', -15) // 负值表示向前移动
      .on('end', function() {
        // 重置偏移并重新开始动画
        d3.select(this).attr('stroke-dashoffset', 0)
        animateDashedLines() // 递归调用，创建无限循环
      })
  }
  
  // 延迟500ms后开始虚线动画
  setTimeout(animateDashedLines, 500)
  
  // 创建单个粒子，沿着整个路径移动
  const particle = svg.append('circle')
    .attr('class', 'particle')
    .attr('r', 6)
    .attr('fill', '#ff4444')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2)
    .attr('cx', nodes[0].x)
    .attr('cy', nodes[0].y)
  
  // 可控制的粒子动画参数
  const animationConfig = {
    moveDuration: 6000,    // 运动持续时间（毫秒）
    pauseDuration: 3000,   // 停顿持续时间（毫秒）
    segmentDuration: 1000, // 每段路径的运动时间
    autoRestart: true      // 是否自动重新开始
  }
  
  let animationState = {
    isRunning: false,
    currentIndex: 0,
    isPaused: false
  }
  
  // 可控制的粒子动画函数
  function animateParticleWithControl() {
    animationState.isRunning = true
    animationState.currentIndex = 0
    
    // 重置粒子位置到起始点
    particle
      .attr('cx', nodes[0].x)
      .attr('cy', nodes[0].y)
      .attr('opacity', 1)
    
    function moveToNextSegment() {
      if (animationState.currentIndex < links.length && animationState.isRunning) {
        const link = links[animationState.currentIndex]
        const targetNode = nodes.find(n => n.id === link.target)
        
        if (targetNode) {
          console.log(`开始移动到第 ${animationState.currentIndex + 1} 段路径`)
          
          particle
            .transition()
            .duration(animationConfig.segmentDuration)
            .ease(d3.easeLinear)
            .attr('cx', targetNode.x)
            .attr('cy', targetNode.y)
            .on('end', () => {
              animationState.currentIndex++
              
              // 运动1秒后停顿
              if (animationState.currentIndex < links.length) {
                console.log(`停顿 ${animationConfig.pauseDuration}ms`)
                animationState.isPaused = true
                
                // 停顿期间粒子闪烁效果
                const blinkInterval = setInterval(() => {
                  if (!animationState.isPaused) {
                    clearInterval(blinkInterval)
                    return
                  }
                  particle
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.3)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1)
                }, 400)
                
                // 3秒后继续运动
                setTimeout(() => {
                  animationState.isPaused = false
                  clearInterval(blinkInterval)
                  particle.attr('opacity', 1)
                  moveToNextSegment()
                }, animationConfig.pauseDuration)
              } else {
                // 到达终点
                console.log('粒子到达终点')
                animationState.isRunning = false
                
                // 终点闪烁效果
                particle
                  .transition()
                  .duration(300)
                  .attr('r', 10)
                  .transition()
                  .duration(300)
                  .attr('r', 6)
                
                // 如果设置了自动重启，5秒后重新开始
                if (animationConfig.autoRestart) {
                  setTimeout(() => {
                    console.log('重新开始动画')
                    animateParticleWithControl()
                  }, 5000)
                }
              }
            })
        }
      }
    }
    
    // 开始第一段移动
    moveToNextSegment()
  }
  
  // 控制函数
  const particleControls = {
    // 开始动画
    start() {
      if (!animationState.isRunning) {
        console.log('手动开始粒子动画')
        animateParticleWithControl()
      }
    },
    
    // 停止动画
    stop() {
      console.log('停止粒子动画')
      animationState.isRunning = false
      animationState.isPaused = false
      particle.interrupt() // 中断当前动画
    },
    
    // 重置到起始位置
    reset() {
      this.stop()
      particle
        .attr('cx', nodes[0].x)
        .attr('cy', nodes[0].y)
        .attr('opacity', 1)
        .attr('r', 6)
      animationState.currentIndex = 0
      console.log('重置粒子位置')
    },
    
    // 设置动画参数
    setConfig(newConfig) {
      Object.assign(animationConfig, newConfig)
      console.log('更新动画配置:', animationConfig)
    }
  }
  
  // 将控制函数暴露到全局（用于调试）
  ;(window as any).particleControls = particleControls
  
  // 延迟1秒后自动开始动画
  setTimeout(() => {
    particleControls.start()
  }, 1000)

  // 单次粒子动画，沿着所有连接线移动
  function animateParticleOnce() {
    let currentIndex = 0
    
    function moveToNext() {
      if (currentIndex < links.length) {
        const link = links[currentIndex]
        const targetNode = nodes.find(n => n.id === link.target)
        
        if (targetNode) {
          particle
            .transition()
            .duration(2000) // 每段2秒
            .ease(d3.easeLinear)
            .attr('cx', targetNode.x)
            .attr('cy', targetNode.y)
            .on('end', () => {
              currentIndex++
              moveToNext()
            })
        }
      } else {
        // 动画完成后保持在最后位置并闪烁
        particle
          .transition()
          .duration(300)
          .attr('r', 8)
          .transition()
          .duration(300)
          .attr('r', 6)
      }
    }
    
    moveToNext()
  }
  
  // 延迟1秒后开始粒子动画
  setTimeout(animateParticleOnce, 1000)

  // 绘制节点
  const nodeGroups = svg.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
  
  // 根据类型绘制不同的节点
  nodeGroups.each(function(d) {
    const group = d3.select(this)
    
    switch(d.type) {
      case 'tank':
        group.append('rect')
          .attr('width', 60)
          .attr('height', 80)
          .attr('x', -30)
          .attr('y', -40)
          .attr('fill', '#e0e0e0')
          .attr('stroke', '#333')
          .attr('stroke-width', 2)
        break
        
      case 'valve':
        group.append('polygon')
          .attr('points', '-20,-20 20,-20 20,20 -20,20')
          .attr('fill', '#4CAF50')
          .attr('stroke', '#333')
          .attr('stroke-width', 2)
          .attr('transform', 'rotate(45)')
        break
        
      case 'reactor':
        group.append('circle')
          .attr('r', 40)
          .attr('fill', '#FF9800')
          .attr('stroke', '#333')
          .attr('stroke-width', 2)
        break
        
      case 'pump':
        group.append('circle')
          .attr('r', 25)
          .attr('fill', '#2196F3')
          .attr('stroke', '#333')
          .attr('stroke-width', 2)
        break
    }
    
    // 添加标签
    group.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 50)
      .attr('font-size', '12px')
      .text(d.label)
  })
})
</script>

<style scoped>
.d3-process-flow {
  width: 100%;
  height: 600px;
  background: #f9f9f9;
}

.particle {
  filter: drop-shadow(0 0 4px rgba(255, 68, 68, 0.6));
}

/* 可选：为虚线添加额外的视觉效果 */
.link {
  transition: stroke-width 0.3s ease;
}

.link:hover {
  stroke-width: 6px;
  cursor: pointer;
}
</style>