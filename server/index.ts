import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
// XLSX 将在使用时动态导入（因为 xlsx 包在 ES modules 中可能有兼容性问题）
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { 
  initDatabase, 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  upsertStudents, 
  resetStudents, 
  Student 
} from './db.js';

const app = express();
const PORT = 3001;
const DATA_FILE = join(process.cwd(), 'data', 'students.json');

// 中间件
app.use(cors());
app.use(express.json());

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm
    ];
    const isValidType = allowedTypes.includes(file.mimetype) || 
                        /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传 .xlsx, .xls 或 .csv 文件'));
    }
  }
});

// 确保上传目录存在
const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// 确保数据目录存在
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// 初始学生数据
const INITIAL_STUDENTS = [
  { id: '102301212', name: '张驭驰', major: '计算机', points: 0, call_count: 0 },
  { id: '102301211', name: '郑东泽', major: '计算机', points: 0, call_count: 0 },
  { id: '12501430', name: '赵锦华', major: '计算机', points: 0, call_count: 0 },
  { id: '12501629', name: '许晨也', major: '计算机', points: 0, call_count: 0 },
  { id: '22504211', name: '邓伟川', major: '计算机', points: 0, call_count: 0 },
  { id: '102400435', name: '庄剀涵', major: '计算机', points: 0, call_count: 0 },
  { id: '102402138', name: '吴政迅', major: '计算机', points: 0, call_count: 0 },
  { id: '102403101', name: '陈梦瑶', major: '计算机', points: 0, call_count: 0 },
  { id: '102501225', name: '王毅呈', major: '计算机', points: 0, call_count: 0 },
  { id: '102503112', name: '孙美欣', major: '计算机', points: 0, call_count: 0 },
  { id: '102503150', name: '郑宏涛', major: '计算机', points: 0, call_count: 0 },
];

// 数据库连接状态
let useDatabase = false;

// JSON 文件操作（后备方案）
function readData(): any[] {
  try {
    if (existsSync(DATA_FILE)) {
      const data = readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取数据失败:', error);
  }
  return INITIAL_STUDENTS;
}

function saveData(students: any[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(students, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存数据失败:', error);
  }
}

// API 路由

// 获取所有学生
app.get('/api/students', async (req: Request, res: Response) => {
  try {
    if (useDatabase) {
      const students = await getAllStudents();
      res.json(students);
    } else {
      const students = readData();
      res.json(students);
    }
  } catch (error: any) {
    console.error('获取学生列表失败:', error);
    // 如果数据库失败，回退到JSON
    if (useDatabase) {
      useDatabase = false;
      const students = readData();
      res.json(students);
    } else {
      res.status(500).json({ error: '获取学生列表失败' });
    }
  }
});

// 获取单个学生
app.get('/api/students/:id', async (req: Request, res: Response) => {
  try {
    if (useDatabase) {
      const student = await getStudentById(req.params.id);
      if (student) {
        res.json(student);
      } else {
        res.status(404).json({ error: '学生不存在' });
      }
    } else {
      const students = readData();
      const student = students.find((s: any) => s.id === req.params.id);
      if (student) {
        res.json(student);
      } else {
        res.status(404).json({ error: '学生不存在' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: '获取学生信息失败' });
  }
});

// 更新学生积分
app.put('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { points, call_count } = req.body;
    
    if (useDatabase) {
      const updatedStudent = await updateStudent(req.params.id, points, call_count);
      res.json(updatedStudent);
    } else {
      const students = readData();
      const index = students.findIndex((s: any) => s.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: '学生不存在' });
      }

      if (points !== undefined) {
        const numPts = Number(points);
        students[index].points = Number((Number.isFinite(numPts) ? numPts : 0).toFixed(1));
      }
      if (call_count !== undefined) {
        const numCalls = Number(call_count);
        students[index].call_count = Number.isFinite(numCalls) ? numCalls : students[index].call_count;
      }

      saveData(students);
      res.json(students[index]);
    }
  } catch (error: any) {
    res.status(500).json({ error: '更新学生信息失败' });
  }
});

// 重置所有学生数据
app.post('/api/students/reset', async (req: Request, res: Response) => {
  try {
    if (useDatabase) {
      try {
        await resetStudents([]);
      } catch (e: any) {}
      res.json([]);
    } else {
      saveData([]);
      res.json([]);
    }
  } catch (error: any) {
    console.error('重置数据失败:', error);
    res.status(500).json({ error: '重置数据失败' });
  }
});

