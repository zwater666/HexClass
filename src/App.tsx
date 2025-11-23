import React, { useState, useEffect, useRef } from 'react';



import { 
  Users, 
  Upload, 
  Trophy, 
  Shuffle, 
  Zap, 
  Save, 
  Download, 
  BarChart2, 
  Activity,
  AlertCircle,
  Gift,
  Shield,
  TrendingUp,
  BarChart,
  CheckCircle,
  XCircle,
  UserX,
  ListOrdered
} from 'lucide-react';

// --- 类型定义 ---

interface Student {

  id: string;

  name: string;

  major: string;

  points: number;

  call_count: number;

}

interface Log {

  id: number;

  message: string;

  type: 'info' | 'success' | 'warning' | 'error';

  timestamp: string;

}

interface HexEvent {

  id: string;

  name: string;

  desc: string;

  icon: any;

  effect: (student: Student, setLog: any) => void;

}

// --- 模拟数据 (初始积分均为0) ---

const INITIAL_STUDENTS: Student[] = [

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

// --- 海克斯事件库 ---

const HEX_EVENTS: HexEvent[] = [

  { 

    id: 'DOUBLE_POINTS', 

    name: '黄金门票', 

    desc: '本次回答如果得分，积分翻倍！', 

    icon: Gift,

    effect: (s: Student, log: (msg: string) => void) => log(`${s.name} 触发了 [黄金门票]！得分将翻倍。`)

  },

  { 

    id: 'IMMUNITY', 

    name: '应急护甲', 

    desc: '本次复述或回答如果扣分，改为不扣分。', 

    icon: Shield,

    effect: (s: Student, log: (msg: string) => void) => log(`${s.name} 触发了 [应急护甲]！本次免伤。`)

  },

  { 

    id: 'SPEED_RACER', 

    name: '代谢加速器', 

    desc: '限时30秒作答！总分额外+1。', 

    icon: Zap,

    effect: (s: Student, log: (msg: string) => void) => log(`${s.name} 触发了 [代谢加速器]！请快速作答。`)

  }

];

HEX_EVENTS.push(
  { id: 'DOUBLE_HAPPINESS',
     name: '双喜临门', 
     desc: '下一位同学无需回答，但分数变动与当前一致', 
     icon: TrendingUp, 
     effect: (s: Student, log: (msg: string) => void) => log(`${s.name} 触发了 [双喜临门]！下一位分数将与其相同变动。`) },
  { id: 'DEMON_CONTRACT', 
    name: '恶魔契约', 
    desc: '清空所有积分，本次提交评价分数×10', 
    icon: AlertCircle, 
    effect: (s: Student, log: (msg: string) => void) => log(`${s.name} 触发了 [恶魔契约]！积分清零，本次评价×10。`) }
);

export default function App() {

  // --- State ---

  const [activeTab, setActiveTab] = useState<'call' | 'import' | 'rank'>('call');

  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);

  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  const [currentEvent, setCurrentEvent] = useState<HexEvent | null>(null);

  const [logs, setLogs] = useState<Log[]>([]);

  const [isCalling, setIsCalling] = useState(false);
  const [pendingSharedDelta, setPendingSharedDelta] = useState<number | null>(null);
  const [speedTimer, setSpeedTimer] = useState<number | null>(null);
  const [sharedApplied, setSharedApplied] = useState<number | null>(null);

  // 评分表单状态

  const [repeatStatus, setRepeatStatus] = useState<'success' | 'fail' | null>(null); // 复述问题状态

  const [answerScore, setAnswerScore] = useState<number>(1.5); // 回答质量得分
  const [loading, setLoading] = useState<boolean>(true); // 数据加载状态

  // --- API 调用函数 ---
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/students');
      if (!response.ok) throw new Error('获取学生数据失败');
      const data = await response.json();
      setStudents(data);
      addLog('已从服务器加载学生数据', 'success');
    } catch (error) {
      console.error('获取学生数据失败:', error);
      addLog('获取学生数据失败，使用本地数据', 'error');
      setStudents(INITIAL_STUDENTS);
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = async (studentId: string, points: number, call_count: number) => {
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points, call_count }),
      });
      if (!response.ok) throw new Error('更新学生数据失败');
      const updatedStudent = await response.json();
      setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));
      return updatedStudent;
    } catch (error) {
      console.error('更新学生数据失败:', error);
      addLog('更新学生数据失败', 'error');
      // 即使 API 失败，也更新本地状态
      let updatedStudent: Student | undefined;
      setStudents(prev => {
        const newStudents = prev.map(s => {
          if (s.id === studentId) {
            updatedStudent = { ...s, points, call_count };
            return updatedStudent;
          }
          return s;
        });
        return newStudents;
      });
      return updatedStudent;
    }
  };

  const resetStudents = async () => {
  try {
    const response = await fetch('/api/students/reset', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('重置数据失败');
    const data = await response.json();
    setStudents(data);
    addLog('已重置为初始数据', 'warning');
    setActiveTab('rank');
  } catch (error) {
    console.error('重置数据失败:', error);
    addLog('重置数据失败，使用本地数据', 'error');
    setStudents(INITIAL_STUDENTS);
    setActiveTab('rank');
  }
};

  // --- 组件加载时获取数据 ---
  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (currentStudent && currentEvent?.id === 'SPEED_RACER') {
      setSpeedTimer(30);
      const id = setInterval(() => {
        setSpeedTimer(prev => {
          if (prev === null) return prev;
          if (prev <= 1) {
            clearInterval(id);
            addLog('代谢加速器倒计时结束', 'warning');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      addLog('代谢加速器倒计时开始: 30s', 'warning');
      return () => clearInterval(id);
    } else {
      setSpeedTimer(null);
    }
  }, [currentStudent, currentEvent]);

  // --- 辅助函数：日志 ---

  const addLog = (message: string, type: Log['type'] = 'info') => {

    setLogs((prev: Log[]) => [{

      id: Date.now() + Math.random(), 

      message,

      type,

      timestamp: new Date().toLocaleTimeString()

    }, ...prev]);

  };

  // --- 核心算法：加权随机 (W = 1 / (S + K)) ---

  // 总积分越高，权重越小，概率越低

  const weightedRandomCall = () => {
    setIsCalling(true);
    setSharedApplied(null);
    setRepeatStatus(null);
    setAnswerScore(1.5);
    addLog('正在计算权重并抽取...', 'info');
    setTimeout(() => {
      try {
        const K = 5;
        if (!students || students.length === 0) {
          addLog('学生名单为空，无法点名', 'error');
          setCurrentStudent(null);
          return;
        }
        let totalWeight = 0;
        const safeList = students.filter((s: any) => s && s.id && s.name);
        if (safeList.length === 0) {
          addLog('学生数据不合法：没有有效条目', 'error');
          setCurrentStudent(null);
          setCurrentEvent(null);
          return;
        }
        const weightedList = safeList.map((s: any) => {
          const pts = Number(s.points);
          const validPts = Number.isFinite(pts) ? pts : 0;
          let denom = validPts + K;
          if (!Number.isFinite(denom) || denom <= 0) denom = 0.0001;
          const weight = 1.0 / denom;
          totalWeight += weight;
          return { ...s, weight };
        });
        if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
          addLog('权重总和异常，无法抽取', 'error');
          setCurrentStudent(null);
          setCurrentEvent(null);
          return;
        }
        const randomPoint = Math.random() * totalWeight;
        let currentSum = 0;
        let selected = weightedList[weightedList.length - 1];
        for (const item of weightedList) {
          currentSum += item.weight;
          if (currentSum >= randomPoint) {
            selected = item;
            break;
          }
        }
        setCurrentStudent(selected);
        if (pendingSharedDelta !== null) {
          const newPts = Number(((Number(selected.points ?? 0)) + pendingSharedDelta).toFixed(1));
          const newCalls = Number((Number(selected.call_count ?? 0) + 1));
          updateStudent(selected.id, newPts, newCalls).then(() => {
            addLog(`双喜临门：${selected.name} 无需回答，分数变动与上一位一致 (${pendingSharedDelta > 0 ? '+' : ''}${pendingSharedDelta.toFixed(1)})`, pendingSharedDelta >= 0 ? 'success' : 'error');
          });
          setPendingSharedDelta(null);
          setSharedApplied(pendingSharedDelta);
          setCurrentEvent(null);
          return;
        }
        const w = selected && Number.isFinite(selected.weight) ? selected.weight.toFixed(3) : '—';
        addLog(`选中了: ${selected?.name ?? '未知'} (当前积分: ${selected?.points ?? 0}, 权重: ${w})`, 'success');
        if (Math.random() < 0.3 && selected) {
          const randomEvent = HEX_EVENTS[Math.floor(Math.random() * HEX_EVENTS.length)];
          setCurrentEvent(randomEvent);
          randomEvent.effect(selected, (msg: string) => addLog(msg, 'warning'));
        } else {
          setCurrentEvent(null);
        }
      } catch (e) {
        console.error('点名计算失败:', e);
        addLog('点名计算出现异常，请检查数据格式', 'error');
        setCurrentStudent(null);
        setCurrentEvent(null);
      } finally {
        setIsCalling(false);
      }
    }, 800);
  };

  // --- 按学号顺序点名 ---
  const sequentialIndexRef = useRef<number>(0);
  const sequentialCall = () => {
    setIsCalling(true);
    setSharedApplied(null);
    setRepeatStatus(null);
    setAnswerScore(1.5);
    addLog('正在按学号顺序选择下一位...', 'info');
    setTimeout(() => {
      try {
        if (!students || students.length === 0) {
          addLog('学生名单为空，无法点名', 'error');
          setCurrentStudent(null);
          setIsCalling(false);
          return;
        }
        const safeList = students.filter((s: any) => s && s.id && s.name);
        if (safeList.length === 0) {
          addLog('学生数据不合法：没有有效条目', 'error');
          setCurrentStudent(null);
          setCurrentEvent(null);
          setIsCalling(false);
          return;
        }
        const sortedById = [...safeList].sort((a: any, b: any) => {
          const na = parseInt(String(a.id), 10);
          const nb = parseInt(String(b.id), 10);
          if (Number.isNaN(na) || Number.isNaN(nb)) {
            return String(a.id).localeCompare(String(b.id));
          }
          return na - nb;
        });
        if (sequentialIndexRef.current >= sortedById.length) {
          sequentialIndexRef.current = 0;
        }
        const selected = sortedById[sequentialIndexRef.current];
        sequentialIndexRef.current += 1;
        setCurrentStudent(selected);
        setCurrentEvent(null);
        addLog(`按序选中: ${selected?.name ?? '未知'} (学号: ${selected?.id ?? '—'})`, 'success');
      } catch (e) {
        console.error('顺序点名失败:', e);
        addLog('顺序点名出现异常，请检查数据格式', 'error');
        setCurrentStudent(null);
        setCurrentEvent(null);
      } finally {
        setIsCalling(false);
      }
    }, 500);
  };

  // --- 提交评分逻辑 ---

  const submitScore = (isPresent: boolean) => {

    if (!currentStudent) return;

    let delta = 0;

    const eventMultiplier = currentEvent?.id === 'DEMON_CONTRACT' ? 10 : 1;
    let appliedDelta = 0;

    let logMsg = '';

    if (!isPresent) {

      // 缺席：积分不变 (0)，或者根据需求设为0。这里假设不加分。

      delta = 0; 

      logMsg = `${currentStudent.name} 缺席，积分 +0`;

    } else {

      // 到达课堂：+1

      let base = 1;

      

      // 复述问题：+0.5 或 -1

      let repeatDelta = 0;

      if (repeatStatus === 'success') repeatDelta = 0.5;

      if (repeatStatus === 'fail') repeatDelta = -1.0;

      // 回答质量：+0.5 ~ +3.0

      // 逻辑修正：如果复述失败，回答质量分强制为 0

      let qualityDelta = repeatStatus === 'success' ? answerScore : 0;

      // 计算原始总分

      delta = base + repeatDelta + qualityDelta;

      // --- 海克斯事件效果 ---

      if (currentEvent?.id === 'DOUBLE_POINTS' && delta > 0) {

        delta *= 2;

        addLog('黄金门票生效！积分翻倍！', 'success');

      }

      if (currentEvent?.id === 'IMMUNITY' && (repeatDelta < 0)) {

        // 如果有惩罚，抵消复述失败的惩罚

        // 这里简化为：如果总增量受复述影响较大，尝试补偿，或者直接按照逻辑抵消负分项

        // 简单处理：如果复述失败(-1)，护甲将其变为0

        if (repeatStatus === 'fail') {

             delta += 1.0; // 补回扣掉的1分

             addLog('应急护甲生效！复述失败惩罚已抵消。', 'success');

        }

      }

      if (currentEvent?.id === 'SPEED_RACER') {
        delta += 1;
        addLog('代谢加速器生效！额外 +1。', 'success');
      }
      if (currentEvent?.id === 'DOUBLE_HAPPINESS') {
        setPendingSharedDelta(delta);
        addLog('双喜临门生效：下一位分数与当前一致', 'warning');
      }
      appliedDelta = delta * eventMultiplier;
      logMsg = `${currentStudent.name} 到课(+1) | 复述(${repeatStatus === 'success' ? '+0.5' : (repeatStatus === 'fail' ? '-1.0' : '0')}) | 回答(+${qualityDelta}) => 总计 ${appliedDelta > 0 ? '+' : ''}${appliedDelta.toFixed(1)}`;

    }

    // 计算新的积分和点名次数
    const basePts = currentEvent?.id === 'DEMON_CONTRACT' ? 0 : Number(currentStudent.points);
    const newPoints = Number((basePts + appliedDelta).toFixed(1));
    const newCallCount = currentStudent.call_count + 1;

    // 调用 API 更新学生数据
    if (currentEvent?.id === 'DEMON_CONTRACT') {
      addLog('恶魔契约生效：积分清零，本次评价×10', 'warning');
      setStudents(prev => prev.map(s => ({ ...s, points: 0 })));
    }
    updateStudent(currentStudent.id, newPoints, newCallCount).then(() => {
      addLog(logMsg, delta >= 0 ? 'success' : 'error');
    });

    setCurrentStudent(null);

    setCurrentEvent(null);

  };

  // --- 导出功能 ---

  const exportToCSV = () => {

    const headers = "学号,姓名,专业,积分,被点次数\n";

    const csvContent = students.map((s: Student) => `${s.id},${s.name},${s.major},${s.points},${s.call_count}`).join("\n");

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "课堂积分表.csv";

    link.click();

    addLog('已导出 CSV 文件', 'info');

  };

  // --- 图表组件 ---

  const RankingChart = ({ data }: { data: Student[] }) => {

    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

    const width = 800;

    const height = 300;

    const padding = 40;

    const chartWidth = width - padding * 2;

    const chartHeight = height - padding * 2;

    

    const maxPoints = Math.max(...data.map(s => s.points), 5);

    const maxCalls = Math.max(...data.map(s => s.call_count), 5);

    

    const getX = (index: number) => padding + (index * (chartWidth / data.length)) + (chartWidth / data.length) / 2;

    const getYPoints = (val: number) => height - padding - (val / maxPoints) * chartHeight;

    const getYCalls = (val: number) => height - padding - (val / maxCalls) * chartHeight;

    return (

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">

        <div className="flex justify-between items-center mb-6">

          <h3 className="font-bold text-slate-700 flex items-center gap-2">

            <Activity size={20} className="text-blue-500"/>

            积分与活跃度趋势 (Top {data.length})

          </h3>

          <div className="flex bg-slate-100 p-1 rounded-lg">

            <button onClick={() => setChartType('bar')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${chartType === 'bar' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><BarChart size={14} /> 柱状图</button>

            <button onClick={() => setChartType('line')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${chartType === 'line' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><TrendingUp size={14} /> 折线图</button>

          </div>

        </div>

        <div className="relative w-full overflow-x-auto">

          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="min-w-[600px]">

            {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (

              <g key={i}>

                <line x1={padding} y1={height - padding - tick * chartHeight} x2={width - padding} y2={height - padding - tick * chartHeight} stroke="#e2e8f0" strokeDasharray="4 4" />

                <text x={10} y={height - padding - tick * chartHeight + 4} fontSize="10" fill="#94a3b8">{(tick * maxPoints).toFixed(0)}</text>

              </g>

            ))}

            {data.map((s, i) => (

              <text key={s.id} x={getX(i)} y={height - 10} textAnchor="middle" fontSize="12" fill="#475569">{s.name}</text>

            ))}

            {chartType === 'bar' && data.map((s, i) => {

              const barW = (chartWidth / data.length) * 0.3;

              return (

                <g key={s.id}>

                  <rect x={getX(i) - barW - 2} y={getYPoints(Math.max(0, s.points))} width={barW} height={Math.abs(getYPoints(s.points) - (height - padding))} fill="#3b82f6" rx="2" opacity="0.8" />

                  <rect x={getX(i) + 2} y={getYCalls(s.call_count)} width={barW} height={height - padding - getYCalls(s.call_count)} fill="#f97316" rx="2" opacity="0.8" />

                </g>

              );

            })}

            {chartType === 'line' && (

              <>

                <polyline points={data.map((s, i) => `${getX(i)},${getYPoints(s.points)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="3" />

                {data.map((s, i) => <circle key={`pt-${i}`} cx={getX(i)} cy={getYPoints(s.points)} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />)}

                <polyline points={data.map((s, i) => `${getX(i)},${getYCalls(s.call_count)}`).join(' ')} fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="5 5" />

                 {data.map((s, i) => <circle key={`cl-${i}`} cx={getX(i)} cy={getYCalls(s.call_count)} r="4" fill="white" stroke="#f97316" strokeWidth="2" />)}

              </>

            )}

          </svg>

        </div>

        <div className="flex justify-center gap-6 mt-2 text-sm">

          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-slate-600">总积分</span></div>

          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span><span className="text-slate-600">被点名次数</span></div>

        </div>

      </div>

    );

  };

  // --- 界面组件 ---

  const Sidebar = () => (

    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-10">

      <div className="p-6 border-b border-slate-700">

        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="text-blue-400" /> HexClass</h1>

        <p className="text-xs text-slate-400 mt-1">智能加权点名系统</p>

      </div>

      <nav className="flex-1 p-4 space-y-2">

        <button onClick={() => setActiveTab('call')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'call' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><Shuffle size={20} /> 随机点名</button>

        <button onClick={() => setActiveTab('rank')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'rank' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><Trophy size={20} /> 积分排行</button>

        <button onClick={() => setActiveTab('import')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'import' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><Upload size={20} /> 数据管理</button>

      </nav>

      <div className="p-4 border-t border-slate-700">

        <div className="flex items-center gap-2 text-sm text-slate-400"><div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div> {loading ? '连接中...' : '后端已连接'}</div>

      </div>

    </div>

  );

  const CallPanel = () => {

    // 实时计算预计得分

    const currentBase = 1;

    const currentRepeat = repeatStatus === 'success' ? 0.5 : (repeatStatus === 'fail' ? -1 : 0);

    // 逻辑修正：如果复述失败，回答质量分为 0

    const currentQuality = repeatStatus === 'success' ? answerScore : 0;

    const estimatedTotal = currentBase + currentRepeat + currentQuality;

    return (

      <div className="max-w-4xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden">

              {isCalling && (

                <div className="absolute inset-0 bg-blue-50/50 flex items-center justify-center backdrop-blur-sm z-10">

                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>

                </div>

              )}

              

              <div className="mb-6">

                <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">

                  <Users size={40} className="text-blue-600" />

                </div>

                <h2 className="text-4xl font-bold text-slate-800 mb-2">

                  {currentStudent ? currentStudent.name : '等待点名'}

                </h2>

                <p className="text-slate-500">

                  {currentStudent ? `${currentStudent.id} | ${currentStudent.major}` : '点击下方按钮开始'}

                </p>

              </div>

              {currentEvent && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-left animate-bounce-short">
                  <currentEvent.icon className="text-amber-500 shrink-0 mt-1" size={24} />
                  <div>
                    <h4 className="font-bold text-amber-800">{currentEvent.name}</h4>
                    <p className="text-sm text-amber-600">{currentEvent.desc}</p>
                  </div>
                </div>

              )}

              {currentEvent?.id === 'SPEED_RACER' && speedTimer !== null && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">限时作答</span>
                    <span className="font-mono text-blue-700">{speedTimer}s</span>
                  </div>
                  <div className="mt-2 w-full bg-blue-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.max(0, Math.min(30, speedTimer)) / 30 * 100}%` }}></div>
                  </div>
                </div>
              )}

              {!currentStudent ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={weightedRandomCall} disabled={isCalling} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <Shuffle size={20} /> 开始加权随机点名
                  </button>
                  <button onClick={sequentialCall} disabled={isCalling} className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <ListOrdered size={20} /> 按学号顺序点名
                  </button>
                </div>
              ) : (
                <div className="text-left space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">

                  {/* 1. 考勤 */}

                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">

                    <span className="font-bold text-slate-700">1. 到达课堂</span>

                    <span className="text-green-600 font-mono font-bold">+1.0</span>

                  </div>

                  {/* 2. 复述问题 */}

                  <div>

                     <span className="font-bold text-slate-700 block mb-2">2. 复述问题</span>

                     <div className="grid grid-cols-2 gap-3">

                       <button 

                         onClick={() => {

                            setRepeatStatus('success');

                            // 如果是从失败状态恢复，且当前回答分为0，则恢复默认分

                            if (answerScore === 0) setAnswerScore(1.5);

                         }}

                         className={`p-2 rounded-lg border-2 flex items-center justify-center gap-2 ${repeatStatus === 'success' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-green-300'}`}

                       >

                         <CheckCircle size={18} /> 准确 (+0.5)

                       </button>

                       <button 

                         onClick={() => {

                            setRepeatStatus('fail');

                            // 失败时回答分归零

                            setAnswerScore(0);

                         }}

                         className={`p-2 rounded-lg border-2 flex items-center justify-center gap-2 ${repeatStatus === 'fail' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-red-300'}`}

                       >

                         <XCircle size={18} /> 失败 (-1.0)

                       </button>

                     </div>

                  </div>

                  {/* 3. 回答质量 (如果复述失败则禁用) */}

                  <div className={repeatStatus !== 'success' ? 'opacity-50 pointer-events-none grayscale transition-all' : 'transition-all'}>

                    <div className="flex justify-between mb-2">

                       <span className="font-bold text-slate-700">3. 回答质量</span>

                       <span className="font-mono text-blue-600 font-bold">+{currentQuality.toFixed(1)}</span>

                    </div>

                    <input 

                      type="range" min="0.5" max="3.0" step="0.5" 

                      value={answerScore} 

                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswerScore(parseFloat(e.target.value))}

                      disabled={repeatStatus !== 'success' || sharedApplied !== null}

                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"

                    />

                    <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">

                      <span>0.5</span><span>1.0</span><span>1.5</span><span>2.0</span><span>2.5</span><span>3.0</span>

                    </div>

                  </div>

                  {/* 提交区域 */}

                  <div className="pt-2">

                    <button 
                      onClick={() => submitScore(true)} 
                      disabled={repeatStatus === null || sharedApplied !== null}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md flex justify-between px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>提交评价</span>
                      <span>总计: {estimatedTotal > 0 ? '+' : ''}{estimatedTotal.toFixed(1)} 分</span>
                    </button>

                    <button 
                      onClick={() => submitScore(false)} 
                      disabled={sharedApplied !== null}
                      className="w-full mt-2 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserX size={16} /> 该生缺席 (0分)
                    </button>

                    {sharedApplied !== null && (
                      <button 
                        onClick={() => { setCurrentStudent(null); setSharedApplied(null); setCurrentEvent(null); }}
                        className="w-full mt-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
                      >
                        继续抽取下一位
                      </button>
                    )}

                  </div>

                </div>

              )}

            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-200">

              <h3 className="font-bold mb-2 flex items-center gap-2"><Activity size={16} /> 积分与概率规则</h3>

              <ul className="list-disc list-inside space-y-1 text-xs">

                <li><span className="font-semibold">初始积分</span>：均为 0 分</li>

                <li><span className="font-semibold">出勤</span>：到课即 +1 分</li>

                <li><span className="font-semibold">复述</span>：准确 +0.5，失败 -1.0</li>

                <li><span className="font-semibold">回答</span>：质量分为 0.5 ~ 3.0</li>

                <li><span className="font-semibold">概率</span>：积分越高，被点概率越低 (W = 1/(Score+5))</li>

              </ul>

            </div>

          </div>

          <div className="space-y-6">

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[600px] flex flex-col">

              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><AlertCircle size={18} /> 系统日志</h3>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">

                {logs.length === 0 && <p className="text-slate-400 text-center mt-10">暂无记录</p>}

                {logs.map(log => (

                  <div key={log.id} className={`p-3 rounded-lg text-sm border-l-4 ${log.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' : log.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' : log.type === 'warning' ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-slate-50 border-blue-400 text-slate-700'}`}>

                    <div className="text-xs opacity-50 mb-1">{log.timestamp}</div>

                    {log.message}

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

      </div>

    );

  };

  const VisualRankPanel = () => {

    const sortedStudents = [...students].sort((a: Student, b: Student) => b.points - a.points);

    const topStudents = sortedStudents.slice(0, 10);

    const maxScore = Math.max(...students.map(s => s.points), 1);

    return (

      <div className="space-y-6">

        <RankingChart data={topStudents} />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          <div className="flex justify-between items-center mb-6">

            <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart2 className="text-blue-600" /> 详细积分榜</h2>

            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-sm font-medium transition-colors"><Download size={16} /> 导出 Excel</button>

          </div>

          <div className="space-y-4">

            {sortedStudents.map((s, idx) => (

              <div key={s.id} className="group hover:bg-slate-50 p-2 rounded-lg transition-colors">

                <div className="flex justify-between text-sm mb-2 font-medium text-slate-700">

                  <span className="w-8 font-bold text-slate-400">{idx + 1}.</span>

                  <div className="flex-1 flex justify-between mr-4">

                     <span>{s.name} <span className="text-slate-400 font-normal">({s.major})</span></span>

                     <div className="flex gap-4 text-xs">

                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">积分: {Number(s.points ?? 0).toFixed(1)}</span>

                        <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">点名: {s.call_count}</span>

                     </div>

                  </div>

                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">

                  <div className={`h-full rounded-full transition-all duration-500 ${idx < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-blue-500'}`} style={{ width: `${Math.max((s.points / maxScore) * 100, 5)}%` }}></div>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    );

  };

  const ImportPanel = () => {
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<{ count: number; message: string } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const successBoxRef = React.useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (uploadSuccess && successBoxRef.current) {
        successBoxRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [uploadSuccess]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // 验证文件类型
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        addLog('请上传 Excel 文件 (.xlsx, .xls) 或 CSV 文件', 'error');
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        addLog(`开始上传文件: ${file.name}`, 'info');
        
        const response = await fetch('/api/students/upload', {
          method: 'POST',
          body: formData,
        });

        // 检查响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text);
          throw new Error(`服务器返回了非JSON响应 (${response.status}): ${text.substring(0, 100)}`);
        }

        // 检查响应是否为空
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          throw new Error('服务器返回了空响应');
        }

        // 解析JSON
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON解析失败:', responseText);
          throw new Error('服务器返回的数据格式不正确，无法解析JSON');
        }

        if (!response.ok) {
          throw new Error(responseData.error || `上传失败 (${response.status})`);
        }

        if (responseData.students && Array.isArray(responseData.students)) {
          setStudents(responseData.students);
          const successMessage = responseData.message || `成功导入 ${responseData.students.length} 条数据`;
          addLog(successMessage, 'success');
          
          // 显示成功提示
          setUploadSuccess({
            count: responseData.students.length,
            message: successMessage
          });
          setActiveTab('rank');
          

        } else {
          throw new Error('服务器返回的数据格式不正确：缺少students数组');
        }
      } catch (error: any) {
        console.error('上传失败:', error);
        let errorMessage = error.message || '未知错误';
        
        // 处理特定的错误类型
        if (error.message?.includes('Unexpected end of JSON input')) {
          errorMessage = '服务器响应格式错误，请检查后端日志';
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          errorMessage = '网络连接失败，请检查后端服务器是否正常运行 (http://localhost:3001)';
        }
        
        addLog(`上传失败: ${errorMessage}`, 'error');
        // 清除成功提示（如果之前有）
        setUploadSuccess(null);
      } finally {
        setUploading(false);
        // 清空文件输入
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-50 rounded-full mx-auto flex items-center justify-center mb-6">
            <Save className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">导入/重置数据</h2>
          <p className="text-slate-500">上传 Excel 文件重置学生名单，或重置为默认数据</p>
        </div>

        <div className="space-y-4">
          {/* 成功提示 */}
          {uploadSuccess && (
            <div ref={successBoxRef} className="bg-green-50 border-2 border-green-400 rounded-xl p-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-800 mb-1">上传成功！</h3>
                  <p className="text-green-700 mb-4">{uploadSuccess.message}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setActiveTab('rank');
                        setUploadSuccess(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Trophy size={18} /> 查看积分排行
                    </button>
                    <button
                      onClick={() => setUploadSuccess(null)}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Excel 上传区域 */}
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            uploading 
              ? 'border-blue-400 bg-blue-50' 
              : uploadSuccess 
              ? 'border-green-400 bg-green-50' 
              : 'border-slate-300 hover:border-blue-400'
          }`}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className={`cursor-pointer flex flex-col items-center gap-4 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploadSuccess ? (
                <CheckCircle size={48} className="text-green-600" />
              ) : (
                <Upload size={48} className={uploading ? 'text-blue-500' : 'text-slate-400'} />
              )}
              <div>
                <p className={`font-medium mb-1 ${
                  uploading 
                    ? 'text-blue-700' 
                    : uploadSuccess 
                    ? 'text-green-700' 
                    : 'text-slate-700'
                }`}>
                  {uploading 
                    ? '正在上传并解析文件...' 
                    : uploadSuccess 
                    ? `成功导入 ${uploadSuccess.count} 条学生数据` 
                    : '点击选择 Excel 文件'}
                </p>
                <p className={`text-sm ${
                  uploading 
                    ? 'text-blue-600' 
                    : uploadSuccess 
                    ? 'text-green-600' 
                    : 'text-slate-500'
                }`}>
                  {uploading 
                    ? '请稍候...' 
                    : uploadSuccess 
                    ? '数据已更新，可以查看积分排行' 
                    : '支持 .xlsx, .xls, .csv 格式'}
                </p>
              </div>
              {uploading && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              )}
            </label>
          </div>

          {/* Excel 格式说明 */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
            <p className="font-semibold mb-2">Excel 文件格式要求：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>第一行应为表头：学号、姓名、专业、积分、被点次数</li>
              <li>支持中英文列名：学号/ID、姓名/Name、专业/Major、积分/Points、被点次数/CallCount</li>
              <li>积分和被点次数为可选字段，默认为 0</li>
            </ul>
          </div>

          {/* 重置按钮 */}
          <div className="flex justify-center">
            <button
              onClick={resetStudents}
              disabled={uploading}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              重置默认数据
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (

    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

      <Sidebar />

      <main className="ml-64 p-8">

        <div className="max-w-6xl mx-auto">

          {activeTab === 'call' && <CallPanel />}

          {activeTab === 'rank' && <VisualRankPanel />}

          {activeTab === 'import' && <ImportPanel />}

        </div>

      </main>

    </div>

  );

}

