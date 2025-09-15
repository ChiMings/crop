# 粮食保管损耗报告单生成系统 - Linux桌面版

## 优势对比

### 🎯 解决的浏览器兼容性问题

| 问题类型 | 浏览器环境 | Electron环境 |
|---------|-----------|-------------|
| **渲染引擎** | 各浏览器不同 | ✅ 统一Chromium |
| **设备像素比** | 设备差异大 | ✅ 固定控制 |
| **字体渲染** | 系统差异 | ✅ 一致渲染 |
| **CSS支持** | 版本差异 | ✅ 固定版本 |
| **截图质量** | 不可控 | ✅ 高质量控制 |
| **文件保存** | 下载限制 | ✅ 原生文件对话框 |

### 🚀 Electron版本特性

- **高质量截图**: 3倍分辨率，95%质量的JPEG输出
- **原生文件对话框**: 直接保存到指定位置，无需手动移动文件
- **统一渲染**: 所有用户获得完全相同的输出结果
- **键盘快捷键**: Ctrl+S保存，Ctrl+O打开等
- **菜单栏**: 标准的应用程序菜单
- **稳定性**: 不受浏览器更新影响

## 🛠️ 安装和使用

### 1. 环境要求

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install curl build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install curl

# 安装 Node.js (推荐 18.x LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 项目构建

```bash
# 安装依赖
npm install

# 开发模式运行
npm start

# 构建Linux应用程序
npm run build-linux
```

### 3. 构建产物

构建完成后，在 `dist/` 目录下会生成：

- **AppImage**: `crop-tool-1.0.0.AppImage` (推荐)
  - 无需安装，直接运行
  - 兼容性最好
  
- **DEB包**: `crop-tool_1.0.0_amd64.deb`
  - 适用于 Ubuntu/Debian 系统
  - 可通过包管理器安装

### 4. 运行应用

```bash
# AppImage方式 (推荐)
chmod +x dist/crop-tool-1.0.0.AppImage
./dist/crop-tool-1.0.0.AppImage

# DEB包方式
sudo dpkg -i dist/crop-tool_1.0.0_amd64.deb
crop-tool

# 开发模式
npm start
```

## 📋 功能对比

### Web版本 vs Electron版本

| 功能 | Web版本 | Electron版本 |
|------|---------|-------------|
| 基础计算 | ✅ | ✅ |
| 数据验证 | ✅ | ✅ |
| 报告预览 | ✅ | ✅ |
| 图片导出 | ⚠️ 质量不稳定 | ✅ 高质量稳定 |
| 文件保存 | ⚠️ 下载文件夹 | ✅ 任意位置 |
| 快捷键 | ❌ | ✅ 完整支持 |
| 菜单栏 | ❌ | ✅ 原生菜单 |
| 离线使用 | ⚠️ 需要缓存 | ✅ 完全离线 |
| 自动更新 | ❌ | ✅ 可配置 |

## 🔧 技术细节

### 截图优化配置

```javascript
html2canvas(reportElement, {
    scale: 3,           // 3倍分辨率
    useCORS: true,      // 支持跨域资源
    backgroundColor: '#ffffff',
    foreignObjectRendering: true,
    imageTimeout: 0,
    removeContainer: true
});
```

### 固定显示设置

```javascript
// 禁用用户缩放，确保一致性
mainWindow.webContents.setZoomFactor(1.0);
mainWindow.webContents.on('zoom-changed', (event) => {
    event.preventDefault();
    mainWindow.webContents.setZoomFactor(1.0);
});
```

## 🎨 自定义选项

### 修改输出分辨率

在 `electron-script.js` 中修改：

```javascript
html2canvas(reportElement, {
    scale: 2,  // 改为2倍分辨率（文件更小）
    // scale: 4,  // 改为4倍分辨率（质量更高）
});
```

### 修改图片质量

```javascript
const imageData = canvas.toDataURL('image/jpeg', 0.90); // 降低到90%
// const imageData = canvas.toDataURL('image/jpeg', 1.0);   // 提高到100%
```

### 添加自定义菜单项

在 `main.js` 的 `template` 数组中添加：

```javascript
{
  label: '工具',
  submenu: [
    {
      label: '数据备份',
      click: () => {
        // 实现数据备份功能
      }
    }
  ]
}
```

## 🐛 故障排除

### 常见问题

1. **字体显示异常**
   ```bash
   # 安装中文字体
   sudo apt install fonts-noto-cjk
   ```

2. **AppImage无法运行**
   ```bash
   # 安装 FUSE
   sudo apt install fuse libfuse2
   ```

3. **构建失败**
   ```bash
   # 清理并重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

### 性能优化

- 定期清理临时文件：`~/.cache/crop-tool/`
- 限制同时打开的窗口数量
- 在虚拟机中运行时，分配足够的内存

## 📦 分发建议

1. **AppImage** (推荐给最终用户)
   - 直接运行，无需安装
   - 兼容大多数Linux发行版

2. **DEB包** (推荐给Ubuntu/Debian用户)
   - 集成系统包管理器
   - 可以设置自动启动

3. **压缩包** (高级用户)
   - 包含所有源文件
   - 可以自定义构建

## 🔒 安全注意事项

- Electron应用包含完整的Chromium，安装包较大(~150MB)
- 建议从官方渠道获取，避免恶意修改版本
- 定期更新到最新版本以获得安全补丁

---

## 总结

将网页应用封装为Electron应用，完美解决了以下核心问题：

✅ **渲染一致性**: 所有环境下完全相同的显示效果  
✅ **截图质量**: 高分辨率、高质量的图片输出  
✅ **用户体验**: 原生应用的操作感受  
✅ **部署简单**: 单文件分发，无需浏览器环境  

这样的解决方案特别适合需要确保输出一致性的业务应用场景。
