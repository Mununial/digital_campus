import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import MealCard from '../components/mess/MealCard';
import WeeklyMenu from '../components/mess/WeeklyMenu';
import MenuFormModal from '../components/mess/MenuFormModal';
import CopyMenuModal from '../components/mess/CopyMenuModal';
import MessAnalyticsCard from '../components/mess/MessAnalyticsCard';
import ComplaintFormModal from '../components/complaints/ComplaintFormModal';
import './MessPage.css';

const MessPage = ({ userRole = 'STUDENT' }) => {
  const [activeTab, setActiveTab] = useState('WEEKLY'); // Default to WEEKLY time-table view
  const [hostels, setHostels] = useState([]);
  const [selectedHostelId, setSelectedHostelId] = useState('');
  
  const [todayMenu, setTodayMenu] = useState([]);
  const [weeklyData, setWeeklyData] = useState(null);
  const [myParticipation, setMyParticipation] = useState([]);
  const [rosterData, setRosterData] = useState({ records: [], total: 0, page: 1, totalPages: 1 });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [summary, setSummary] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [rosterPage, setRosterPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & form state
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [modalInitialDate, setModalInitialDate] = useState(null);
  const [modalInitialMealType, setModalInitialMealType] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [updatingMeal, setUpdatingMeal] = useState(null);

  // Fetch Hostels for Staff
  useEffect(() => {
    if (userRole !== 'STUDENT') {
      api.get('/hostels')
        .then(res => {
          const raw = res.data;
          const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
          setHostels(list);
          if (list.length > 0 && !selectedHostelId) {
            setSelectedHostelId(String(list[0].id));
          }
        })
        .catch(err => console.error('Failed to load hostels list:', err));
    }
  }, [userRole, selectedHostelId]);

  // Main data loader
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = { hostel_id: selectedHostelId || undefined };

      const [menuRes, weeklyRes, sumRes] = await Promise.all([
        api.getTodayMessMenu(params),
        api.getWeeklyMessMenu(params),
        api.getMessSummary(params)
      ]);

      if (menuRes.data?.success) setTodayMenu(menuRes.data.data || []);
      if (weeklyRes.data?.success) setWeeklyData(weeklyRes.data);
      if (sumRes.data?.success) setSummary(sumRes.data.data);

      if (userRole === 'STUDENT') {
        const partRes = await api.getMyMealParticipation();
        if (partRes.data?.success) {
          const records = partRes.data.data?.records || [];
          const todayStr = new Date().toISOString().split('T')[0];
          setMyParticipation(records.filter(r => new Date(r.meal_date).toISOString().split('T')[0] === todayStr));
        }
      } else {
        // Fetch roster and analytics for staff
        const [rosterRes, analyticsRes] = await Promise.all([
          api.getMealParticipationRoster({
            hostel_id: selectedHostelId || undefined,
            page: rosterPage,
            limit: 15,
            search: searchQuery
          }),
          api.getMessAnalytics(params)
        ]);

        if (rosterRes.data?.success) setRosterData(rosterRes.data.data);
        if (analyticsRes.data?.success) setAnalyticsData(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Error loading mess page data:', err);
      setError('Failed to load mess management data.');
    } finally {
      setLoading(false);
    }
  }, [selectedHostelId, userRole, rosterPage, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Student toggle handler
  const handleToggleParticipation = async (mealType, status) => {
    try {
      setUpdatingMeal(mealType);
      const todayStr = new Date().toISOString().split('T')[0];
      await api.setMealParticipation({
        meal_date: todayStr,
        meal_type: mealType,
        status
      });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set meal status.');
    } finally {
      setUpdatingMeal(null);
    }
  };

  // Staff Menu CRUD handlers
  const handleCreateOrUpdateMenu = async (formData) => {
    try {
      if (editingMenuItem && editingMenuItem.id) {
        await api.updateMessMenuItem(editingMenuItem.id, formData);
      } else {
        // If creating, try to find existing for same date & meal_type to update, or create new
        try {
          await api.createMessMenuItem(formData);
        } catch (err) {
          // If already exists, find and update
          const existingItem = (weeklyData?.items || []).find(
            item => String(item.menu_date).substring(0, 10) === formData.menu_date && item.meal_type === formData.meal_type
          );
          if (existingItem) {
            await api.updateMessMenuItem(existingItem.id, formData);
          } else {
            throw err;
          }
        }
      }
      setIsMenuModalOpen(false);
      setEditingMenuItem(null);
      await loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.deleteMessMenuItem(id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete menu item.');
    }
  };

  const handleCopyDayMenu = async ({ sourceDate, targetDates }) => {
    try {
      await api.post('/mess/menu/copy', {
        hostel_id: selectedHostelId || undefined,
        sourceDate,
        targetDates
      });
      setIsCopyModalOpen(false);
      await loadData();
      alert(`Menu copied successfully from ${sourceDate} to ${targetDates.length} day(s)!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to copy menu.');
    }
  };

  const handleOpenAddForDay = (dayName, dateStr, mealType = 'BREAKFAST') => {
    setEditingMenuItem(null);
    setModalInitialDate(dateStr);
    setModalInitialMealType(mealType);
    setIsMenuModalOpen(true);
  };

  const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'];
  const canManage = userRole === 'SUPER_ADMIN' || userRole === 'SUPERINTENDENT';

  return (
    <div className="mess-page-container">
      {/* Page Banner Header */}
      <div className="mess-header flex-between align-center">
        <div>
          <div className="mess-badge-row">
            <span className="mess-portal-badge">HOSTEL MESS TIMETABLE</span>
            {canManage && <span className="warden-status-pill">Warden Editing Enabled</span>}
          </div>
          <h2 className="mess-main-title">Hostel Mess & Food Schedule</h2>
          <p className="mess-subtitle">Weekly meal time-table for Breakfast, Lunch & Dinner</p>
        </div>

        <div className="header-action-group flex-gap">
          {userRole === 'STUDENT' && (
            <button
              type="button"
              className="btn btn-outline-warning"
              onClick={() => setIsComplaintModalOpen(true)}
            >
              Report Mess Issue
            </button>
          )}

          {canManage && (
            <div className="flex-gap align-center">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsCopyModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-copy"></i> 📋 Copy Day Menu
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingMenuItem(null);
                  setModalInitialDate(new Date().toISOString().split('T')[0]);
                  setModalInitialMealType('BREAKFAST');
                  setIsMenuModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-plus"></i> Add / Edit Dish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar for Admin/Warden */}
      {canManage && hostels.length > 0 && (
        <div className="card toolbar-card margin-bottom">
          <div className="toolbar-row flex-between align-center">
            <div className="filter-group flex-gap align-center">
              <label htmlFor="hostel-filter" className="filter-label" style={{ fontWeight: 600 }}>Select Hostel Schedule:</label>
              <select
                id="hostel-filter"
                value={selectedHostelId}
                onChange={(e) => setSelectedHostelId(e.target.value)}
                className="form-select form-select-sm"
                style={{ minWidth: '220px', fontWeight: 600, color: '#334155' }}
              >
                {userRole === 'SUPER_ADMIN' && <option value="">All Hostels (Common Time-Table)</option>}
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <span className="timetable-info-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>
              <i className="fa-solid fa-bolt text-amber-500 mr-1"></i>
              Live Schedule: Changes update student portal in real-time
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mess-tabs-nav margin-bottom">
        <button
          type="button"
          className={`mess-tab-btn ${activeTab === 'WEEKLY' ? 'active' : ''}`}
          onClick={() => setActiveTab('WEEKLY')}
        >
          Weekly Time-Table
        </button>
        <button
          type="button"
          className={`mess-tab-btn ${activeTab === 'TODAY' ? 'active' : ''}`}
          onClick={() => setActiveTab('TODAY')}
        >
          Today's Food ({new Date().toLocaleDateString('en-US', { weekday: 'short' })})
        </button>
        {canManage && (
          <>
            <button
              type="button"
              className={`mess-tab-btn ${activeTab === 'ROSTER' ? 'active' : ''}`}
              onClick={() => setActiveTab('ROSTER')}
            >
              Student Opt-in Roster
            </button>
            <button
              type="button"
              className={`mess-tab-btn ${activeTab === 'ANALYTICS' ? 'active' : ''}`}
              onClick={() => setActiveTab('ANALYTICS')}
            >
              Consumption Analytics
            </button>
          </>
        )}
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* TAB CONTENT 1: WEEKLY TIME-TABLE */}
      {activeTab === 'WEEKLY' && (
        <div className="tab-content">
          <WeeklyMenu
            weeklyData={weeklyData}
            onEditItem={(item) => {
              setEditingMenuItem(item);
              setIsMenuModalOpen(true);
            }}
            onDeleteItem={handleDeleteMenuItem}
            onAddForDay={handleOpenAddForDay}
            canManage={canManage}
          />
        </div>
      )}

      {/* TAB CONTENT 2: TODAY'S MENU */}
      {activeTab === 'TODAY' && (
        <div className="tab-content">
          <div className="today-menu-banner flex-between align-center mb-4">
            <div>
              <h3>Today's Serving Schedule</h3>
              <p className="text-muted">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  setEditingMenuItem(null);
                  setModalInitialDate(new Date().toISOString().split('T')[0]);
                  setIsMenuModalOpen(true);
                }}
              >
                + Edit Today's Dishes
              </button>
            )}
          </div>

          <div className="mess-meals-grid">
            {mealTypes.map(mealType => {
              const menuItem = todayMenu.find(m => m.meal_type === mealType);
              const participation = myParticipation.find(p => p.meal_type === mealType);

              return (
                <MealCard
                  key={mealType}
                  mealType={mealType}
                  menuItem={menuItem}
                  participation={participation}
                  onToggleParticipation={handleToggleParticipation}
                  isStudent={userRole === 'STUDENT'}
                  isUpdating={updatingMeal === mealType}
                  onEdit={(item) => {
                    setEditingMenuItem(item);
                    setIsMenuModalOpen(true);
                  }}
                  canManage={canManage}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: STUDENT ROSTER (STAFF ONLY) */}
      {activeTab === 'ROSTER' && canManage && (
        <div className="tab-content">
          <div className="card toolbar-card margin-bottom">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search student name, ID, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Student Code</th>
                    <th>Room</th>
                    <th>Date</th>
                    <th>Meal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.records.length > 0 ? (
                    rosterData.records.map(rec => (
                      <tr key={rec.id}>
                        <td><strong>{rec.student_name}</strong></td>
                        <td>{rec.student_code}</td>
                        <td>{rec.room_number || '-'}</td>
                        <td>{new Date(rec.meal_date).toLocaleDateString()}</td>
                        <td><span className="meal-tag-pill">{rec.meal_type}</span></td>
                        <td>
                          <span className={`status-pill ${rec.status === 'TAKING' ? 'status-approved' : 'status-rejected'}`}>
                            {rec.status === 'TAKING' ? '✓ Taking' : '✕ Skipping'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center p-4 text-muted">
                        No student meal participation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {rosterData.totalPages > 1 && (
              <div className="pagination-bar flex-between align-center p-3">
                <span>Page {rosterData.page} of {rosterData.totalPages} ({rosterData.total} records)</span>
                <div className="flex-gap">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={rosterPage <= 1}
                    onClick={() => setRosterPage(prev => Math.max(1, prev - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={rosterPage >= rosterData.totalPages}
                    onClick={() => setRosterPage(prev => Math.min(rosterData.totalPages, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: MESS ANALYTICS (STAFF ONLY) */}
      {activeTab === 'ANALYTICS' && canManage && (
        <div className="tab-content">
          <MessAnalyticsCard analyticsData={analyticsData} />
        </div>
      )}

      {/* Menu Form Modal */}
      <MenuFormModal
        isOpen={isMenuModalOpen}
        onClose={() => {
          setIsMenuModalOpen(false);
          setEditingMenuItem(null);
        }}
        onSubmit={handleCreateOrUpdateMenu}
        editItem={editingMenuItem}
        initialDate={modalInitialDate}
        initialMealType={modalInitialMealType}
        hostels={hostels}
        selectedHostelId={selectedHostelId}
        userRole={userRole}
      />

      {/* Mess Complaint Modal */}
      <ComplaintFormModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        defaultCategory="FOOD_MESS"
        onSubmitSuccess={() => {
          setIsComplaintModalOpen(false);
          alert('Mess complaint submitted successfully.');
        }}
      />

      {/* Copy Day Menu Modal */}
      <CopyMenuModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        onSubmit={handleCopyDayMenu}
        weeklyData={weeklyData}
      />
    </div>
  );
};

export default MessPage;