// 上传Excel文件
app.post('/api/students/upload', (req: Request, res: Response, next: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件大小超过限制（最大5MB）' });
        }
        return res.status(400).json({ error: `文件上传错误: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || '文件上传失败' });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  let filePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    filePath = req.file.path;
    console.log('收到文件上传:', req.file.originalname, '路径:', filePath);

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return res.status(400).json({ error: '文件上传失败，文件不存在' });
    }

    // 读取Excel文件
    let workbook;
    let XLSX: any;
    try {
      // 动态导入 xlsx（兼容 ES modules）
      XLSX = await import('xlsx');
      // 处理不同的导出方式
      if (XLSX.default) {
        XLSX = XLSX.default;
      }
      workbook = XLSX.readFile(filePath);
    } catch (readError: any) {
      console.error('读取Excel文件失败:', readError);
      return res.status(400).json({ error: '无法读取Excel文件，请确保文件格式正确' });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: 'Excel文件中没有工作表' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return res.status(400).json({ error: '无法读取工作表数据' });
    }
    
    // 转换为JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '', // 空单元格的默认值
      raw: false  // 不保留原始值，进行格式化
    });
    
    console.log('解析到数据行数:', data.length);
    console.log('第一行数据示例:', data[0]);
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Excel文件中没有数据行' });
    }
    
    // 解析数据（支持多种格式）
    const students = data.map((row: any, index: number) => {
      // 尝试不同的列名格式（支持中英文、大小写）
      const id = row['学号'] || row['ID'] || row['id'] || row['Id'] || row['学号'] || '';
      const name = row['姓名'] || row['Name'] || row['name'] || row['姓名'] || '';
      const major = row['专业'] || row['Major'] || row['major'] || row['专业'] || '计算机';
      const points = parseFloat(String(row['积分'] || row['Points'] || row['points'] || row['积分'] || '0')) || 0;
      const call_count = parseInt(String(row['被点次数'] || row['CallCount'] || row['call_count'] || row['被点次数'] || '0')) || 0;
      
      return {
        id: String(id).trim(),
        name: String(name).trim(),
        major: String(major).trim() || '计算机',
        points: isNaN(points) ? 0 : points,
        call_count: isNaN(call_count) ? 0 : call_count
      };
    }).filter((s: any, index: number) => {
      // 过滤空数据
      const isValid = s.id && s.name && s.id.trim() !== '' && s.name.trim() !== '';
      if (!isValid && index < 5) {
        console.log(`第 ${index + 1} 行数据无效:`, s);
      }
      return isValid;
    });

    console.log('有效学生数据:', students.length, '条');

    if (students.length === 0) {
      return res.status(400).json({ 
        error: 'Excel文件中没有有效数据。请确保包含"学号"和"姓名"列，且数据不为空' 
      });
    }

    // 保存到数据库或文件
    let updatedStudents;
    if (useDatabase) {
      try {
        updatedStudents = await upsertStudents(students);
      } catch (dbError: any) {
        console.error('数据库保存失败:', dbError);
        // 如果数据库失败，回退到文件存储
        saveData(students);
        updatedStudents = students;
      }
    } else {
      saveData(students);
      updatedStudents = students;
    }

    // 删除临时文件
    try {
      if (filePath && existsSync(filePath)) {
        unlinkSync(filePath);
        console.log('临时文件已删除:', filePath);
      }
    } catch (deleteError) {
      console.warn('删除临时文件失败:', deleteError);
      // 不阻止响应，文件可以稍后手动清理
    }

    res.json({ 
      message: `成功导入 ${students.length} 条学生数据`, 
      students: updatedStudents 
    });

  } catch (error: any) {
    console.error('上传Excel失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 清理临时文件
    if (filePath && existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (e) {
        // 忽略删除错误
      }
    }
    
    // 确保返回JSON格式
    try {
      res.status(500).json({ 
        error: '上传Excel失败: ' + (error.message || '未知错误'),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } catch (sendError) {
      // 如果响应已发送，记录错误
      console.error('无法发送错误响应:', sendError);
    }
  }
});

// 健康检查
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'HexClass API 运行正常',
    database: useDatabase ? 'MySQL' : 'JSON File'
  });
});

// 全局错误处理中间件（必须在所有路由之后）
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('未捕获的错误:', err);
  console.error('错误堆栈:', err.stack);
  
  // 确保响应头未发送
  if (!res.headersSent) {
    res.status(500).json({ 
      error: err.message || '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 404 处理（必须在最后）
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器（不等待数据库初始化）
app.listen(PORT, () => {
  console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`);
  console.log(`📁 数据文件: ${DATA_FILE}`);
  console.log(`📤 上传目录: ${uploadDir}`);
  console.log(`⏳ 正在初始化数据库...`);
});

// 数据库初始化（异步，不阻塞服务器启动）
initDatabase().then(success => {
  useDatabase = success;
  if (success) {
    console.log('📊 使用 MySQL 数据库存储');
    // 初始化数据到数据库
    getAllStudents().then((students: Student[]) => {
      if (students.length === 0) {
        upsertStudents(readData()).then(() => {
          console.log('✅ 初始数据已从 data/students.json 导入数据库');
        }).catch((err: any) => {
          console.warn('⚠️  导入初始数据失败:', err.message);
        });
      }
    }).catch((err: any) => {
      console.warn('⚠️  查询数据库失败，回退到JSON文件:', err.message);
      useDatabase = false;
    });
  } else {
    console.log('📁 使用 JSON 文件存储');
    // 初始化JSON文件
    if (!existsSync(DATA_FILE)) {
      saveData(INITIAL_STUDENTS);
      console.log('✅ JSON 数据文件已创建');
    }
  }
}).catch((err) => {
  console.error('❌ 数据库初始化异常:', err);
  useDatabase = false;
  if (!existsSync(DATA_FILE)) {
    saveData(INITIAL_STUDENTS);
    console.log('✅ 已回退到 JSON 文件存储');
  }
});
