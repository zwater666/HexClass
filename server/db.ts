import 'dotenv/config';
import mysql from 'mysql2/promise';

export interface Student {
  id: string;
  name: string;
  major: string;
  points: number;
  call_count: number;
}

// 数据库配置（不指定数据库，用于创建数据库）
const dbConfigWithoutDB = {
  host: 'db4free.net',
  port: 3306,
  user: 'zwater666',
  password: process.env.DB_PASSWORD || '', // 从环境变量读取密码
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 数据库配置（指定数据库）
const dbConfig = {
  ...dbConfigWithoutDB,
  database: 'zwater666',
};

// 创建连接池（延迟初始化）
let pool: mysql.Pool | null = null;

// 初始化数据库表
export async function initDatabase() {
  try {
    // 如果没有密码，跳过数据库初始化
    if (!process.env.DB_PASSWORD) {
      console.log('⚠️  未配置数据库密码，将使用 JSON 文件存储');
      return false;
    }

    // 策略1: 先尝试直接连接数据库（如果数据库已存在）
    try {
      pool = mysql.createPool(dbConfig);
      const testConnection = await pool.getConnection();
      
      // 测试连接是否成功
      await testConnection.query('SELECT 1');
      testConnection.release();
      
      console.log('✅ 数据库连接成功（数据库已存在）');
    } catch (directError: any) {
      // 如果直接连接失败，尝试创建数据库
      console.log('📝 数据库不存在，尝试创建...');
      
      try {
        // 先连接到MySQL服务器（不指定数据库）来创建数据库
        const tempPool = mysql.createPool(dbConfigWithoutDB);
        const tempConnection = await tempPool.getConnection();
        
        // 创建数据库（如果不存在）
        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS zwater666 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        tempConnection.release();
        await tempPool.end();
        
        // 创建指定数据库的连接池
        pool = mysql.createPool(dbConfig);
        const newConnection = await pool.getConnection();
        await newConnection.query('SELECT 1');
        newConnection.release();
        
        console.log('✅ 数据库创建成功');
      } catch (createError: any) {
        // 如果创建数据库也失败，可能是权限问题
        console.error('❌ 无法创建数据库:', createError.message);
        console.log('');
        console.log('💡 解决方案：');
        console.log('   1. 通过 phpMyAdmin 手动创建数据库:');
        console.log('      - 访问: https://www.phpmyadmin.co/');
        console.log('      - 登录: 用户名 zwater666');
        console.log('      - 创建数据库: hexclass_db');
        console.log('      - 字符集: utf8mb4_unicode_ci');
        console.log('   2. 或者使用 JSON 文件存储（当前模式）');
        console.log('');
        
        if (pool) {
          try {
            await pool.end();
          } catch (e) {
            // 忽略关闭错误
          }
          pool = null;
        }
        return false;
      }
    }
    
    // 创建学生表
    const connection = await pool!.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(30) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        major VARCHAR(50) NOT NULL,
        points DECIMAL(5,1) DEFAULT 0.0,
        call_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并添加缺失的列（用于已存在的表）
    try {
      const [columns]: any = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME = 'major'
      `);
      if (columns.length === 0) {
        console.log('📝 检测到表缺少 major 列，正在添加...');
        await connection.query(`ALTER TABLE students ADD COLUMN major VARCHAR(50) NOT NULL DEFAULT '计算机'`);
        console.log('✅ 已添加 major 列');
      }

      const [idInfo]: any = await connection.query(`
        SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'students'
          AND COLUMN_NAME = 'id'
      `);
      if (!idInfo.length || idInfo[0].DATA_TYPE !== 'varchar' || (idInfo[0].CHARACTER_MAXIMUM_LENGTH ?? 0) < 20) {
        console.log('📝 检测到 id 列类型不符合要求，正在修正为 VARCHAR(30)...');
        await connection.query(`ALTER TABLE students MODIFY COLUMN id VARCHAR(30) NOT NULL`);
        console.log('✅ 已修正 id 列类型为 VARCHAR(30)');
      }

      const [nameInfo]: any = await connection.query(`
        SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'students'
          AND COLUMN_NAME = 'name'
      `);
      if (!nameInfo.length || nameInfo[0].DATA_TYPE !== 'varchar' || (nameInfo[0].CHARACTER_MAXIMUM_LENGTH ?? 0) < 50 || nameInfo[0].IS_NULLABLE !== 'NO') {
        console.log('📝 修正 name 列为 VARCHAR(50) NOT NULL...');
        await connection.query(`ALTER TABLE students MODIFY COLUMN name VARCHAR(50) NOT NULL`);
        console.log('✅ 已修正 name 列');
      }

      const [majorInfo]: any = await connection.query(`
        SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'students'
          AND COLUMN_NAME = 'major'
      `);
      if (!majorInfo.length || majorInfo[0].DATA_TYPE !== 'varchar' || (majorInfo[0].CHARACTER_MAXIMUM_LENGTH ?? 0) < 50 || majorInfo[0].IS_NULLABLE !== 'NO') {
        console.log('📝 修正 major 列为 VARCHAR(50) NOT NULL DEFAULT \'计算机\'...');
        await connection.query(`ALTER TABLE students MODIFY COLUMN major VARCHAR(50) NOT NULL DEFAULT '计算机'`);
        console.log('✅ 已修正 major 列');
      }

      const [pointsInfo]: any = await connection.query(`
        SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'students'
          AND COLUMN_NAME = 'points'
      `);
      if (!pointsInfo.length || pointsInfo[0].DATA_TYPE !== 'decimal' || pointsInfo[0].NUMERIC_PRECISION !== 5 || pointsInfo[0].NUMERIC_SCALE !== 1) {
        console.log('📝 修正 points 列为 DECIMAL(5,1) DEFAULT 0.0...');
        await connection.query(`ALTER TABLE students MODIFY COLUMN points DECIMAL(5,1) NOT NULL DEFAULT 0.0`);
        console.log('✅ 已修正 points 列');
      }

      const [callsInfo]: any = await connection.query(`
        SELECT DATA_TYPE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'students'
          AND COLUMN_NAME = 'call_count'
      `);
      if (!callsInfo.length || callsInfo[0].DATA_TYPE !== 'int') {
        console.log('📝 修正 call_count 列为 INT DEFAULT 0...');
        await connection.query(`ALTER TABLE students MODIFY COLUMN call_count INT NOT NULL DEFAULT 0`);
        console.log('✅ 已修正 call_count 列');
      }

      const [pkInfo]: any = await connection.query(`
        SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'students'
          AND INDEX_NAME = 'PRIMARY'
      `);
      if (!pkInfo.length || Number(pkInfo[0].cnt) === 0) {
        console.log('📝 检测到缺少主键，正在为 id 添加 PRIMARY KEY...');
        try {
          await connection.query(`ALTER TABLE students ADD PRIMARY KEY (id)`);
          console.log('✅ 已添加 PRIMARY KEY(id)');
        } catch (e: any) {
          console.warn('⚠️  添加主键失败，可能存在重复的 id:', e.message);
        }
      }
    } catch (alterError: any) {
      console.warn('⚠️  检查/添加列时出错（可能已存在）:', alterError.message);
    }
    
    connection.release();
    console.log('✅ 数据库表初始化成功');
    return true;
  } catch (error: any) {
    console.error('❌ 数据库初始化失败:', error.message);
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        // 忽略关闭错误
      }
      pool = null;
    }
    // 如果数据库连接失败，返回false，让服务器使用JSON文件作为后备
    return false;
  }
}

// 检查数据库连接
function checkPool() {
  if (!pool) {
    throw new Error('数据库未连接');
  }
  return pool;
}

// 获取所有学生
export async function getAllStudents(): Promise<Student[]> {
  try {
    const [rows] = await checkPool().query('SELECT * FROM students ORDER BY points DESC');
    return rows as Student[];
  } catch (error: any) {
    console.error('获取学生列表失败:', error.message);
    throw error;
  }
}

// 获取单个学生
export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const [rows]: any = await checkPool().query('SELECT * FROM students WHERE id = ?', [id]);
    return (rows[0] as Student) || null;
  } catch (error: any) {
    console.error('获取学生信息失败:', error.message);
    throw error;
  }
}

// 更新学生
export async function updateStudent(id: string, points: number, call_count: number): Promise<Student> {
  try {
    await checkPool().query(
      'UPDATE students SET points = ?, call_count = ? WHERE id = ?',
      [points, call_count, id]
    );
    const updated = await getStudentById(id);
    return (updated as Student);
  } catch (error: any) {
    console.error('更新学生信息失败:', error.message);
    throw error;
  }
}

// 插入或更新学生（批量）
export async function upsertStudents(students: any[]): Promise<Student[]> {
  try {
    const values = students.map(s => [String(s.id), String(s.name), String(s.major || '计算机'), Number(s.points ?? 0), Number(s.call_count ?? 0)]);
    await checkPool().query(
      `INSERT INTO students (id, name, major, points, call_count) 
       VALUES ? 
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), 
       major = VALUES(major), 
       points = VALUES(points), 
       call_count = VALUES(call_count)`,
      [values]
    );
    return await getAllStudents();
  } catch (error: any) {
    console.error('批量更新学生失败:', error.message);
    throw error;
  }
}

// 删除所有学生并重置
export async function resetStudents(initialStudents: any[]): Promise<Student[]> {
  try {
    await checkPool().query('DELETE FROM students');
    return await upsertStudents(initialStudents);
  } catch (error: any) {
    console.error('重置学生数据失败:', error.message);
    throw error;
  }
}

export default pool;

