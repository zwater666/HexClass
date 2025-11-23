# HexClass - 智能加权点名系统

一个基于 React + TypeScript + Vite + Tailwind CSS + Express 开发的智能课堂点名系统，采用加权随机算法，确保积分较低的学生有更高的被点名概率。

## 功能特性

- 🎲 **加权随机点名**：使用 `W = 1/(Score+5)` 算法，积分越低被点概率越高
- 📊 **积分管理**：支持到课、复述、回答质量多维度评分
- 🎁 **海克斯事件**：随机触发特殊事件（黄金门票、应急护甲、代谢加速器）
- 📈 **数据可视化**：积分排行榜、柱状图/折线图切换
- 💾 **数据导出**：支持导出 CSV 格式的积分表
- 📝 **实时日志**：记录所有操作和评分过程
- 🗄️ **后端 API**：Express 服务器，支持 MySQL 数据库和 JSON 文件存储
- 📤 **Excel 导入**：支持上传 Excel 文件批量导入学生数据

## 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Lucide React** - 图标库

### 后端
- **Express** - Node.js Web 框架
- **TypeScript** - 类型安全
- **CORS** - 跨域支持
- **MySQL** - 数据库存储（支持 db4free.net）
- **Multer** - 文件上传处理
- **XLSX** - Excel 文件解析
- **JSON 文件存储** - 数据持久化（数据库连接失败时的后备方案）

## 快速开始

### 1. 配置数据库（可选）

如果你想使用 MySQL 数据库，需要：

1. 在项目根目录创建 `.env` 文件：
```env
DB_PASSWORD=你的数据库密码
```

2. 数据库信息：
   - 主机: db4free.net
   - 端口: 3306
   - 用户名: zwater666
   - 数据库名: hexclass_db（会自动创建）

如果不配置数据库，系统会自动使用 JSON 文件存储。

详细配置说明请查看 [数据库配置说明.md](./数据库配置说明.md)

### 2. 安装依赖

```bash
npm install
```

### 启动开发服务器（前后端同时启动）

```bash
npm run dev
```

这将同时启动：
- 前端开发服务器：`http://localhost:5173`
- 后端 API 服务器：`http://localhost:3001`

### 单独启动

```bash
# 只启动前端
npm run dev:client

# 只启动后端
npm run dev:server
```

### 构建生产版本

```bash
# 构建前端
npm run build

# 构建后端
npm run build:server

# 启动生产服务器
npm start
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
HexClass/
├── src/                    # 前端源代码
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # React 入口
│   └── index.css          # 全局样式
├── server/                 # 后端源代码
│   └── index.ts           # Express 服务器
├── data/                   # 数据存储目录（自动创建）
│   └── students.json      # 学生数据文件
├── index.html             # HTML 模板
├── package.json           # 项目配置
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # 前端 TypeScript 配置
├── tsconfig.server.json   # 后端 TypeScript 配置
├── tailwind.config.js     # Tailwind 配置
└── postcss.config.js      # PostCSS 配置
```

## API 接口

### 获取所有学生
```
GET /api/students
```

### 获取单个学生
```
GET /api/students/:id
```

### 更新学生积分
```
PUT /api/students/:id
Body: { points: number, call_count: number }
```

### 重置所有学生数据
```
POST /api/students/reset
```

### 健康检查
```
GET /api/health
```

## 使用说明

### 随机点名

1. 点击"开始加权随机点名"按钮
2. 系统会根据加权算法随机选择一名学生
3. 有 30% 概率触发海克斯事件
4. 对学生的表现进行评分：
   - **到达课堂**：+1.0 分（自动）
   - **复述问题**：准确 +0.5，失败 -1.0
   - **回答质量**：0.5 ~ 3.0 分（滑块调节）
5. 提交评分后，积分自动更新到后端

### 积分规则

- **初始积分**：所有学生均为 0 分
- **到课**：+1.0 分
- **复述准确**：+0.5 分
- **复述失败**：-1.0 分（回答质量分归零）
- **回答质量**：0.5 ~ 3.0 分
- **加权算法**：`W = 1/(Score+5)`，积分越高被点概率越低

### 海克斯事件

- **黄金门票**：本次得分翻倍
- **应急护甲**：抵消复述失败的惩罚
- **代谢加速器**：额外 +1 分

## 数据存储

系统支持两种存储方式：

1. **MySQL 数据库**（推荐）
   - 如果配置了数据库连接，数据会存储在 MySQL 中
   - 支持更好的数据管理和查询性能

2. **JSON 文件存储**（后备方案）
   - 如果数据库连接失败，自动使用 `data/students.json` 文件
   - 首次运行时会自动创建该文件

## Excel 导入功能

### 文件格式要求

Excel 文件应包含以下列（支持中英文列名）：

| 列名（中文） | 列名（英文） | 说明 | 必填 |
|------------|------------|------|------|
| 学号 | ID / id | 学生学号 | ✅ 是 |
| 姓名 | Name / name | 学生姓名 | ✅ 是 |
| 专业 | Major / major | 专业名称 | ❌ 否（默认：计算机） |
| 积分 | Points / points | 当前积分 | ❌ 否（默认：0） |
| 被点次数 | CallCount / call_count | 被点名次数 | ❌ 否（默认：0） |

### 使用步骤

1. 准备 Excel 文件，确保包含"学号"和"姓名"列
2. 在"数据管理"页面点击上传区域
3. 选择 Excel 文件（支持 .xlsx, .xls, .csv）
4. 系统自动解析并导入数据

## 开发说明

项目使用 Vite 作为前端构建工具，支持热模块替换（HMR），开发体验流畅。

后端使用 Express + TypeScript，数据存储在 JSON 文件中。如需更强大的数据库支持，可以：
- 使用 SQLite（适合小型项目）
- 使用 MongoDB（适合大型项目）
- 使用 PostgreSQL/MySQL（适合生产环境）

## License

MIT
