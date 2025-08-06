# .

这个dome主要是为了探寻如何打开cad文件,预览,交互等功能.

## 主要思路

### 1.第三方库 
1.CAD梦想画图官网 https://help.mxdraw.com
  开发文档:https://mxcad.github.io/mxcad_docs/zh/docs/1.Start/2.QuickGetStart.html
  demo: https://demo.mxdraw3d.com:3000/mxcad/

2.唯杰地图 https://vjmap.com/
  demo: https://vjmap.com/demo/#/gallery/map


### 2.集成Three.js + DXF解析库
 1.支持基本的缩放、旋转、测量功能
  推荐的技术栈组合:
  1.1 Three.js + dxf-parser + dxf-writer

    npm install three dxf-parser dxf-writer three-dxf-loader
    npm install --save-dev @types/three


### 3.libredwg
 简介: libredwg是一个自由的C语言库，旨在读取和写入DWG文件。
 1.支持打开dwg文件
 2.支持dwg文件的解析
 3.支持dwg文件的渲染

### 4.libredwg-web
简介:这是一个基于 libredwg 的 DWG/DXF JavaScript 解析器。它可在浏览器和 Node.js 环境中使用.
可以在浏览器中直接解析dwg文件
项目地址: https://github.com/mlight-lee/libredwg-web
1. 经测试 ,不好用 ,只能打开不能放大缩小等操作

### 5.国外的ODA组件来读取dwg文件


### 6.后端转换 + 前端渲染
 后端使用 FreeCAD Python API 或 OpenCASCADE
 转换为 JSON/glTF 格式传输给前端
 前端使用 Three.js 渲染 JSON/glTF 文件


### 7.LibreDWG + Canvas 2D
对于大型2D DWG文件，建议：
1.分层渲染 ：按图层分组渲染，支持图层开关
2.视口裁剪 ：只渲染可见区域内的实体
3.LOD优化 ：根据缩放级别调整细节程度
4.缓存机制 ：缓存解析结果和渲染数据


### 8.0  其他流程图方案, 这重点不在于CAD，在于模拟生产
https://gojs.net/latest/samples/processFlow.html