import { useEffect, useState } from 'react';
import { Chart as ChartJS, BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Filter, TrendingUp, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getAnalytics } from '../api/api';

ChartJS.register(BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const chartOpts = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { bodyFont: { family: 'Inter' }, titleFont: { family: 'Inter' } } },
  scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 } } }, y: { grid: { color: '#f0f4f8' }, ticks: { font: { family: 'Inter', size: 12 } }, max: 100, min: 0 } },
};

export default function Analytics() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(res => {
      setData(res);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const subjectData = data?.subjectData || [];
  const weeklyTrend = data?.weeklyTrend || [];
  const atRisk = data?.atRisk || [];
  const overallPresent = data?.overallPresent || 0;
  const overallAbsent = data?.overallAbsent || 0;
  const total = overallPresent + overallAbsent;
  const overallPct = total > 0 ? Math.round((overallPresent / total) * 100) : 0;

  const barData = {
    labels: subjectData.map(s => s.subject.split(' ')[0]),
    datasets: [{ data: subjectData.map(s => s.percent), backgroundColor: subjectData.map(s => s.percent >= 75 ? '#22C55E' : s.percent >= 60 ? '#F59E0B' : '#EF4444'), borderRadius: 8, borderSkipped: false }]
  };

  const pieData = {
    labels: ['Present', 'Absent'],
    datasets: [{ data: [overallPct, 100 - overallPct], backgroundColor: ['#2563EB', '#E5E9F0'], borderWidth: 0, hoverOffset: 4 }]
  };

  const lineData = {
    labels: weeklyTrend.map(d => d.day),
    datasets: [{
      data: weeklyTrend.map(d => d.present),
      fill: true, borderColor: '#2563EB', borderWidth: 2.5,
      backgroundColor: 'rgba(37,99,235,.08)',
      pointBackgroundColor: '#2563EB', pointRadius: 4, tension: .4
    }]
  };

  const lineOpts = { ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, max: undefined, min: 0 } } };

  const handleExportExcel = () => {
    const dataToExport = atRisk.map((s, i) => ({
      'S.No.': i + 1,
      'Student Name': s.name,
      'Roll No / ID': s.roll,
      'Attendance (%)': s.attendancePercent,
      'Status': 'At Risk'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "At Risk Students");
    XLSX.writeFile(wb, `Analytics_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Analytics Report - ${new Date().toLocaleDateString()}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Overall Attendance: ${overallPct}%`, 14, 25);
    doc.text(`Overall Present: ${overallPresent}`, 14, 32);
    doc.text(`Overall Absent: ${overallAbsent}`, 14, 39);
    
    doc.text("At-Risk Students:", 14, 55);
    const tableData = atRisk.map((s, i) => [
      i + 1, s.name, s.roll, `${s.attendancePercent}%`
    ]);
    doc.autoTable({
      head: [['#', 'Student Name', 'Roll No', 'Attendance']],
      body: tableData,
      startY: 60,
    });
    doc.save(`Analytics_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  return (
    <div className="app-layout">
      <Sidebar role="teacher" userName={user?.name || 'Prof. Rajan Singh'} />
      <div className="main-content">
        <Topbar title="Analytics" subtitle="Attendance insights & trends" userName={user?.name || 'Prof. Rajan Singh'} />
        <div className="page-content fade-in">

          {/* Filter */}
          <div className="analytics-toolbar" style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['week', 'month', 'semester'].map(p => (
              <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <div className="analytics-toolbar-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>PDF</span>
              </button>
              <button className="btn btn-sm btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>Excel</span>
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => getAnalytics().then(setData)}>
                <Filter size={13} /> Refresh
              </button>
            </div>
          </div>

          {loading && <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics…</div>}

          {!loading && (
            <>
              {/* Summary stats */}
              <div className="grid grid-4 mb-24">
                {[
                  { label: 'Overall Attendance', value: `${overallPct}%`, color: 'var(--primary)', icon: '📊' },
                  { label: 'Total Present', value: overallPresent, color: 'var(--success)', icon: '✅' },
                  { label: 'Total Absent', value: overallAbsent, color: 'var(--danger)', icon: '❌' },
                  { label: 'At-Risk Students', value: atRisk.length, color: 'var(--warning)', icon: '⚠️' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-2 gap-20 mb-24">
                {/* Bar Chart */}
                <div className="card">
                  <div className="card-header"><span className="card-title">Subject-wise Attendance</span></div>
                  <div className="card-body">
                    {subjectData.length > 0
                      ? <Bar data={barData} options={chartOpts} height={160} />
                      : <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No data yet</p>
                    }
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
                      {[['Safe ≥75%', '#22C55E'], ['Warning 60-74%', '#F59E0B'], ['Danger <60%', '#EF4444']].map(([l, c]) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="card">
                  <div className="card-header"><span className="card-title">Present vs Absent</span></div>
                  <div className="card-body analytics-pie-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                    <div style={{ width: 200 }}><Pie data={pieData} options={{ ...chartOpts, scales: undefined, plugins: { legend: { display: false } } }} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[['Present', `${overallPct}%`, '#2563EB'], ['Absent', `${100 - overallPct}%`, '#E5E9F0']].map(([l, v, c]) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: c, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>{v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Chart */}
              <div className="card mb-24">
                <div className="card-header">
                  <span className="card-title"><TrendingUp size={15} style={{ display: 'inline', marginRight: 6 }} />Weekly Attendance Trend</span>
                </div>
                <div className="card-body">
                  {weeklyTrend.length > 0
                    ? <Line data={lineData} options={lineOpts} height={80} />
                    : <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No trend data yet</p>
                  }
                </div>
              </div>

              {/* At-risk students */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><AlertCircle size={15} style={{ display: 'inline', marginRight: 6, color: 'var(--warning)' }} />At-Risk Students</span>
                  <span className="badge badge-warning">{atRisk.length} students</span>
                </div>
                {atRisk.length === 0
                  ? <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No at-risk students 🎉</div>
                  : (
                    <div className="table-wrap" style={{ border: 'none' }}>
                      <table>
                        <thead><tr><th>Student</th><th>Roll No</th><th>Attendance</th><th>Risk</th></tr></thead>
                        <tbody>
                          {atRisk.map(s => (
                            <tr key={s.id}>
                              <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{s.name.split(' ').map(n => n[0]).join('')}</div>{s.name}</div></td>
                              <td><code style={{ fontSize: 12 }}>{s.roll}</code></td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 999 }}>
                                    <div style={{ height: '100%', width: `${s.attendancePercent}%`, background: s.attendancePercent >= 75 ? 'var(--success)' : 'var(--danger)', borderRadius: 999 }} />
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: 13, color: s.attendancePercent >= 75 ? 'var(--success)' : 'var(--danger)', minWidth: 34 }}>{s.attendancePercent}%</span>
                                </div>
                              </td>
                              <td><span className="badge badge-danger">High Risk</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
