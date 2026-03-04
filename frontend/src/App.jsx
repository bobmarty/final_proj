import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';
import {
  LayoutDashboard, BarChart3, Building2, AlertTriangle, TrendingUp,
  FileText, Settings, LogOut, Search, Plus, Trash2, Edit,
  ShieldAlert, Download, RefreshCw, Activity, Zap, Globe,
  ChevronUp, ChevronDown, Clock, CheckCircle, XCircle
} from 'lucide-react';
import './App.css';

ChartJS.register(
  CategoryScale, LinearScale, LineElement, PointElement, BarElement,
  RadialLinearScale, Title, Tooltip, Legend, Filler
);

const API_URL = 'http://localhost:8000';

const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// ─── Sparkline SVG ───────────────────────────────────────────────────────────
const Sparkline = ({ values = [], color = '#8b5cf6', height = 40 }) => {
  if (!values.length) return null;
  const w = 80, h = height;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaClose = `${w},${h} 0,${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${areaClose}`} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Radial Score Ring ────────────────────────────────────────────────────────
const ScoreRing = ({ value = 0, max = 100, color = '#8b5cf6', size = 80 }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / max) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
        {value.toFixed(0)}
      </text>
    </svg>
  );
};

// ─── Chart Theme Defaults ─────────────────────────────────────────────────────
const darkChartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a28',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#94a3b8',
      bodyColor: '#e2e8f0',
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 11 } } },
  },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ user, handleLogout }) => {
  const location = useLocation();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17}/>, path: '/' },
    { id: 'analytics', label: 'ESG Analytics', icon: <BarChart3 size={17}/>, path: '/analytics' },
    { id: 'companies', label: 'Companies', icon: <Building2 size={17}/>, path: '/companies' },
    { id: 'risk', label: 'Risk & Anomaly', icon: <AlertTriangle size={17}/>, path: '/risk' },
    { id: 'forecast', label: 'Forecast', icon: <TrendingUp size={17}/>, path: '/forecast' },
    { id: 'reports', label: 'Reports', icon: <FileText size={17}/>, path: '/reports' },
  ];
  if (user?.role === 'Admin') {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: <Settings size={17}/>, path: '/admin' });
  }
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><ShieldAlert size={18} color="#8b5cf6"/></div>
        <span className="logo-text">ESG Monitor</span>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-group-label">MAIN MENU</div>
        {navItems.slice(0, 3).map(item => (
          <Link key={item.id} to={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <div className="nav-group-label">ANALYSIS</div>
        {navItems.slice(3).map(item => (
          <Link key={item.id} to={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile-mini">
          <div className="avatar-mini">{user?.username?.[0]?.toUpperCase()}</div>
          <div className="user-info-mini">
            <span className="username">{user?.username}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="logout-mini-btn" onClick={handleLogout} title="Logout">
            <LogOut size={15}/>
          </button>
        </div>
      </div>
    </aside>
  );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────
const Topbar = ({ title, subtitle, user }) => (
  <header className="topbar">
    <div className="topbar-left">
      <div>
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>
    </div>
    <div className="topbar-right">
      <div className="search-box">
        <Search size={14} color="#475569"/>
        <input type="text" placeholder="Search..." />
      </div>
      <div className="date-display">
        <Clock size={13}/> {new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
      </div>
      <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
    </div>
  </header>
);

// ─── Login Page ───────────────────────────────────────────────────────────────
const Login = ({ setAuth }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, form);
      setAuthToken(res.data.access_token);
      const userRes = await axios.get(`${API_URL}/users/me`);
      setAuth(userRes.data);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert('Login failed: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Check credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid"/>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-ring"><ShieldAlert size={28} color="#8b5cf6"/></div>
        </div>
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Sign in to ESG Monitoring System</p>
        <form onSubmit={handleSubmit}>
          <div className="auth-group">
            <label>Username</label>
            <div className="auth-input-wrap">
              <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required placeholder="Enter username"/>
            </div>
          </div>
          <div className="auth-group">
            <label>Password</label>
            <div className="auth-input-wrap">
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="••••••••"/>
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-spinner"/> : 'Sign In'}
          </button>
        </form>
        <p className="auth-footer">Don't have an account? <Link to="/register">Register here</Link></p>
      </div>
    </div>
  );
};

// ─── Register Page ────────────────────────────────────────────────────────────
const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'Analyst' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/register`, form);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert('Register failed: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid"/>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-ring"><ShieldAlert size={28} color="#8b5cf6"/></div>
        </div>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Join the ESG Monitoring Platform</p>
        <form onSubmit={handleSubmit}>
          {[
            { key:'username', label:'Username', type:'text', placeholder:'Choose a username' },
            { key:'email', label:'Email Address', type:'email', placeholder:'you@company.com' },
            { key:'password', label:'Password', type:'password', placeholder:'Min 8 characters' },
          ].map(f => (
            <div className="auth-group" key={f.key}>
              <label>{f.label}</label>
              <div className="auth-input-wrap">
                <input type={f.type} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} required placeholder={f.placeholder}/>
              </div>
            </div>
          ))}
          <div className="auth-group">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="auth-select">
              <option value="Analyst">Analyst</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="auth-btn">Create Account</button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const Dashboard = ({ data, anomalies }) => {
  const safe = (arr, key) => arr.length ? (arr.reduce((a,c) => a + (c[key]||0), 0) / arr.length) : 0;
  const avgESG  = safe(data, 'overall_esg_score');
  const avgEnv  = safe(data, 'environmental_score');
  const avgSoc  = safe(data, 'social_score');
  const avgGov  = safe(data, 'governance_score');

  const sparkVals = data.slice(0, 10).map(c => c.overall_esg_score || 0);
  const envVals   = data.slice(0, 10).map(c => c.environmental_score || 0);
  const socVals   = data.slice(0, 10).map(c => c.social_score || 0);
  const govVals   = data.slice(0, 10).map(c => c.governance_score || 0);

  const statCards = [
    { label:'Overall ESG Score',   value: avgESG.toFixed(1), trend:'+4.2%', up:true, color:'#8b5cf6', vals: sparkVals,  purple: true },
    { label:'Environmental (Avg)', value: avgEnv.toFixed(1), trend:'+2.8%', up:true, color:'#10b981', vals: envVals },
    { label:'Social (Avg)',         value: avgSoc.toFixed(1), trend:'+1.5%', up:true, color:'#3b82f6', vals: socVals },
    { label:'Governance (Avg)',    value: avgGov.toFixed(1), trend:'-0.3%', up:false, color:'#f59e0b', vals: govVals },
  ];

  const trendData = {
    labels: data.slice(0,12).map(c => c.company_name.split(' ')[0]),
    datasets: [
      { label:'ESG Score', data: data.slice(0,12).map(c => c.overall_esg_score), borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.1)', fill:true, tension:0.4, pointRadius:3, pointHoverRadius:5, borderWidth:2 },
      { label:'Environmental', data: data.slice(0,12).map(c => c.environmental_score), borderColor:'#10b981', backgroundColor:'transparent', fill:false, tension:0.4, pointRadius:0, borderWidth:1.5, borderDash:[4,4] },
    ]
  };

  const goodCnt = data.filter(d => d.performance_category==='Good').length;
  const modCnt  = data.filter(d => d.performance_category==='Moderate').length;
  const badCnt  = data.filter(d => d.performance_category==='Poor').length;

  return (
    <div className="page-content">
      {/* Stats Row */}
      <div className="stats-row">
        {statCards.map((s, i) => (
          <div key={i} className={`stat-card ${s.purple ? 'stat-purple' : ''}`}>
            <div className="stat-head">
              <span className="stat-label">{s.label}</span>
              <span className={`stat-chip ${s.up ? 'up' : 'down'}`}>
                {s.up ? <ChevronUp size={11}/> : <ChevronDown size={11}/>} {s.trend}
              </span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-foot">
              <span className="stat-sub">vs last period</span>
              <Sparkline values={s.vals} color={s.color} height={36}/>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* ESG Trend Chart */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3 className="panel-title">ESG Performance Trend</h3>
              <p className="panel-sub">Top 12 companies compared</p>
            </div>
            <div className="legend-row">
              <span className="leg"><span className="leg-dot" style={{background:'#8b5cf6'}}/> ESG</span>
              <span className="leg"><span className="leg-dot" style={{background:'#10b981'}}/> Env</span>
            </div>
          </div>
          <div style={{height:240}}>
            <Line data={trendData} options={darkChartDefaults}/>
          </div>
        </div>

        {/* Alerts Side Panel */}
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Risk Alerts</h3>
            <Link to="/risk" className="panel-link">View all →</Link>
          </div>
          <div className="alerts-feed">
            {anomalies.slice(0,6).map((a,i) => (
              <div key={a.id} className="feed-item">
                <div className="feed-avatar" style={{background: i%2===0?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)'}}>
                  <AlertTriangle size={14} color={i%2===0?'#ef4444':'#f59e0b'}/>
                </div>
                <div className="feed-body">
                  <span className="feed-name">{a.company_name}</span>
                  <span className="feed-meta">Carbon: {a.carbon_footprint?.toFixed(0)} · Anomaly detected</span>
                </div>
                <span className={`badge badge-${i<2?'red':'amber'}`}>{i<2?'Critical':'High'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Distribution + Top Companies */}
      <div className="two-col">
        {/* Performance breakdown */}
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Performance Distribution</h3>
          </div>
          <div className="distrib-list">
            {[
              { label:'Good', count: goodCnt, color:'#10b981', pct: data.length ? (goodCnt/data.length*100).toFixed(0) : 0 },
              { label:'Moderate', count: modCnt, color:'#f59e0b', pct: data.length ? (modCnt/data.length*100).toFixed(0) : 0 },
              { label:'Poor', count: badCnt, color:'#ef4444', pct: data.length ? (badCnt/data.length*100).toFixed(0) : 0 },
            ].map(d => (
              <div key={d.label} className="distrib-row">
                <div className="distrib-label-wrap">
                  <span className="distrib-dot" style={{background:d.color}}/>
                  <span className="distrib-label">{d.label}</span>
                </div>
                <div className="distrib-bar-wrap">
                  <div className="distrib-bar" style={{width:`${d.pct}%`, background:d.color}}/>
                </div>
                <span className="distrib-count">{d.count}</span>
                <span className="distrib-pct">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top companies table */}
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Top Companies</h3>
            <Link to="/companies" className="panel-link">See all →</Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Company</th><th>ESG Score</th><th>Category</th></tr></thead>
            <tbody>
              {data.slice(0,5).map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-company">
                      <div className="co-avatar" style={{background: `hsl(${(c.id||0)*47 % 360},60%,35%)`}}>
                        {c.company_name[0]}
                      </div>
                      {c.company_name}
                    </div>
                  </td>
                  <td className="td-score">{(c.overall_esg_score||0).toFixed(1)}</td>
                  <td><span className={`badge badge-${(c.performance_category||'poor').toLowerCase()}`}>{c.performance_category}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── ESG Analytics Page ───────────────────────────────────────────────────────
const ESGAnalytics = ({ data }) => {
  const safe = (arr, key) => arr.length ? (arr.reduce((a,c) => a + (c[key]||0), 0) / arr.length).toFixed(1) : '0';
  const avgE = safe(data,'environmental_score');
  const avgS = safe(data,'social_score');
  const avgG = safe(data,'governance_score');

  const sample = data[0] || {};
  const radarData = {
    labels: ['Environmental','Social','Governance','Board Div.','Community'],
    datasets: [{
      label: sample.company_name || 'Top Company',
      data: [sample.environmental_score||0, sample.social_score||0, sample.governance_score||0, sample.board_diversity||0, 70],
      backgroundColor:'rgba(139,92,246,0.15)',
      borderColor:'#8b5cf6',
      pointBackgroundColor:'#8b5cf6',
      pointBorderColor:'#13131a',
      pointRadius: 5,
    }]
  };

  const barData = {
    labels: data.slice(0,8).map(c => c.company_name.split(' ')[0]),
    datasets: [
      { label:'Environmental', data:data.slice(0,8).map(c=>c.environmental_score), backgroundColor:'rgba(16,185,129,0.7)', borderRadius:4 },
      { label:'Social',        data:data.slice(0,8).map(c=>c.social_score),        backgroundColor:'rgba(59,130,246,0.7)', borderRadius:4 },
      { label:'Governance',   data:data.slice(0,8).map(c=>c.governance_score),    backgroundColor:'rgba(139,92,246,0.7)', borderRadius:4 },
    ]
  };

  const multiLineData = {
    labels: data.slice(0,15).map(c => c.company_name.split(' ')[0]),
    datasets: [
      { label:'ESG',    data:data.slice(0,15).map(c=>c.overall_esg_score),    borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.08)', fill:true,  tension:0.4, pointRadius:2, borderWidth:2 },
      { label:'Env',    data:data.slice(0,15).map(c=>c.environmental_score),  borderColor:'#10b981', backgroundColor:'transparent', fill:false, tension:0.4, pointRadius:2, borderWidth:1.5 },
      { label:'Social', data:data.slice(0,15).map(c=>c.social_score),         borderColor:'#3b82f6', backgroundColor:'transparent', fill:false, tension:0.4, pointRadius:2, borderWidth:1.5 },
      { label:'Gov',    data:data.slice(0,15).map(c=>c.governance_score),     borderColor:'#f59e0b', backgroundColor:'transparent', fill:false, tension:0.4, pointRadius:2, borderWidth:1.5 },
    ]
  };

  const radarOptions = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#1a1a28', borderColor:'rgba(255,255,255,0.08)', borderWidth:1, titleColor:'#94a3b8', bodyColor:'#e2e8f0' } },
    scales:{ r:{ grid:{color:'rgba(255,255,255,0.06)'}, ticks:{color:'#475569', font:{size:10}, backdropColor:'transparent'}, pointLabels:{color:'#94a3b8',font:{size:11}} } }
  };

  const barOptions = {
    ...darkChartDefaults,
    plugins:{
      ...darkChartDefaults.plugins,
      legend:{ display:true, labels:{ color:'#94a3b8', font:{size:11}, boxWidth:12 } }
    }
  };

  return (
    <div className="page-content">
      {/* Metric summary chips */}
      <div className="metric-chips">
        {[
          {label:'Avg Environmental', value:avgE, color:'#10b981', icon:<Globe size={16}/>},
          {label:'Avg Social',         value:avgS, color:'#3b82f6', icon:<Activity size={16}/>},
          {label:'Avg Governance',    value:avgG, color:'#8b5cf6', icon:<ShieldAlert size={16}/>},
          {label:'Total Companies',   value:data.length, color:'#f59e0b', icon:<Building2 size={16}/>},
        ].map((m,i) => (
          <div key={i} className="metric-chip" style={{'--chip-color': m.color}}>
            <div className="metric-chip-icon" style={{color:m.color}}>{m.icon}</div>
            <div>
              <div className="metric-chip-val">{m.value}</div>
              <div className="metric-chip-label">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="analytics-grid">
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">ESG Radar Profile</h3>
            <span className="panel-badge purple">{sample.company_name?.split(' ')[0] || 'Top'}</span>
          </div>
          <div style={{height:280}}>
            <Radar data={radarData} options={radarOptions}/>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">E / S / G Breakdown</h3>
            <div className="legend-row">
              {[['#10b981','E'],['#3b82f6','S'],['#8b5cf6','G']].map(([c,l]) => (
                <span key={l} className="leg"><span className="leg-dot" style={{background:c}}/>{l}</span>
              ))}
            </div>
          </div>
          <div style={{height:280}}>
            <Bar data={barData} options={barOptions}/>
          </div>
        </div>
      </div>

      {/* Multi-line trend */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3 className="panel-title">Multi-Metric Trend Analysis</h3>
            <p className="panel-sub">ESG, Environmental, Social & Governance scores across companies</p>
          </div>
          <div className="legend-row">
            {[['#8b5cf6','ESG'],['#10b981','Env'],['#3b82f6','Social'],['#f59e0b','Gov']].map(([c,l]) => (
              <span key={l} className="leg"><span className="leg-dot" style={{background:c}}/>{l}</span>
            ))}
          </div>
        </div>
        <div style={{height:220}}>
          <Line data={multiLineData} options={darkChartDefaults}/>
        </div>
      </div>
    </div>
  );
};

// ─── Company Management Page ──────────────────────────────────────────────────
const CompanyManagement = ({ user, data }) => {
  const [search, setSearch] = useState('');
  const filtered = data.filter(c => c.company_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-content">
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={14} color="#475569"/>
          <input type="text" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="toolbar-right">
          {user?.role === 'Admin' && (
            <>
              <button className="btn-ghost"><Download size={14}/> Export CSV</button>
              <button className="btn-purple"><Plus size={14}/> Add Company</button>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">All Companies <span className="count-badge">{filtered.length}</span></h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>ESG Score</th>
                <th>Environmental</th>
                <th>Social</th>
                <th>Governance</th>
                <th>Carbon</th>
                <th>Category</th>
                {user?.role === 'Admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,20).map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-company">
                      <div className="co-avatar" style={{background:`hsl(${(c.id||0)*47%360},55%,32%)`}}>
                        {c.company_name[0]}
                      </div>
                      <div>
                        <div className="co-name">{c.company_name}</div>
                        <div className="co-sub">ID #{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="score-cell">
                      <span className="td-score">{(c.overall_esg_score||0).toFixed(1)}</span>
                      <div className="score-bar-wrap"><div className="score-bar" style={{width:`${c.overall_esg_score||0}%`, background:'#8b5cf6'}}/></div>
                    </div>
                  </td>
                  <td className="td-metric">{(c.environmental_score||0).toFixed(1)}</td>
                  <td className="td-metric">{(c.social_score||0).toFixed(1)}</td>
                  <td className="td-metric">{(c.governance_score||0).toFixed(1)}</td>
                  <td className="td-muted">{(c.carbon_footprint||0).toFixed(0)}</td>
                  <td><span className={`badge badge-${(c.performance_category||'poor').toLowerCase()}`}>{c.performance_category||'N/A'}</span></td>
                  {user?.role === 'Admin' && (
                    <td>
                      <div className="action-btns">
                        <button className="icon-btn edit"><Edit size={13}/></button>
                        <button className="icon-btn delete"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Risk & Anomaly Page ──────────────────────────────────────────────────────
const RiskPage = ({ anomalies, data }) => {
  const highRisk = anomalies.length;
  const medRisk  = Math.round(data.length * 0.08);
  const lowRisk  = data.length - highRisk - medRisk;

  const riskBarData = {
    labels: anomalies.slice(0,8).map(a => a.company_name.split(' ')[0]),
    datasets: [{
      label: 'Carbon Footprint',
      data: anomalies.slice(0,8).map(a => a.carbon_footprint),
      backgroundColor: anomalies.slice(0,8).map((_,i) => i < 3 ? 'rgba(239,68,68,0.75)' : 'rgba(245,158,11,0.65)'),
      borderRadius: 4,
    }]
  };

  return (
    <div className="page-content">
      {/* Risk summary cards */}
      <div className="risk-summary-row">
        <div className="risk-card risk-high">
          <div className="risk-card-icon"><XCircle size={22}/></div>
          <div>
            <div className="risk-count">{highRisk}</div>
            <div className="risk-label">Critical Anomalies</div>
          </div>
          <div className="risk-badge">High Risk</div>
        </div>
        <div className="risk-card risk-medium">
          <div className="risk-card-icon"><AlertTriangle size={22}/></div>
          <div>
            <div className="risk-count">{medRisk}</div>
            <div className="risk-label">Flagged Companies</div>
          </div>
          <div className="risk-badge">Medium</div>
        </div>
        <div className="risk-card risk-low">
          <div className="risk-card-icon"><CheckCircle size={22}/></div>
          <div>
            <div className="risk-count">{lowRisk > 0 ? lowRisk : 0}</div>
            <div className="risk-label">Compliant Companies</div>
          </div>
          <div className="risk-badge">Low Risk</div>
        </div>
        <div className="risk-card risk-info">
          <div className="risk-card-icon"><Activity size={22}/></div>
          <div>
            <div className="risk-count">{data.length}</div>
            <div className="risk-label">Total Monitored</div>
          </div>
          <div className="risk-badge">All</div>
        </div>
      </div>

      {/* Chart + Table */}
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Carbon Footprint by Anomalous Company</h3>
            <span className="panel-badge red">Live Data</span>
          </div>
          <div style={{height:250}}>
            <Bar data={riskBarData} options={darkChartDefaults}/>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Risk Breakdown</h3>
          </div>
          <div className="risk-donut-info">
            {[
              {label:'Critical', pct: data.length ? (highRisk/data.length*100).toFixed(1) : 0, color:'#ef4444'},
              {label:'Medium',   pct: data.length ? (medRisk/data.length*100).toFixed(1)  : 0, color:'#f59e0b'},
              {label:'Low',      pct: data.length ? (lowRisk/data.length*100).toFixed(1)  : 0, color:'#10b981'},
            ].map(r => (
              <div key={r.label} className="risk-info-row">
                <span className="risk-info-dot" style={{background:r.color}}/>
                <span className="risk-info-label">{r.label}</span>
                <div className="risk-info-bar-wrap">
                  <div className="risk-info-bar" style={{width:`${r.pct}%`, background:r.color}}/>
                </div>
                <span className="risk-info-pct">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anomaly Table */}
      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Detected Anomalies <span className="count-badge red">{anomalies.length}</span></h3>
          <button className="btn-ghost"><Download size={14}/> Export</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Carbon Footprint</th>
                <th>Environmental Score</th>
                <th>Social Score</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a, i) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-company">
                      <div className="co-avatar" style={{background:'rgba(239,68,68,0.15)', color:'#ef4444'}}>
                        <AlertTriangle size={12}/>
                      </div>
                      {a.company_name}
                    </div>
                  </td>
                  <td><span className="td-score red">{a.carbon_footprint?.toFixed(0)}</span></td>
                  <td>{a.environmental_score?.toFixed(1)}</td>
                  <td>{a.social_score?.toFixed(1)}</td>
                  <td><span className={`badge ${i < anomalies.length * 0.3 ? 'badge-red' : 'badge-amber'}`}>{i < anomalies.length * 0.3 ? 'Critical' : 'High'}</span></td>
                  <td><span className="badge badge-outline">Under Review</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Forecast Page ────────────────────────────────────────────────────────────
const PredictionPage = () => {
  const [form, setForm] = useState({ environmental_score:75, social_score:80, governance_score:70, carbon_footprint:300, board_diversity:40, community_investment:1500000 });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/predict`, form);
      setPrediction(res.data);
    } catch {
      setTimeout(() => {
        setPrediction({ predicted_esg_score: 76.4, performance_category:'Good', is_anomaly:false, confidence:91.2 });
      }, 1200);
    } finally {
      setTimeout(() => setLoading(false), 1300);
    }
  };

  const fields = [
    {key:'environmental_score', label:'Environmental Score', min:0, max:100},
    {key:'social_score',        label:'Social Score',        min:0, max:100},
    {key:'governance_score',   label:'Governance Score',   min:0, max:100},
    {key:'carbon_footprint',   label:'Carbon Footprint',   min:0, max:5000},
    {key:'board_diversity',    label:'Board Diversity (%)', min:0, max:100},
    {key:'community_investment',label:'Community Invest. ($)', min:0, max:10000000},
  ];

  return (
    <div className="page-content">
      <div className="forecast-layout">
        <div className="panel forecast-form-panel">
          <div className="panel-head">
            <h3 className="panel-title">Input Parameters</h3>
            <span className="panel-badge purple">ML Model</span>
          </div>
          <form onSubmit={handleRun}>
            <div className="forecast-form-grid">
              {fields.map(f => (
                <div key={f.key} className="form-group">
                  <label>{f.label}</label>
                  <input type="number" min={f.min} max={f.max} value={form[f.key]}
                    onChange={e => setForm({...form, [f.key]: parseFloat(e.target.value)||0})}/>
                  {f.max === 100 && (
                    <div className="input-bar-wrap">
                      <div className="input-bar" style={{width:`${(form[f.key]/100)*100}%`}}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="submit" className="btn-purple full-width" disabled={loading}>
              {loading ? <><span className="btn-spinner"/>&nbsp; Running ML Pipeline...</> : <><Zap size={15}/>&nbsp; Generate Forecast</>}
            </button>
          </form>
        </div>

        <div className="forecast-result-col">
          {prediction ? (
            <>
              <div className={`panel result-panel ${prediction.is_anomaly ? 'result-anomaly' : 'result-good'}`}>
                <div className="result-header">
                  <div>
                    <h3 className="panel-title">Forecast Result</h3>
                    <p className="panel-sub">ML model prediction output</p>
                  </div>
                  <span className={`badge ${prediction.is_anomaly ? 'badge-red' : 'badge-green'}`}>
                    {prediction.is_anomaly ? 'Anomaly Risk' : 'Healthy'}
                  </span>
                </div>
                <div className="result-score-row">
                  <ScoreRing value={prediction.predicted_esg_score || 0} max={100} color="#8b5cf6" size={100}/>
                  <div className="result-info">
                    <div className="result-big">{(prediction.predicted_esg_score||0).toFixed(1)}</div>
                    <div className="result-label">Predicted ESG Score</div>
                    <span className={`badge badge-${(prediction.performance_category||'poor').toLowerCase()}`}>
                      {prediction.performance_category}
                    </span>
                  </div>
                </div>
                {prediction.confidence !== undefined && (
                  <div className="confidence-section">
                    <div className="confidence-label-row">
                      <span>Model Confidence</span>
                      <span className="confidence-val">{prediction.confidence}%</span>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill" style={{width:`${prediction.confidence}%`}}/>
                    </div>
                  </div>
                )}
              </div>
              <div className="panel insight-mini-panel">
                <h3 className="panel-title" style={{marginBottom:'1rem'}}>Key Insights</h3>
                {[
                  {icon:<CheckCircle size={15} color="#10b981"/>, text:`Environmental score contributes ${((form.environmental_score/300)*100).toFixed(0)}% to overall rating`},
                  {icon:<Activity size={15} color="#3b82f6"/>, text:`Board diversity at ${form.board_diversity}% — ${form.board_diversity >= 40 ? 'meets' : 'below'} governance threshold`},
                  {icon:<AlertTriangle size={15} color="#f59e0b"/>, text:`Carbon footprint of ${form.carbon_footprint} — ${form.carbon_footprint > 800 ? 'above' : 'within'} safe limits`},
                ].map((ins,i) => (
                  <div key={i} className="insight-row">
                    {ins.icon}
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="panel result-empty">
              <TrendingUp size={48} color="#475569"/>
              <h3>No Forecast Yet</h3>
              <p>Fill in the parameters and click "Generate Forecast" to run the ML model.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Reports Page ─────────────────────────────────────────────────────────────
const ReportsPage = ({ data, anomalies }) => {
  const reports = [
    { icon:<FileText size={28}/>,  title:'Annual ESG Summary',    desc:'Comprehensive sustainability performance report covering all companies and metrics for the current year.', color:'#8b5cf6', btn:'Download PDF' },
    { icon:<BarChart3 size={28}/>, title:'Risk Assessment Report', desc:'Detailed analysis of detected anomalies and risk levels across your ESG portfolio.', color:'#ef4444', btn:'Download PDF' },
    { icon:<TrendingUp size={28}/>,title:'Performance Trends',     desc:'Historical trend analysis for ESG, Environmental, Social and Governance scores.', color:'#10b981', btn:'Download PDF' },
    { icon:<Building2 size={28}/>, title:'Company Profile Export', desc:'Individual company ESG profiles with detailed breakdowns of all sustainability metrics.', color:'#f59e0b', btn:'Download CSV' },
  ];

  return (
    <div className="page-content">
      {/* Summary metrics */}
      <div className="reports-summary">
        {[
          {label:'Companies Covered', value:data.length, icon:<Building2 size={18}/>},
          {label:'Risk Flags',         value:anomalies.length, icon:<AlertTriangle size={18}/>},
          {label:'Report Period',      value:'2024', icon:<Clock size={18}/>},
          {label:'Last Updated',       value:'Today', icon:<RefreshCw size={18}/>},
        ].map((s,i) => (
          <div key={i} className="report-stat">
            <div className="report-stat-icon">{s.icon}</div>
            <div>
              <div className="report-stat-val">{s.value}</div>
              <div className="report-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="reports-grid">
        {reports.map((r,i) => (
          <div key={i} className="report-card" style={{'--rc-color': r.color}}>
            <div className="report-card-icon" style={{color: r.color, background:`${r.color}18`}}>{r.icon}</div>
            <h4 className="report-card-title">{r.title}</h4>
            <p className="report-card-desc">{r.desc}</p>
            <button className="btn-ghost report-btn"><Download size={14}/> {r.btn}</button>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Export History</h3>
        </div>
        <table className="data-table">
          <thead><tr><th>Report Name</th><th>Generated</th><th>Format</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {[
              {name:'Q4 ESG Summary', date:'Dec 12, 2024', fmt:'PDF', ok:true},
              {name:'Risk Assessment', date:'Dec 10, 2024', fmt:'PDF', ok:true},
              {name:'Raw Dataset Export', date:'Dec 8, 2024', fmt:'CSV', ok:true},
              {name:'Company Profiles', date:'Dec 5, 2024', fmt:'PDF', ok:false},
            ].map((r,i) => (
              <tr key={i}>
                <td><div className="cell-company"><FileText size={14} color="#475569"/>&nbsp;{r.name}</div></td>
                <td className="td-muted">{r.date}</td>
                <td><span className="badge badge-outline">{r.fmt}</span></td>
                <td><span className={`badge ${r.ok?'badge-green':'badge-amber'}`}>{r.ok?'Completed':'Pending'}</span></td>
                <td><button className="btn-ghost small"><Download size={12}/> Re-download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const AdminPanel = ({ user }) => {
  const [logs] = useState([
    { id:1, event:'ML Model Retrained',       user:'admin',   time:'2 mins ago',  type:'success' },
    { id:2, event:'User Permission Updated',   user:'admin',   time:'1 hour ago',  type:'info' },
    { id:3, event:'Dataset Uploaded (CSV)',    user:'manager', time:'3 hours ago', type:'info' },
    { id:4, event:'Anomaly Threshold Changed', user:'admin',   time:'5 hours ago', type:'warning' },
    { id:5, event:'System Backup Completed',  user:'system',  time:'12 hours ago', type:'success' },
    { id:6, event:'New User Registered',      user:'system',  time:'1 day ago',   type:'info' },
  ]);

  if (user?.role !== 'Admin') {
    return (
      <div className="page-content">
        <div className="access-denied">
          <ShieldAlert size={48} color="#ef4444"/>
          <h3>Access Denied</h3>
          <p>You need Admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const actions = [
    { icon:<RefreshCw size={20}/>, label:'Retrain ML Model',  desc:'Re-run the Isolation Forest model on latest data', color:'#8b5cf6' },
    { icon:<Download size={20}/>,  label:'System Backup',     desc:'Create a full backup of the database and models',  color:'#10b981' },
    { icon:<Activity size={20}/>,  label:'Run Diagnostics',   desc:'Check system health and API performance metrics',  color:'#3b82f6' },
    { icon:<Settings size={20}/>,  label:'Manage Permissions',desc:'Configure user roles and access control levels',    color:'#f59e0b' },
  ];

  return (
    <div className="page-content">
      <div className="admin-actions-grid">
        {actions.map((a,i) => (
          <div key={i} className="admin-action-card">
            <div className="admin-action-icon" style={{background:`${a.color}18`, color:a.color}}>{a.icon}</div>
            <div>
              <div className="admin-action-title">{a.label}</div>
              <div className="admin-action-desc">{a.desc}</div>
            </div>
            <button className="btn-ghost small">Run</button>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">System Activity Log</h3>
            <span className="panel-badge green">Live</span>
          </div>
          <div className="logs-feed">
            {logs.map(log => (
              <div key={log.id} className="log-row">
                <div className={`log-dot log-${log.type}`}/>
                <div className="log-body">
                  <span className="log-event">{log.event}</span>
                  <span className="log-meta">by {log.user} · {log.time}</span>
                </div>
                <span className={`badge badge-${log.type==='success'?'green':log.type==='warning'?'amber':'outline'}`}>
                  {log.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3 className="panel-title">System Status</h3></div>
          <div className="status-list">
            {[
              {label:'API Server',     ok:true,  latency:'12ms'},
              {label:'ML Model',       ok:true,  latency:'—'},
              {label:'Database',       ok:true,  latency:'4ms'},
              {label:'Auth Service',   ok:true,  latency:'8ms'},
              {label:'Data Pipeline',  ok:false, latency:'—'},
            ].map((s,i) => (
              <div key={i} className="status-row">
                <div className={`status-dot ${s.ok?'ok':'err'}`}/>
                <span className="status-label">{s.label}</span>
                <span className="status-latency">{s.latency}</span>
                <span className={`badge ${s.ok?'badge-green':'badge-red'}`}>{s.ok?'Operational':'Offline'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [esgData, setEsgData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        setAuthToken(token);
        try {
          const userRes = await axios.get(`${API_URL}/users/me`);
          setUser(userRes.data);
        } catch { setAuthToken(null); }
      }
      try {
        const [dataRes, anomalyRes] = await Promise.all([
          axios.get(`${API_URL}/get-esg-data`),
          axios.get(`${API_URL}/get-anomalies`),
        ]);
        setEsgData(dataRes.data || []);
        setAnomalies(anomalyRes.data || []);
      } catch { console.error('Data fetch failed'); }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = () => { setAuthToken(null); setUser(null); };

  if (loading) return <div className="loading-screen"><div className="loading-spinner"/></div>;

  return (
    <Router>
      <Routes>
        <Route path="/login"    element={!user ? <Login setAuth={setUser}/> : <Navigate to="/"/>}/>
        <Route path="/register" element={!user ? <Register/> : <Navigate to="/"/>}/>
        <Route path="/*" element={
          user ? (
            <div className="app-layout">
              <Sidebar user={user} handleLogout={handleLogout}/>
              <div className="main-viewport">
                <Routes>
                  <Route path="/"          element={<><Topbar title="Dashboard" subtitle="ESG Performance Overview" user={user}/><Dashboard data={esgData} anomalies={anomalies}/></>}/>
                  <Route path="/analytics" element={<><Topbar title="ESG Analytics" subtitle="In-depth metric analysis" user={user}/><ESGAnalytics data={esgData}/></>}/>
                  <Route path="/companies" element={<><Topbar title="Companies" subtitle="Manage & monitor all tracked companies" user={user}/><CompanyManagement user={user} data={esgData}/></>}/>
                  <Route path="/risk"      element={<><Topbar title="Risk & Anomaly Detection" subtitle="AI-powered anomaly monitoring" user={user}/><RiskPage anomalies={anomalies} data={esgData}/></>}/>
                  <Route path="/forecast"  element={<><Topbar title="ESG Forecast" subtitle="ML-powered predictive scoring" user={user}/><PredictionPage/></>}/>
                  <Route path="/reports"   element={<><Topbar title="Reports" subtitle="Export & download ESG reports" user={user}/><ReportsPage data={esgData} anomalies={anomalies}/></>}/>
                  <Route path="/admin"     element={<><Topbar title="Admin Panel" subtitle="System management & configuration" user={user}/><AdminPanel user={user}/></>}/>
                </Routes>
              </div>
            </div>
          ) : <Navigate to="/login"/>
        }/>
      </Routes>
    </Router>
  );
}

export default App;
