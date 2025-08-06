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
    .attr('opacity', 1) // 设置透明度
  
  // 添加背景矩形
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'url(#backgroundPattern)')
  
  // 创建节点数据
  const nodes = [
    { id: 'tank1', x: 100, y: 200, type: 'tank', label: '原料罐' },
    { id: 'valve1', x: 250, y: 200, type: 'valve', label: '控制阀' },
    { id: 'reactor', x: 400, y: 200, type: 'reactor', label: '反应器' },
    { id: 'pump1', x: 550, y: 200, type: 'pump', label: '出料泵' }
  ]
  
  // 创建连接数据
  const links = [
    { source: 'tank1', target: 'valve1' },
    { source: 'valve1', target: 'reactor' },
    { source: 'reactor', target: 'pump1' }
  ]
  
  // 绘制连接线
  svg.selectAll('.link')
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
  
  // 创建单个粒子，沿着整个路径移动
  const particle = svg.append('circle')
    .attr('class', 'particle')
    .attr('r', 6)
    .attr('fill', '#ff4444')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2)
    .attr('cx', nodes[0].x) // 从第一个节点开始
    .attr('cy', nodes[0].y)
  
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
              moveToNext() // 移动到下一段
            })
        }
      } else {
        // 动画完成后，可以选择隐藏粒子或保持在最后位置
        // particle
        //   .transition()
        //   .duration(500)
        //   .attr('opacity', 0) // 淡出效果
        //   .remove() // 移除粒子

          particle
        .transition()
        .duration(300)
        .attr('r', 8) // 稍微放大
        .transition()
        .duration(300)
        .attr('r', 6) // 恢复原大小
      }
    }
    
    // 开始动画
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
</style>