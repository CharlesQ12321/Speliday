# 每日拼单词 - Speliday

一款基于AI智能识别的单词学习应用，支持拍照录入、智能识别、拼写练习和数据统计等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## 功能特性

### 核心功能

- **AI智能拍照录入** - 使用智谱AI GLM-4.6V-Flash模型，智能识别图片中的英文单词和释义
- **TXT文档导入** - 支持上传TXT文档，AI自动识别并提取单词和释义
- **实时相机拍摄** - 支持调用设备摄像头直接拍照识别
- **图片编辑功能** - 支持图片旋转、裁剪区域选择
- **拼写练习模式** - 随机抽取或错词复习两种练习模式
- **积分激励系统** - 练习获得积分，连续正确有连击奖励
- **高频错词追踪** - 智能分析错误率，自动标记高频错词

### 数据管理

- **单词本管理** - 支持创建、删除多个单词本
- **单词多归属** - 一个单词可同时属于多个单词本
- **数据导入导出** - 支持JSON格式的数据备份和恢复
- **本地数据存储** - 使用IndexedDB本地存储，数据隐私安全

### 统计与反馈

- **练习成绩排行** - 记录每次练习成绩，支持排行榜
- **错误分布图表** - 可视化展示错误分布情况
- **单词报错功能** - 练习中可标记错误单词
- **动画反馈效果** - 连击奖励、烟花特效等激励动画

## 技术栈

- **前端框架**: 原生HTML5 + CSS3 + JavaScript (ES6+)
- **数据库**: Dexie.js (IndexedDB封装)
- **图表库**: Chart.js
- **AI服务**: 智谱AI GLM-4.6V-Flash
- **图标库**: Font Awesome 4.7.0
- **字体**: Inter + Noto Sans SC

## 快速开始

### 本地运行

1. 克隆仓库
```bash
git clone <repository-url>
cd Speliday
```

2. 启动本地服务器（推荐使用Live Server或类似工具）
```bash
# 使用Python
python -m http.server 8080

# 或使用Node.js的http-server
npx http-server -p 8080
```

3. 在浏览器中访问 `http://localhost:8080`

### PWA安装

本应用支持PWA（渐进式Web应用），可以在支持的浏览器中添加到主屏幕：

1. 使用Chrome/Edge/Safari访问应用
2. 点击地址栏的"安装"按钮，或从菜单选择"添加到主屏幕"
3. 安装后即可像原生应用一样使用

## 使用指南

### 录入单词

1. **拍照录入**
   - 点击首页"上传图片识别"按钮
   - 选择拍照或从相册选择图片
   - 可旋转图片、选择识别区域
   - AI自动识别单词和释义
   - 确认无误后入库

2. **TXT导入**
   - 点击首页"上传TXT文档识别"
   - 选择本地TXT文件
   - AI智能解析文档内容
   - 编辑确认后入库

### 拼写练习

1. 进入"练习"页面
2. 选择单词本和练习数量
3. 选择练习模式：
   - **随机抽取**: 从选定范围随机选择单词
   - **错词复习**: 优先练习高频错词
4. 根据中文释义拼写英文单词
5. 查看反馈，继续下一题

### 管理单词

1. 进入"词库"页面
2. 可按单词本、错误次数筛选
3. 支持搜索单词
4. 点击单词可编辑或删除
5. 可创建新的单词本

### 设置选项

在"设置"页面可以：
- 调整高频错词判定标准
- 导出/导入数据备份
- 清除所有数据
- 查看API配置信息

## 项目结构

```
Speliday/
├── index.html          # 主页面
├── app.js              # 应用逻辑
├── image-editor.js     # 图片编辑功能
├── sw.js               # Service Worker (PWA)
├── manifest.json       # PWA配置
├── design-system/      # 设计系统文档
│   └── speliday/
│       └── MASTER.md
└── .trae/              # Trae IDE配置
    └── skills/
        └── ui-ux-pro-max/
```

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

**注意**: 需要支持以下特性的现代浏览器：
- IndexedDB
- ES6+ JavaScript
- CSS Variables
- File API
- MediaDevices API (摄像头功能)

## 数据隐私

- 所有数据存储在本地浏览器中
- 图片识别通过智谱AI API进行，仅传输图片数据
- 支持数据导出备份，防止浏览器数据清除导致丢失

## 开发计划

- [ ] 支持更多AI识别服务
- [ ] 添加语音朗读功能
- [ ] 支持更多文件格式导入
- [ ] 云端同步功能
- [ ] 学习提醒功能
- [ ] 单词卡片复习模式

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [Dexie.js](https://dexie.org/) - 强大的IndexedDB封装库
- [Chart.js](https://www.chartjs.org/) - 简洁的图表库
- [智谱AI](https://open.bigmodel.cn/) - 提供AI识别服务
- [Font Awesome](https://fontawesome.com/) - 图标库

## 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [GitHub Issue](../../issues)
- 邮件联系：Speliday Team

---

Made with ❤️ by Speliday Team
