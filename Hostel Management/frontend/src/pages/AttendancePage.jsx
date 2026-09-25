import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AttendancePage.css';

const cleanBedNumber = (bed) => {
  if (!bed) return 'N/A';
  return String(bed).replace(/^bed\s+/i, '').trim();
};

const AttendancePage = () => {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [selectedHostelId, setSelectedHostelId] = useState('');

  // Mode Switch State: 'DAILY' | 'PERIOD'
  const [activeTabMode, setActiveTabMode] = useState('DAILY');

  // Live Real-Time Digital Clock State
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatClockTime = (d) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatClockDate = (d) => {
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Helper date strings
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysAgoString = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFirstDayOfMonthString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // ── DAILY ROLL CALL STATES ──────────────────────────────────────────
  const [attendanceDate, setAttendanceDate] = useState(getTodayString());
  const [attendanceList, setAttendanceList] = useState([]);
  const [markedMap, setMarkedMap] = useState({});
  const [liveTimeMap, setLiveTimeMap] = useState({});
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isUnlockMode, setIsUnlockMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [viewMode, setViewMode] = useState('FLOOR');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickStudent, setQuickStudent] = useState(null);

  // ── PERIOD / RANGE STATES ──────────────────────────────────────────
  const [periodPreset, setPeriodPreset] = useState('WEEK'); // 'WEEK' | 'MONTH' | 'THIS_MONTH' | 'CUSTOM'
  const [periodFrom, setPeriodFrom] = useState(getDaysAgoString(7));
  const [periodTo, setPeriodTo] = useState(getTodayString());
  const [periodRecords, setPeriodRecords] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodSearch, setPeriodSearch] = useState('');

  // Fetch available hostels
  const fetchHostels = async () => {
    try {
      const res = await api.getHostels();
      const list = res.data || (Array.isArray(res) ? res : []);
      setHostels(list);
      if (list.length > 0 && !selectedHostelId) {
        setSelectedHostelId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch hostels:', err);
      setError('Unable to load hostels list.');
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  // Handle Preset Change
  const handlePresetChange = (preset) => {
    setPeriodPreset(preset);
    const todayStr = getTodayString();
    if (preset === 'WEEK') {
      setPeriodFrom(getDaysAgoString(7));
      setPeriodTo(todayStr);
    } else if (preset === 'MONTH') {
      setPeriodFrom(getDaysAgoString(30));
      setPeriodTo(todayStr);
    } else if (preset === 'THIS_MONTH') {
      setPeriodFrom(getFirstDayOfMonthString());
      setPeriodTo(todayStr);
    }
  };

  // Fetch Daily Attendance
  const fetchAttendance = useCallback(async () => {
    if (!selectedHostelId) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.getHostelAttendance(selectedHostelId, attendanceDate);
      const list = res.attendance || res.data || [];
      setAttendanceList(list);
      setSessionInfo(res.sessionInfo || null);
      setIsUnlockMode(false);

      const initialMap = {};
      const initialTimeMap = {};
      list.forEach(item => {
        if (item.status) {
          initialMap[item.studentId] = item.status;
          if (item.marked_at) {
            try {
              initialTimeMap[item.studentId] = new Date(item.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
              initialTimeMap[item.studentId] = '';
            }
          }
        }
      });
      setMarkedMap(initialMap);
      setLiveTimeMap(initialTimeMap);
    } catch (err) {
      console.error('Failed to load hostel attendance:', err);
      setError(err.message || 'Error loading attendance records.');
    } finally {
      setLoading(false);
    }
  }, [selectedHostelId, attendanceDate]);

  // Fetch Multi-Day Period Attendance
  const fetchPeriodData = useCallback(async () => {
    if (!selectedHostelId || !periodFrom || !periodTo) return;
    setPeriodLoading(true);
    setError('');
    try {
      const res = await api.getAttendanceRange({
        hostel_id: selectedHostelId,
        date_from: periodFrom,
        date_to: periodTo
      });
      const list = res.records || res.data || [];
      setPeriodRecords(list);
    } catch (err) {
      console.error('Failed to fetch period attendance range:', err);
      setError(err.message || 'Error loading period attendance records.');
    } finally {
      setPeriodLoading(false);
    }
  }, [selectedHostelId, periodFrom, periodTo]);

  useEffect(() => {
    if (activeTabMode === 'DAILY') {
      fetchAttendance();
    } else if (activeTabMode === 'PERIOD') {
      fetchPeriodData();
    }
  }, [activeTabMode, fetchAttendance, fetchPeriodData]);

  // Toggle Daily status
  const handleToggleStatus = (studentId, status) => {
    const isClearing = markedMap[studentId] === status;
    const newStatus = isClearing ? null : status;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMarkedMap(prev => ({
      ...prev,
      [studentId]: newStatus
    }));

    setLiveTimeMap(prev => ({
      ...prev,
      [studentId]: newStatus ? `${nowTimeStr} (Live)` : ''
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = { ...markedMap };
    const updatedTime = { ...liveTimeMap };
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    attendanceList.forEach(st => {
      updated[st.studentId] = 'PRESENT';
      updatedTime[st.studentId] = `${nowTimeStr} (Live)`;
    });
    setMarkedMap(updated);
    setLiveTimeMap(updatedTime);
  };

  const handleMarkFloorPresent = (floorNum) => {
    const updated = { ...markedMap };
    const updatedTime = { ...liveTimeMap };
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    attendanceList
      .filter(st => Number(st.floor_number ?? 0) === Number(floorNum))
      .forEach(st => {
        updated[st.studentId] = 'PRESENT';
        updatedTime[st.studentId] = `${nowTimeStr} (Live)`;
      });
    setMarkedMap(updated);
    setLiveTimeMap(updatedTime);
  };

  const handleClearAll = () => {
    setMarkedMap({});
    setLiveTimeMap({});
  };

  const handleSaveAttendance = async () => {
    const records = Object.entries(markedMap)
      .filter(([_, status]) => Boolean(status))
      .map(([studentId, status]) => ({
        studentId: Number(studentId),
        status
      }));

    if (records.length === 0) {
      setError('Please mark attendance for at least one student before saving.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.bulkMarkAttendance({
        hostelId: selectedHostelId,
        date: attendanceDate,
        records
      });
      setSuccessMsg(res.message || `Successfully recorded attendance for ${records.length} student(s)!`);
      fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to save attendance records.');
    } finally {
      setSaving(false);
    }
  };

  // Download Daily Roster Excel
  const downloadAttendanceRoster = () => {
    const listToExport = filteredStudents && filteredStudents.length > 0 ? filteredStudents : attendanceList;
    if (!listToExport || listToExport.length === 0) return;
    const currentHostelObj = hostels.find(h => Number(h.id) === Number(selectedHostelId));
    const exportData = listToExport.map((st, idx) => ({
      'S.No': idx + 1,
      'Student Name': st.full_name,
      'Registration / Roll No': st.student_code || `#${st.studentId}`,
      'Branch': st.branch || 'B.Tech',
      'Year': st.year || 1,
      'Floor': `Floor ${st.floor_number ?? 0}`,
      'Room & Bed': `Room ${st.room_number || 'N/A'} - Bed ${cleanBedNumber(st.bed_number)}`,
      'Status': markedMap[st.studentId] || 'UNMARKED',
      'Marked Time': liveTimeMap[st.studentId] || 'Pending'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily_Attendance');
    XLSX.writeFile(workbook, `${currentHostelObj?.code || 'Hostel'}_Attendance_${attendanceDate}.xlsx`);
  };

  // ── PERIOD SUMMARY AGGREGATION ────────────────────────────────────
  const aggregatedPeriodData = React.useMemo(() => {
    const map = {};
    periodRecords.forEach(r => {
      if (!map[r.studentId]) {
        map[r.studentId] = {
          studentId: r.studentId,
          full_name: r.full_name,
          student_code: r.student_code || `#${r.studentId}`,
          course: r.course || 'B.Tech',
          branch: r.branch || 'General',
          floor_number: r.floor_number ?? 0,
          room_number: r.room_number || 'N/A',
          bed_number: r.bed_number || 'N/A',
          presentDays: 0,
          absentDays: 0,
          totalDays: 0,
          dailyMap: {}
        };
      }
      if (r.attendance_date && r.status) {
        const dStr = typeof r.attendance_date === 'string' ? r.attendance_date.substring(0, 10) : new Date(r.attendance_date).toISOString().split('T')[0];
        map[r.studentId].dailyMap[dStr] = r.status;
        if (r.status === 'PRESENT') map[r.studentId].presentDays += 1;
        if (r.status === 'ABSENT') map[r.studentId].absentDays += 1;
        map[r.studentId].totalDays += 1;
      }
    });

    return Object.values(map).map(st => {
      const rate = st.totalDays > 0 ? Math.round((st.presentDays / st.totalDays) * 100) : 0;
      return { ...st, attendanceRate: rate };
    });
  }, [periodRecords]);

  // Filtered Period Students
  const filteredPeriodData = React.useMemo(() => {
    return aggregatedPeriodData.filter(st => {
      return (
        st.full_name?.toLowerCase().includes(periodSearch.toLowerCase()) ||
        st.student_code?.toLowerCase().includes(periodSearch.toLowerCase()) ||
        st.room_number?.toString().includes(periodSearch) ||
        st.branch?.toLowerCase().includes(periodSearch.toLowerCase())
      );
    });
  }, [aggregatedPeriodData, periodSearch]);

  // Download Multi-Day Period Excel
  const downloadPeriodAttendanceExcel = () => {
    if (!aggregatedPeriodData || aggregatedPeriodData.length === 0) return;
    const currentHostelObj = hostels.find(h => Number(h.id) === Number(selectedHostelId));
    
    // Generate dates array between periodFrom and periodTo
    const dates = [];
    let curr = new Date(periodFrom);
    const end = new Date(periodTo);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const listToExport = filteredPeriodData.length > 0 ? filteredPeriodData : aggregatedPeriodData;
    const exportData = listToExport.map((st, idx) => {
      const row = {
        'S.No': idx + 1,
        'Student Name': st.full_name,
        'Registration / Roll No': st.student_code,
        'Course & Branch': `${st.course} - ${st.branch}`,
        'Floor': `Floor ${st.floor_number}`,
        'Room & Bed': `Room ${st.room_number} - Bed ${cleanBedNumber(st.bed_number)}`,
        'Total Marked Days': st.totalDays,
        'Days Present': st.presentDays,
        'Days Absent': st.absentDays,
        'Attendance Rate (%)': `${st.attendanceRate}%`
      };

      // Append daily date status columns
      dates.forEach(d => {
        const s = st.dailyMap[d];
        row[d] = s === 'PRESENT' ? 'P' : (s === 'ABSENT' ? 'A' : '-');
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Period_Attendance_Report');
    XLSX.writeFile(workbook, `${currentHostelObj?.code || 'Hostel'}_Attendance_${periodFrom}_to_${periodTo}.xlsx`);
  };

  const isLockedSession = Boolean(sessionInfo?.isLocked) && !isUnlockMode;

  // KPI Calculations (Daily)
  const totalStudents = attendanceList.length;
  const presentCount = Object.values(markedMap).filter(v => v === 'PRESENT').length;
  const absentCount = Object.values(markedMap).filter(v => v === 'ABSENT').length;
  const markedCount = presentCount + absentCount;
  const unmarkedCount = Math.max(0, totalStudents - markedCount);
  const attendanceRate = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;
  const completionPercentage = totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0;

  // Filtered student list (Daily)
  const filteredStudents = attendanceList.filter(st => {
    const matchesSearch = (
      st.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.student_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.room_number?.toString().includes(searchTerm) ||
      st.bed_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentStatus = markedMap[st.studentId];
    if (statusFilter === 'PRESENT') return matchesSearch && currentStatus === 'PRESENT';
    if (statusFilter === 'ABSENT') return matchesSearch && currentStatus === 'ABSENT';
    if (statusFilter === 'UNMARKED') return matchesSearch && !currentStatus;
    return matchesSearch;
  });

  // Group by floor (Daily)
  const floorGroups = {};
  filteredStudents.forEach(st => {
    const floorKey = st.floor_number ?? 0;
    if (!floorGroups[floorKey]) {
      floorGroups[floorKey] = [];
    }
    floorGroups[floorKey].push(st);
  });
  const sortedFloorKeys = Object.keys(floorGroups).sort((a, b) => Number(a) - Number(b));
  const currentHostelObj = hostels.find(h => Number(h.id) === Number(selectedHostelId));

  return (
    <div className="attendance-page-container">
      {/* ── REDESIGNED PREMIUM HEADER CARD ────────────────────────────────── */}
      <div className="attendance-header-card">
        <div className="header-flex-row">
          <div className="header-main-title">
            <div className="header-icon-avatar">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div>
              <h1 className="attendance-title">Hostel Attendance Register</h1>
              <p className="attendance-subtitle">
                Digital roll call console, multi-day period compliance, and automated reporting engine
              </p>
            </div>
          </div>

          <div className="realtime-clock-widget">
            <div className="clock-digits">
              {formatClockTime(now)}
            </div>
            <div className="clock-meta">
              <span className="clock-date">{formatClockDate(now)}</span>
              <span className="clock-status-live">
                <span className="pulse-dot"></span> Realtime Sync Active
              </span>
            </div>
          </div>
        </div>

        {/* MODE SWITCH TABS: Daily Roll Call vs Period Report */}
        <div className="mode-switcher-container">
          <button 
            type="button"
            className={`mode-switch-btn ${activeTabMode === 'DAILY' ? 'active' : ''}`}
            onClick={() => setActiveTabMode('DAILY')}
          >
            <i className="fa-solid fa-clipboard-user"></i> Daily Roll Call
          </button>
          <button 
            type="button"
            className={`mode-switch-btn ${activeTabMode === 'PERIOD' ? 'active' : ''}`}
            onClick={() => setActiveTabMode('PERIOD')}
          >
            <i className="fa-solid fa-calendar-days"></i> Multi-Day Period Filter & Export
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffe4e6', color: '#be123c', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fecdd3' }}>
          <i className="fa-solid fa-circle-exclamation text-lg"></i>
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#be123c', fontWeight: 700 }}>×</button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dcfce7', color: '#15803d', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <i className="fa-solid fa-circle-check text-lg"></i>
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* ── TAB 1: DAILY ROLL CALL VIEW ────────────────────────────────────── */}
      {activeTabMode === 'DAILY' && (
        <>
          {/* Daily Attendance Lock & Session Status Banner */}
          {sessionInfo?.isLocked && (
            <div className="attendance-lock-banner">
              <div className="lock-banner-info">
                <div className="lock-banner-icon">
                  <i className={`fa-solid ${isUnlockMode ? 'fa-lock-open' : 'fa-lock'}`}></i>
                </div>
                <div>
                  <h3 className="lock-banner-title">
                    {isUnlockMode 
                      ? 'Modification Mode Enabled (Editing Finalized Session)' 
                      : `Roll Call Completed & Locked for ${attendanceDate}`}
                  </h3>
                  <p className="lock-banner-sub">
                    {sessionInfo.markedBy 
                      ? `Submitted by ${sessionInfo.markedBy} ${sessionInfo.markedAt ? `at ${new Date(sessionInfo.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}` 
                      : 'Daily roll call is finalized for this date.'}
                    {!isUnlockMode && ' Controls are locked to enforce 1-roll-call-per-day rule.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-unlock-session"
                  onClick={() => setIsUnlockMode(prev => !prev)}
                >
                  <i className={`fa-solid ${isUnlockMode ? 'fa-lock' : 'fa-pen-to-square'}`}></i>
                  {isUnlockMode ? 'Lock Session' : 'Unlock to Edit'}
                </button>
                <button
                  type="button"
                  className="btn-bulk btn-bulk-present"
                  onClick={downloadAttendanceRoster}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#059669' }}
                >
                  <i className="fa-solid fa-file-excel"></i> Export Excel
                </button>
              </div>
            </div>
          )}

          {/* Control Bar: Hostel & Date Selection */}
          <div className="attendance-controls-card">
            <div className="controls-flex-row">
              <div className="control-item-group">
                <span className="control-label">Hostel Residence:</span>
                <select 
                  className="modern-select"
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  style={{ minWidth: '240px' }}
                >
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              <div className="control-item-group" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="control-label">Roll Call Date:</span>
                <input 
                  type="date"
                  className="modern-date-input"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />

                <button 
                  type="button" 
                  className={`quick-date-btn ${attendanceDate === getTodayString() ? 'active' : ''}`}
                  onClick={() => setAttendanceDate(getTodayString())}
                >
                  <i className="fa-solid fa-clock"></i> Today
                </button>
                <button 
                  type="button" 
                  className={`quick-date-btn ${attendanceDate === getYesterdayString() ? 'active' : ''}`}
                  onClick={() => setAttendanceDate(getYesterdayString())}
                >
                  <i className="fa-solid fa-rotate-left"></i> Yesterday
                </button>

                <button 
                  type="button" 
                  className="quick-date-btn"
                  onClick={downloadAttendanceRoster}
                  style={{ background: '#059669', color: '#ffffff', borderColor: '#059669', marginLeft: 'auto', fontWeight: 700 }}
                  title="Download Excel Attendance Report"
                >
                  <i className="fa-solid fa-file-excel"></i> Export Attendance (Excel)
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="attendance-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-indigo">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="kpi-details">
                <div className="kpi-val">{totalStudents}</div>
                <div className="kpi-label">Total Enrolled</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-emerald">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="kpi-details">
                <div className="kpi-val" style={{ color: '#15803d' }}>{presentCount}</div>
                <div className="kpi-label">Present</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-rose">
                <i className="fa-solid fa-circle-xmark"></i>
              </div>
              <div className="kpi-details">
                <div className="kpi-val" style={{ color: '#be123c' }}>{absentCount}</div>
                <div className="kpi-label">Absent</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-amber">
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
              <div className="kpi-details">
                <div className="kpi-val" style={{ color: '#b45309' }}>{unmarkedCount}</div>
                <div className="kpi-label">Unmarked</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-blue">
                <i className="fa-solid fa-chart-pie"></i>
              </div>
              <div className="kpi-details">
                <div className="kpi-val" style={{ color: '#0369a1' }}>{attendanceRate}%</div>
                <div className="kpi-label">Attendance Rate</div>
              </div>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="completion-progress-card">
            <div className="progress-flex">
              <span>
                <i className="fa-solid fa-list-check"></i> Roll Call Progress ({markedCount} / {totalStudents} Marked)
              </span>
              <span className="progress-percentage">{completionPercentage}% Complete</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${completionPercentage}%` }}></div>
            </div>
          </div>

          {/* Toolbar: Search, Filters & Bulk Actions */}
          <div className="attendance-toolbar-card">
            <div className="toolbar-flex">
              <div className="search-input-box">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input 
                  type="text"
                  placeholder="Search student by name, registration no, room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-pill-group">
                <button 
                  type="button" 
                  className={`pill-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  All ({attendanceList.length})
                </button>
                <button 
                  type="button" 
                  className={`pill-btn ${statusFilter === 'UNMARKED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('UNMARKED')}
                >
                  Unmarked ({unmarkedCount})
                </button>
                <button 
                  type="button" 
                  className={`pill-btn ${statusFilter === 'PRESENT' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('PRESENT')}
                >
                  Present ({presentCount})
                </button>
                <button 
                  type="button" 
                  className={`pill-btn ${statusFilter === 'ABSENT' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('ABSENT')}
                >
                  Absent ({absentCount})
                </button>
              </div>

              {!isLockedSession && (
                <div className="bulk-actions-group" style={{ marginLeft: 'auto' }}>
                  <button 
                    type="button" 
                    className="btn-bulk btn-bulk-present"
                    onClick={handleMarkAllPresent}
                  >
                    <i className="fa-solid fa-check-double"></i> Mark All Present
                  </button>
                  <button 
                    type="button" 
                    className="btn-bulk btn-bulk-reset"
                    onClick={handleClearAll}
                  >
                    <i className="fa-solid fa-rotate"></i> Reset
                  </button>
                </div>
              )}

              <div className="view-mode-toggle">
                <button 
                  type="button" 
                  className={`toggle-btn ${viewMode === 'FLOOR' ? 'active' : ''}`}
                  onClick={() => setViewMode('FLOOR')}
                  title="Grouped by Floor"
                >
                  <i className="fa-solid fa-layer-group"></i> Floor View
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${viewMode === 'FLAT' ? 'active' : ''}`}
                  onClick={() => setViewMode('FLAT')}
                  title="Flat Student List"
                >
                  <i className="fa-solid fa-table-list"></i> Flat List
                </button>
              </div>
            </div>
          </div>

          {/* Student Grid / List Area */}
          {loading ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <i className="fa-solid fa-circle-notch fa-spin text-3xl" style={{ color: '#4f46e5', marginBottom: '12px' }}></i>
              <p style={{ margin: 0, fontWeight: 600 }}>Fetching hostel roll call dataset...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="card" style={{ padding: '50px', textAlign: 'center', color: '#64748b', borderRadius: '16px' }}>
              <i className="fa-solid fa-user-slash text-4xl mb-3" style={{ color: '#94a3b8' }}></i>
              <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>No Students Found</h3>
              <p style={{ margin: 0 }}>No student records match the selected filter criteria.</p>
            </div>
          ) : viewMode === 'FLOOR' ? (
            <div className="floors-container">
              {sortedFloorKeys.map(floorKey => (
                <div key={floorKey} className="floor-card">
                  <div className="floor-header">
                    <div className="floor-title-group">
                      <span className="floor-badge">Floor {floorKey}</span>
                      <span className="floor-count-sub">
                        ({floorGroups[floorKey].length} Students)
                      </span>
                    </div>

                    {!isLockedSession && (
                      <button 
                        type="button" 
                        className="btn-mark-floor-present"
                        onClick={() => handleMarkFloorPresent(floorKey)}
                      >
                        <i className="fa-solid fa-check"></i> Mark Floor Present
                      </button>
                    )}
                  </div>

                  <div className="students-grid">
                    {floorGroups[floorKey].map(st => {
                      const currentStatus = markedMap[st.studentId];
                      const timePreview = liveTimeMap[st.studentId];

                      return (
                        <div 
                          key={st.studentId} 
                          className={`student-card ${currentStatus === 'PRESENT' ? 'status-present' : (currentStatus === 'ABSENT' ? 'status-absent' : '')}`}
                        >
                          <div className="student-card-top">
                            <div className="student-info-flex" onClick={() => setQuickStudent(st)} style={{ cursor: 'pointer' }}>
                              <div className="student-avatar font-bold">
                                {st.photo_url ? (
                                  <img src={st.photo_url} alt={st.full_name} />
                                ) : (
                                  st.full_name ? st.full_name.substring(0, 2).toUpperCase() : 'ST'
                                )}
                              </div>
                              <div>
                                <h4 className="student-name">{st.full_name}</h4>
                                <span className="room-bed-badge">
                                  Room {st.room_number || 'N/A'} - Bed {st.bed_number || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="student-code-row">
                            <span>REG: <code>{st.student_code || `#${st.studentId}`}</code></span>
                            {timePreview && <span className="time-preview">{timePreview}</span>}
                          </div>

                          <div className="attendance-toggle-buttons">
                            <button
                              type="button"
                              disabled={isLockedSession}
                              className={`toggle-btn-status btn-present ${currentStatus === 'PRESENT' ? 'active' : ''}`}
                              onClick={() => handleToggleStatus(st.studentId, 'PRESENT')}
                            >
                              <i className="fa-solid fa-check"></i> Present
                            </button>
                            <button
                              type="button"
                              disabled={isLockedSession}
                              className={`toggle-btn-status btn-absent ${currentStatus === 'ABSENT' ? 'active' : ''}`}
                              onClick={() => handleToggleStatus(st.studentId, 'ABSENT')}
                            >
                              <i className="fa-solid fa-xmark"></i> Absent
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Flat List Table View */
            <div className="card shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Student Name</th>
                      <th>Roll / Reg No</th>
                      <th>Floor</th>
                      <th>Room & Bed</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                      {!isLockedSession && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st, idx) => {
                      const currentStatus = markedMap[st.studentId];
                      return (
                        <tr key={st.studentId}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong style={{ color: '#0f172a', cursor: 'pointer' }} onClick={() => setQuickStudent(st)}>
                              {st.full_name}
                            </strong>
                          </td>
                          <td><code>{st.student_code || `#${st.studentId}`}</code></td>
                          <td>Floor {st.floor_number ?? 0}</td>
                          <td>Room {st.room_number || 'N/A'} - Bed {cleanBedNumber(st.bed_number)}</td>
                          <td>
                            <span className={`profile-tag ${currentStatus === 'PRESENT' ? 'tag-active' : (currentStatus === 'ABSENT' ? 'tag-inactive' : '')}`}>
                              ● {currentStatus || 'UNMARKED'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {liveTimeMap[st.studentId] || 'Pending'}
                          </td>
                          {!isLockedSession && (
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button 
                                  type="button" 
                                  className={`quick-date-btn ${currentStatus === 'PRESENT' ? 'active' : ''}`}
                                  style={{ padding: '4px 10px', fontSize: '0.775rem' }}
                                  onClick={() => handleToggleStatus(st.studentId, 'PRESENT')}
                                >
                                  Present
                                </button>
                                <button 
                                  type="button" 
                                  className={`quick-date-btn ${currentStatus === 'ABSENT' ? 'active' : ''}`}
                                  style={{ padding: '4px 10px', fontSize: '0.775rem', color: '#be123c', borderColor: '#fecdd3' }}
                                  onClick={() => handleToggleStatus(st.studentId, 'ABSENT')}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sticky Bottom Save Bar */}
          {!isLockedSession && (
            <div className="sticky-save-bar">
              <div className="save-bar-content">
                <div className="save-bar-info">
                  <span className="save-bar-title">Attendance Roll Call Session Active</span>
                  <span className="save-bar-meta">
                    {markedCount} of {totalStudents} students marked ({unmarkedCount} remaining)
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-save-attendance"
                  disabled={saving || markedCount === 0}
                  onClick={handleSaveAttendance}
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up"></i> Finalize & Lock Attendance Session
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: MULTI-DAY PERIOD FILTER & EXPORT REPORT VIEW ───────────── */}
      {activeTabMode === 'PERIOD' && (
        <div className="period-container">
          {/* Period Filter Card */}
          <div className="period-filter-card card">
            <div className="controls-flex-row">
              <div className="control-item-group">
                <span className="control-label">Target Hostel:</span>
                <select 
                  className="modern-select"
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  style={{ minWidth: '240px' }}
                >
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              <div className="control-item-group" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="control-label">Period Presets:</span>
                <button 
                  type="button" 
                  className={`quick-date-btn ${periodPreset === 'WEEK' ? 'active' : ''}`}
                  onClick={() => handlePresetChange('WEEK')}
                >
                  <i className="fa-solid fa-calendar-week"></i> Last 7 Days (Week)
                </button>
                <button 
                  type="button" 
                  className={`quick-date-btn ${periodPreset === 'MONTH' ? 'active' : ''}`}
                  onClick={() => handlePresetChange('MONTH')}
                >
                  <i className="fa-solid fa-calendar-days"></i> Last 30 Days (Month)
                </button>
                <button 
                  type="button" 
                  className={`quick-date-btn ${periodPreset === 'THIS_MONTH' ? 'active' : ''}`}
                  onClick={() => handlePresetChange('THIS_MONTH')}
                >
                  <i className="fa-solid fa-calendar"></i> This Month
                </button>
              </div>
            </div>

            <div className="controls-flex-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div className="control-item-group">
                <span className="control-label">From Date:</span>
                <input 
                  type="date"
                  className="modern-date-input"
                  value={periodFrom}
                  onChange={(e) => {
                    setPeriodFrom(e.target.value);
                    setPeriodPreset('CUSTOM');
                  }}
                />
              </div>

              <div className="control-item-group">
                <span className="control-label">To Date:</span>
                <input 
                  type="date"
                  className="modern-date-input"
                  value={periodTo}
                  onChange={(e) => {
                    setPeriodTo(e.target.value);
                    setPeriodPreset('CUSTOM');
                  }}
                />
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={fetchPeriodData}
                  disabled={periodLoading}
                  style={{ padding: '8px 18px', fontWeight: 700 }}
                >
                  {periodLoading ? (
                    <><i className="fa-solid fa-spin fa-circle-notch"></i> Loading...</>
                  ) : (
                    <><i className="fa-solid fa-filter"></i> Apply Filter</>
                  )}
                </button>

                <button 
                  type="button"
                  className="btn btn-success"
                  onClick={downloadPeriodAttendanceExcel}
                  disabled={aggregatedPeriodData.length === 0}
                  style={{ background: '#059669', borderColor: '#059669', color: '#ffffff', padding: '8px 18px', fontWeight: 700 }}
                >
                  <i className="fa-solid fa-file-excel mr-1"></i> Export Period Attendance (Excel)
                </button>
              </div>
            </div>
          </div>

          {/* Search Toolbar for Period View */}
          <div className="attendance-toolbar-card" style={{ marginBottom: '20px' }}>
            <div className="toolbar-flex">
              <div className="search-input-box" style={{ flex: 1 }}>
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input 
                  type="text"
                  placeholder="Search multi-day report by student name, roll no, branch, room..."
                  value={periodSearch}
                  onChange={(e) => setPeriodSearch(e.target.value)}
                />
              </div>
              <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>
                Showing {filteredPeriodData.length} Student Summary Records ({periodFrom} to {periodTo})
              </div>
            </div>
          </div>

          {/* Period Summary Table */}
          {periodLoading ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <i className="fa-solid fa-circle-notch fa-spin text-3xl" style={{ color: '#4f46e5', marginBottom: '12px' }}></i>
              <p style={{ margin: 0, fontWeight: 600 }}>Aggregating multi-day attendance history...</p>
            </div>
          ) : filteredPeriodData.length === 0 ? (
            <div className="card" style={{ padding: '50px', textAlign: 'center', color: '#64748b', borderRadius: '16px' }}>
              <i className="fa-solid fa-calendar-xmark text-4xl mb-3" style={{ color: '#94a3b8' }}></i>
              <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>No Period Records Found</h3>
              <p style={{ margin: 0 }}>Select a hostel and valid date range to inspect multi-day attendance logs.</p>
            </div>
          ) : (
            <div className="card shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Student Name</th>
                      <th>Roll / Reg No</th>
                      <th>Course & Branch</th>
                      <th>Floor / Room / Bed</th>
                      <th>Total Days</th>
                      <th>Days Present</th>
                      <th>Days Absent</th>
                      <th>Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeriodData.map((st, idx) => (
                      <tr key={st.studentId}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{st.full_name}</strong>
                        </td>
                        <td><code>{st.student_code}</code></td>
                        <td>{st.course} - {st.branch}</td>
                        <td>Floor {st.floor_number} | R-{st.room_number} B-{st.bed_number}</td>
                        <td><strong>{st.totalDays}</strong></td>
                        <td className="text-success font-bold">{st.presentDays}</td>
                        <td className="text-danger font-bold">{st.absentDays}</td>
                        <td>
                          <span className={`profile-tag ${st.attendanceRate >= 75 ? 'tag-active' : 'tag-inactive'}`}>
                            ● {st.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student Quick Contact & Info Modal Overlay */}
      {quickStudent && (
        <div className="student-quick-modal-overlay" onClick={() => setQuickStudent(null)}>
          <div className="student-quick-modal-card" onClick={e => e.stopPropagation()}>
            <div className="quick-modal-header">
              <div className="quick-avatar font-bold">
                {quickStudent.photo_url ? (
                  <img src={quickStudent.photo_url} alt={quickStudent.full_name} />
                ) : (
                  quickStudent.full_name ? quickStudent.full_name.substring(0, 2).toUpperCase() : 'ST'
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  {quickStudent.full_name}
                </h2>
                <span className="room-bed-badge">
                  Room {quickStudent.room_number || 'N/A'} - Bed {quickStudent.bed_number || 'N/A'}
                </span>
              </div>
            </div>

            <div className="quick-modal-body">
              <div className="info-row">
                <span style={{ color: '#64748b', fontWeight: 600 }}>Registration / Roll No:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{quickStudent.student_code || `#${quickStudent.studentId}`}</span>
              </div>
              <div className="info-row">
                <span style={{ color: '#64748b', fontWeight: 600 }}>Course & Branch:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{quickStudent.course || 'B.Tech'} - {quickStudent.branch || 'General'}</span>
              </div>
              <div className="info-row">
                <span style={{ color: '#64748b', fontWeight: 600 }}>Floor Location:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Floor {quickStudent.floor_number ?? '0'}</span>
              </div>
              <div className="info-row">
                <span style={{ color: '#64748b', fontWeight: 600 }}>Contact Number:</span>
                <span style={{ fontWeight: 700, color: '#4f46e5' }}>{quickStudent.phone || 'Not Provided'}</span>
              </div>
              <div className="info-row">
                <span style={{ color: '#64748b', fontWeight: 600 }}>Hostel Residence:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{currentHostelObj?.name || 'Main Hostel'}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {quickStudent.phone && (
                <a 
                  href={`tel:${quickStudent.phone}`} 
                  className="btn-bulk btn-bulk-present" 
                  style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-phone"></i> Call Student
                </a>
              )}
              <button 
                type="button" 
                className="btn-bulk btn-bulk-reset" 
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setQuickStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
