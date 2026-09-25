import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Loading from '../components/Loading';
import Error from '../components/Error';
import AllocationModal from '../components/allocations/AllocationModal';
import TransferModal from '../components/allocations/TransferModal';
import CheckoutModal from '../components/allocations/CheckoutModal';
import {
  Building2,
  DoorClosed,
  BedDouble,
  User,
  Plus,
  Pencil,
  Trash2,
  Layers,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Check,
  UserPlus,
  ArrowRightLeft,
  LogOut,
  Phone,
  Mail,
  Calendar,
  Hash,
  Sparkles,
  Grid,
  List
} from 'lucide-react';
import './StudentsPage.css';
import './HostelDetailsPage.css';

// Natural numeric sorting comparator for alphanumeric strings (e.g. "Room 1", "Room 2", "Room 10")
const naturalSort = (a, b) => {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
};

const HostelDetailsPage = () => {
  const { hostelId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [summary, setSummary] = useState(null);
  const [hostel, setHostel] = useState(null);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [unallocatedStudents, setUnallocatedStudents] = useState([]);
  const [hostelsList, setHostelsList] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState('beds'); // 'beds' | 'rooms' | 'floors'
  const [groupByFloor, setGroupByFloor] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFloorFilter, setRoomFloorFilter] = useState('');
  const [bedSearch, setBedSearch] = useState('');
  const [bedFloorFilter, setBedFloorFilter] = useState('');
  const [bedRoomFilter, setBedRoomFilter] = useState('');
  const [bedStatusFilter, setBedStatusFilter] = useState('');

  // CRUD Modals state
  const [activeModal, setActiveModal] = useState(null); // 'floor' | 'room' | 'bed' | null
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Allocation Modals state
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedAllocationData, setSelectedAllocationData] = useState(null);
  const [targetBedAllocation, setTargetBedAllocation] = useState({ roomId: null, bedId: null });

  // Form states
  const [floorForm, setFloorForm] = useState({ floor_name: '', floor_number: '', status: 'ACTIVE' });
  const [roomForm, setRoomForm] = useState({ floor_id: '', room_number: '', capacity: '2', status: 'ACTIVE' });
  const [bedForm, setBedForm] = useState({ room_id: '', bed_number: '', status: 'AVAILABLE' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, floorsRes, roomsRes, bedsRes, studentsRes, hostelsRes] = await Promise.all([
        api.get(`/hostels/${hostelId}/summary`),
        api.get(`/floors?hostel_id=${hostelId}&limit=500`),
        api.get(`/rooms?hostel_id=${hostelId}&limit=1000`),
        api.get(`/beds?hostel_id=${hostelId}&limit=2000`),
        api.getStudents({ limit: 1000 }).catch(() => ({ data: { students: [] } })),
        api.getHostels({ limit: 100 }).catch(() => ({ data: [] }))
      ]);

      setSummary(summaryRes.data);
      setHostel(summaryRes.data?.hostel || null);

      // 1. Sort Floors in ascending order by floor_number
      const rawFloors = floorsRes.data || [];
      const sortedFloors = [...rawFloors].sort((a, b) => {
        return (Number(a.floor_number) || 0) - (Number(b.floor_number) || 0);
      });
      setFloors(sortedFloors);

      // 2. Sort Rooms in natural ascending order (by floor_number ASC, then room_number natural ASC)
      const rawRooms = roomsRes.data || [];
      const sortedRooms = [...rawRooms].sort((a, b) => {
        const floorA = sortedFloors.find(f => f.id === a.floor_id)?.floor_number ?? 999;
        const floorB = sortedFloors.find(f => f.id === b.floor_id)?.floor_number ?? 999;
        if (floorA !== floorB) return floorA - floorB;
        return naturalSort(a.room_number, b.room_number);
      });
      setRooms(sortedRooms);

      // 3. Filter & Sort Beds in natural ascending order
      const rawBeds = bedsRes.data || [];
      const hostelRoomIds = sortedRooms.map(r => r.id);
      const filteredBeds = rawBeds.filter(b => hostelRoomIds.includes(b.room_id) || String(b.hostel_id) === String(hostelId));
      const sortedBeds = [...filteredBeds].sort((a, b) => {
        return naturalSort(a.bed_number, b.bed_number);
      });
      setBeds(sortedBeds);

      // 4. Unallocated students for quick allocation
      const allStudents = studentsRes.data?.students || studentsRes.data || [];
      const unassigned = allStudents.filter(s => !s.bed_id && s.status === 'ACTIVE');
      setUnallocatedStudents(unassigned);

      const hList = hostelsRes.data?.hostels || hostelsRes.data || [];
      setHostelsList(hList);
    } catch (err) {
      setError(err.message || 'Failed to load hostel details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hostelId]);

  // Keyboard shortcut (Escape) to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        setIsAllocateOpen(false);
        setIsTransferOpen(false);
        setIsCheckoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Floor CRUD handlers
  const handleOpenFloorModal = (mode, floor = null) => {
    setModalMode(mode);
    setModalError(null);
    if (mode === 'add') {
      const nextFloorNum = floors.length > 0 ? Math.max(...floors.map(f => Number(f.floor_number) || 0)) + 1 : 0;
      setFloorForm({ floor_name: nextFloorNum === 0 ? 'Ground Floor' : `${nextFloorNum}th Floor`, floor_number: String(nextFloorNum), status: 'ACTIVE' });
    } else if (floor) {
      setFloorForm({
        floor_name: floor.floor_name,
        floor_number: String(floor.floor_number),
        status: floor.status
      });
      setSelectedEntityId(floor.id);
    }
    setActiveModal('floor');
  };

  const handleFloorSubmit = async (e) => {
    e.preventDefault();
    if (!floorForm.floor_name.trim() || floorForm.floor_number === '') {
      setModalError('All fields are required.');
      return;
    }
    setActionLoading(true);
    setModalError(null);
    try {
      if (modalMode === 'add') {
        await api.post('/floors', { ...floorForm, hostel_id: hostelId });
      } else {
        await api.put(`/floors/${selectedEntityId}`, floorForm);
      }
      setActiveModal(null);
      fetchData();
    } catch (err) {
      setModalError(err.message || 'Floor save failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFloor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete floor "${name}"?`)) return;
    try {
      await api.delete(`/floors/${id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete floor.');
    }
  };

  // Room CRUD handlers
  const handleOpenRoomModal = (mode, room = null, defaultFloorId = null) => {
    setModalMode(mode);
    setModalError(null);
    if (mode === 'add') {
      setRoomForm({
        floor_id: defaultFloorId || (floors.length > 0 ? floors[0].id : ''),
        room_number: '',
        capacity: '2',
        status: 'ACTIVE'
      });
    } else if (room) {
      setRoomForm({
        floor_id: room.floor_id || '',
        room_number: room.room_number,
        capacity: room.capacity.toString(),
        status: room.status
      });
      setSelectedEntityId(room.id);
    }
    setActiveModal('room');
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomForm.room_number.trim() || roomForm.capacity === '') {
      setModalError('Room number and capacity are required.');
      return;
    }
    setActionLoading(true);
    setModalError(null);
    try {
      const payload = {
        ...roomForm,
        floor_id: roomForm.floor_id ? parseInt(roomForm.floor_id, 10) : null,
        hostel_id: hostelId
      };
      if (modalMode === 'add') {
        await api.post('/rooms', payload);
      } else {
        await api.put(`/rooms/${selectedEntityId}`, payload);
      }
      setActiveModal(null);
      fetchData();
    } catch (err) {
      setModalError(err.message || 'Room save failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoom = async (id, number) => {
    if (!window.confirm(`Are you sure you want to delete Room ${number}?`)) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete room.');
    }
  };

  // Bed CRUD handlers
  const handleOpenBedModal = (mode, bed = null, defaultRoomId = null) => {
    setModalMode(mode);
    setModalError(null);
    if (mode === 'add') {
      const targetRoomId = defaultRoomId || (rooms.length > 0 ? rooms[0].id : '');
      const existingInRoom = beds.filter(b => b.room_id === targetRoomId);
      const nextBedNumber = `Bed ${existingInRoom.length + 1}`;
      setBedForm({
        room_id: targetRoomId,
        bed_number: nextBedNumber,
        status: 'AVAILABLE'
      });
    } else if (bed) {
      setBedForm({
        room_id: bed.room_id,
        bed_number: bed.bed_number,
        status: bed.status
      });
      setSelectedEntityId(bed.id);
    }
    setActiveModal('bed');
  };

  const handleBedSubmit = async (e) => {
    e.preventDefault();
    if (!bedForm.bed_number.trim() || !bedForm.room_id) {
      setModalError('All fields are required.');
      return;
    }
    setActionLoading(true);
    setModalError(null);
    try {
      if (modalMode === 'add') {
        await api.post('/beds', bedForm);
      } else {
        await api.put(`/beds/${selectedEntityId}`, bedForm);
      }
      setActiveModal(null);
      fetchData();
    } catch (err) {
      setModalError(err.message || 'Bed save failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBed = async (id, number) => {
    if (!window.confirm(`Are you sure you want to delete Bed ${number}?`)) return;
    try {
      await api.delete(`/beds/${id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete bed.');
    }
  };

  // Quick Allocation / Transfer / Checkout Action Handlers
  const handleQuickAllocate = (roomId, bedId) => {
    setTargetBedAllocation({ roomId, bedId });
    setIsAllocateOpen(true);
  };

  const handleQuickTransfer = (bed) => {
    setSelectedAllocationData({
      id: bed.allocation_id || bed.id,
      student_id: bed.student_id,
      student_name: bed.student_name,
      student_code: bed.student_code,
      roll_number: bed.roll_number,
      branch: bed.branch,
      course: bed.course,
      hostel_id: hostelId,
      hostel_name: summary?.hostel?.name,
      room_id: bed.room_id,
      room_number: bed.room_number,
      bed_id: bed.id,
      bed_number: bed.bed_number
    });
    setIsTransferOpen(true);
  };

  const handleQuickCheckout = (bed) => {
    setSelectedAllocationData({
      id: bed.allocation_id || bed.id,
      student_id: bed.student_id,
      student_name: bed.student_name,
      student_code: bed.student_code,
      roll_number: bed.roll_number,
      hostel_name: summary?.hostel?.name,
      room_number: bed.room_number,
      bed_number: bed.bed_number
    });
    setIsCheckoutOpen(true);
  };

  // Capacity calculations for selected room in bed form
  const getSelectedRoomStats = () => {
    const roomId = parseInt(bedForm.room_id, 10);
    if (!roomId) return null;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return null;
    const roomBeds = beds.filter(b => b.room_id === roomId);
    return {
      capacity: room.capacity,
      existingCount: roomBeds.length,
      availableSlots: room.capacity - roomBeds.length
    };
  };

  const roomStats = getSelectedRoomStats();

  if (loading) return <Loading message="Loading hostel structure and allocations in ascending order..." />;
  if (error) return <Error message={error} onRetry={fetchData} />;

  // Filter calculations for Rooms Explorer Tab
  const filteredRooms = rooms.filter(r => {
    const roomNumStr = r?.room_number !== undefined && r?.room_number !== null ? String(r.room_number) : '';
    const matchesSearch = roomNumStr.toLowerCase().includes((roomSearch || '').toLowerCase());
    const matchesFloor = roomFloorFilter ? r.floor_id === parseInt(roomFloorFilter, 10) : true;
    return matchesSearch && matchesFloor;
  });

  // Filter calculations for Beds Explorer (Matrix)
  const filteredMatrixRooms = rooms.filter(room => {
    if (bedFloorFilter && room.floor_id !== parseInt(bedFloorFilter, 10)) {
      return false;
    }
    if (bedRoomFilter && room.id !== parseInt(bedRoomFilter, 10)) {
      return false;
    }
    const roomBeds = beds.filter(b => b.room_id === room.id);
    if (bedStatusFilter) {
      const hasMatchingBed = roomBeds.some(b => b.status === bedStatusFilter);
      if (!hasMatchingBed) return false;
    }
    if (bedSearch && bedSearch.trim()) {
      const q = bedSearch.trim().toLowerCase();
      const matchRoom = String(room.room_number).toLowerCase().includes(q);
      const matchBedOrStudent = roomBeds.some(b => 
        String(b.bed_number).toLowerCase().includes(q) ||
        String(b.student_name || '').toLowerCase().includes(q) ||
        String(b.student_code || b.student_id || '').toLowerCase().includes(q) ||
        String(b.roll_number || '').toLowerCase().includes(q) ||
        String(b.branch || '').toLowerCase().includes(q) ||
        String(b.student_phone || '').toLowerCase().includes(q)
      );
      if (!matchRoom && !matchBedOrStudent) return false;
    }
    return true;
  });

  // Calculate Floor Summary Groups
  const floorGroups = floors.map(floor => {
    const floorRooms = filteredMatrixRooms.filter(r => r.floor_id === floor.id);
    const floorRoomIds = floorRooms.map(r => r.id);
    const floorBeds = beds.filter(b => floorRoomIds.includes(b.room_id));
    const occupied = floorBeds.filter(b => b.status === 'OCCUPIED').length;
    const available = floorBeds.filter(b => b.status === 'AVAILABLE').length;
    const totalCapacity = floorRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);

    return {
      floor,
      rooms: floorRooms,
      beds: floorBeds,
      occupiedCount: occupied,
      availableCount: available,
      totalCapacity: totalCapacity || floorBeds.length
    };
  });

  // Add an "Unassigned Floor" group if there are rooms without a floor
  const unassignedRooms = filteredMatrixRooms.filter(r => !r.floor_id);
  if (unassignedRooms.length > 0) {
    const unassignedRoomIds = unassignedRooms.map(r => r.id);
    const unassignedBeds = beds.filter(b => unassignedRoomIds.includes(b.room_id));
    const occupied = unassignedBeds.filter(b => b.status === 'OCCUPIED').length;
    const available = unassignedBeds.filter(b => b.status === 'AVAILABLE').length;
    floorGroups.push({
      floor: { id: null, floor_name: 'Ground / General Floor', floor_number: 0 },
      rooms: unassignedRooms,
      beds: unassignedBeds,
      occupiedCount: occupied,
      availableCount: available,
      totalCapacity: unassignedRooms.reduce((acc, r) => acc + (r.capacity || 0), 0)
    });
  }

  // Calculate overall occupancy %
  const totalBedsCount = summary?.statistics?.beds || beds.length || 0;
  const occupiedBedsCount = summary?.statistics?.occupiedBeds || beds.filter(b => b.status === 'OCCUPIED').length || 0;
  const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  return (
    <div className="hostel-details-page">
      {/* Top Breadcrumb & Title Bar */}
      <div className="hostel-details-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Button onClick={() => navigate(-1)} variant="secondary" style={{ padding: '7px 14px', borderRadius: '8px' }}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="hostel-details-title">{summary?.hostel?.name}</h1>
              <span className={`status-pill ${summary?.hostel?.status === 'ACTIVE' ? 'pill-active' : 'pill-inactive'}`}>
                ● {summary?.hostel?.status || 'ACTIVE'}
              </span>
              <span className="gender-pill">{summary?.hostel?.gender || 'COED'} HOSTEL</span>
            </div>
            <p className="hostel-details-subtitle">
              <span>📍 {summary?.hostel?.location || 'Campus Location'}</span>
              <span>•</span>
              <span>Code: <code>{summary?.hostel?.code}</code></span>
              <span>•</span>
              <span>Overall Occupancy: <strong>{occupancyRate}%</strong></span>
            </p>
          </div>
        </div>

        <div className="hostel-header-actions">
          <Button
            onClick={() => handleOpenRoomModal('add')}
            variant="secondary"
            style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Room
          </Button>
          <Button
            onClick={() => handleOpenBedModal('add')}
            variant="primary"
            style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Bed Slot
          </Button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="hostel-stats-grid">
        <div className="hostel-stat-card">
          <div className="stat-icon-bg" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <Layers size={20} />
          </div>
          <div className="stat-label">Total Floors</div>
          <div className="stat-val" style={{ color: '#4f46e5' }}>{summary?.statistics?.floors || floors.length}</div>
        </div>
        <div className="hostel-stat-card">
          <div className="stat-icon-bg" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <DoorClosed size={20} />
          </div>
          <div className="stat-label">Total Rooms</div>
          <div className="stat-val" style={{ color: '#16a34a' }}>{summary?.statistics?.rooms || rooms.length}</div>
        </div>
        <div className="hostel-stat-card">
          <div className="stat-icon-bg" style={{ background: '#f8fafc', color: '#0f172a' }}>
            <BedDouble size={20} />
          </div>
          <div className="stat-label">Total Bed Slots</div>
          <div className="stat-val">{summary?.statistics?.beds || beds.length}</div>
        </div>
        <div className="hostel-stat-card">
          <div className="stat-icon-bg" style={{ background: '#ecfdf5', color: '#059669' }}>
            <User size={20} />
          </div>
          <div className="stat-label">Occupied / Allotted</div>
          <div className="stat-val" style={{ color: '#059669' }}>
            {summary?.statistics?.occupiedBeds || beds.filter(b => b.status === 'OCCUPIED').length}
          </div>
        </div>
        <div className="hostel-stat-card">
          <div className="stat-icon-bg" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Sparkles size={20} />
          </div>
          <div className="stat-label">Available / Vacant</div>
          <div className="stat-val" style={{ color: '#0284c7' }}>
            {summary?.statistics?.availableBeds || beds.filter(b => b.status === 'AVAILABLE').length}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="hostel-tabs-bar">
        <button
          onClick={() => setActiveTab('beds')}
          className={`hostel-tab-btn ${activeTab === 'beds' ? 'active' : ''}`}
        >
          <BedDouble size={18} />
          <span>Room & Bed Allocations Structure ({beds.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`hostel-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
        >
          <DoorClosed size={18} />
          <span>Rooms Explorer ({rooms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('floors')}
          className={`hostel-tab-btn ${activeTab === 'floors' ? 'active' : ''}`}
        >
          <Layers size={18} />
          <span>Floors Explorer ({floors.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* --- TAB 1: BEDS EXPLORER (ROOM-WISE ALLOCATION MATRIX IN ASCENDING ORDER) --- */}
      {/* ========================================================================= */}
      {activeTab === 'beds' && (
        <div>
          {/* Matrix Filter & Search Toolbar */}
          <div className="matrix-filter-bar">
            <div className="matrix-filters-left">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search student, roll number, room (e.g. Room 1), bed..."
                  value={bedSearch}
                  onChange={(e) => setBedSearch(e.target.value)}
                  className="matrix-search-input"
                />
              </div>

              <select
                value={bedFloorFilter}
                onChange={(e) => setBedFloorFilter(e.target.value)}
                className="matrix-select"
              >
                <option value="">All Floors (Ascending)</option>
                {floors.map(f => (
                  <option key={f.id} value={f.id}>
                    Floor {f.floor_number} • {f.floor_name}
                  </option>
                ))}
              </select>

              <select
                value={bedRoomFilter}
                onChange={(e) => setBedRoomFilter(e.target.value)}
                className="matrix-select"
              >
                <option value="">All Rooms (Ascending: Room 1, 2...)</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} {r.floor_name ? `(${r.floor_name})` : ''}
                  </option>
                ))}
              </select>

              <select
                value={bedStatusFilter}
                onChange={(e) => setBedStatusFilter(e.target.value)}
                className="matrix-select"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">AVAILABLE (Vacant Slots)</option>
                <option value="OCCUPIED">OCCUPIED (Allotted Students)</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={`view-toggle-btn ${groupByFloor ? 'active' : ''}`}
                onClick={() => setGroupByFloor(!groupByFloor)}
                title="Toggle Floor-wise Grouping"
              >
                <Layers size={15} />
                <span>{groupByFloor ? 'Floor-wise Structured' : 'Flat Grid'}</span>
              </button>
            </div>
          </div>

          {/* If No Rooms or Beds Found */}
          {filteredMatrixRooms.length === 0 ? (
            <div className="empty-hostels-state" style={{ background: '#ffffff', padding: '3.5rem', borderRadius: '14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <BedDouble size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>No rooms or beds match your filter criteria</h3>
              <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.95rem' }}>
                Try adjusting your search query, floor selection, or status filter.
              </p>
              <Button onClick={() => { setBedSearch(''); setBedFloorFilter(''); setBedRoomFilter(''); setBedStatusFilter(''); }} variant="secondary">
                Reset Filters
              </Button>
            </div>
          ) : groupByFloor ? (
            /* ========================================================== */
            /* 1. FLOOR-WISE STRUCTURED GROUPING IN ASCENDING ORDER       */
            /* ========================================================== */
            <div className="floor-sections-container">
              {floorGroups.map(group => {
                if (group.rooms.length === 0) return null;

                const floorPercent = group.totalCapacity > 0 
                  ? Math.round((group.occupiedCount / group.totalCapacity) * 100) 
                  : 0;

                return (
                  <div key={group.floor.id || 'unassigned'} className="floor-structure-block">
                    {/* Floor Header Banner */}
                    <div className="floor-structure-header">
                      <div className="floor-header-title-box">
                        <div className="floor-level-badge">
                          <Layers size={16} />
                          <span>Level {group.floor.floor_number ?? 0}</span>
                        </div>
                        <h2 className="floor-name-heading">{group.floor.floor_name || `Floor ${group.floor.floor_number}`}</h2>
                      </div>

                      <div className="floor-stats-badges">
                        <span className="floor-stat-chip">
                          <DoorClosed size={14} color="#4f46e5" />
                          <span><strong>{group.rooms.length}</strong> Rooms</span>
                        </span>
                        <span className="floor-stat-chip">
                          <BedDouble size={14} color="#059669" />
                          <span><strong>{group.occupiedCount}</strong> / {group.totalCapacity} Beds Allotted ({floorPercent}%)</span>
                        </span>
                        <span className="floor-stat-chip" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                          <CheckCircle2 size={14} color="#0284c7" />
                          <span><strong>{group.availableCount}</strong> Vacant</span>
                        </span>
                      </div>
                    </div>

                    {/* Room Grid inside this Floor in Natural Ascending Order */}
                    <div className="room-matrix-grid">
                      {group.rooms.map(room => (
                        <RoomMatrixCard
                          key={room.id}
                          room={room}
                          beds={beds.filter(b => b.room_id === room.id).sort((a, b) => naturalSort(a.bed_number, b.bed_number))}
                          onQuickAllocate={handleQuickAllocate}
                          onQuickTransfer={handleQuickTransfer}
                          onQuickCheckout={handleQuickCheckout}
                          onOpenBedModal={handleOpenBedModal}
                          onOpenRoomModal={handleOpenRoomModal}
                          onDeleteBed={handleDeleteBed}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================== */
            /* 2. FLAT MATRIX GRID IN NATURAL ASCENDING ORDER (Room 1, 2..) */
            /* ========================================================== */
            <div className="room-matrix-grid">
              {filteredMatrixRooms.map(room => (
                <RoomMatrixCard
                  key={room.id}
                  room={room}
                  beds={beds.filter(b => b.room_id === room.id).sort((a, b) => naturalSort(a.bed_number, b.bed_number))}
                  onQuickAllocate={handleQuickAllocate}
                  onQuickTransfer={handleQuickTransfer}
                  onQuickCheckout={handleQuickCheckout}
                  onOpenBedModal={handleOpenBedModal}
                  onOpenRoomModal={handleOpenRoomModal}
                  onDeleteBed={handleDeleteBed}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 2: ROOMS EXPLORER (ALLOTMENT & CAPACITY STRUCTURE IN ASCENDING) --- */}
      {/* ========================================================================= */}
      {activeTab === 'rooms' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div className="search-filter-container" style={{ width: '100%', maxWidth: '600px' }}>
              <Input 
                placeholder="Search room number (e.g. Room 1, 10)..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                style={{ flexGrow: 1 }}
              />
              <select 
                value={roomFloorFilter}
                onChange={(e) => setRoomFloorFilter(e.target.value)}
                className="form-input"
                style={{ width: '200px', height: '40px', padding: '8px 12px' }}
              >
                <option value="">All Floors (Ascending)</option>
                {floors.map(f => (
                  <option key={f.id} value={f.id}>Floor {f.floor_number} • {f.floor_name}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => handleOpenRoomModal('add')} variant="primary" style={{ padding: '8px 16px' }}>
              + Add Room
            </Button>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="empty-hostels-state">
              <p>No rooms found matching your search filter.</p>
            </div>
          ) : (
            <div className="hostels-grid">
              {filteredRooms.map(room => {
                const roomBeds = beds.filter(b => b.room_id === room.id).sort((a, b) => naturalSort(a.bed_number, b.bed_number));
                const occupiedBeds = roomBeds.filter(b => b.status === 'OCCUPIED');
                const availableBeds = roomBeds.filter(b => b.status === 'AVAILABLE');

                return (
                  <Card 
                    key={room.id}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                          <DoorClosed size={18} color="#4f46e5" />
                          Room {room.room_number}
                        </span>
                        <span className={`room-occupancy-pill ${occupiedBeds.length === (room.capacity || 1) ? 'room-occ-full' : occupiedBeds.length > 0 ? 'room-occ-partial' : 'room-occ-empty'}`}>
                          {occupiedBeds.length}/{room.capacity} Occupied
                        </span>
                      </div>
                    }
                    footer={
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Button 
                          onClick={() => {
                            setBedRoomFilter(String(room.id));
                            setActiveTab('beds');
                          }} 
                          variant="secondary" 
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          View Beds ({roomBeds.length})
                        </Button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Button onClick={() => handleOpenRoomModal('edit', room)} variant="secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                            Edit
                          </Button>
                          <Button onClick={() => handleDeleteRoom(room.id, room.room_number)} variant="danger" style={{ padding: '4px 10px', fontSize: '12px' }}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    <div className="hostel-detail-item">
                      <span className="detail-label">Floor:</span>
                      <span className="detail-value">{room.floor_name || 'Ground Floor'}</span>
                    </div>
                    <div className="hostel-detail-item">
                      <span className="detail-label">Max Capacity:</span>
                      <span className="detail-value">{room.capacity} beds</span>
                    </div>
                    <div className="hostel-detail-item">
                      <span className="detail-label">Beds Installed:</span>
                      <span className="detail-value">
                        {roomBeds.length} / {room.capacity}
                        {roomBeds.length < room.capacity && (
                          <span style={{ color: '#d97706', marginLeft: '6px', fontSize: '0.75rem' }}>
                            ({room.capacity - roomBeds.length} uninstalled)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="hostel-detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-value ${room.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}>
                        ● {room.status}
                      </span>
                    </div>

                    {/* Room Occupants Structure Chip List */}
                    <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Allotted Occupants ({occupiedBeds.length}):
                      </div>
                      {roomBeds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No beds installed yet</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {roomBeds.map(b => (
                            <div key={b.id} className={`room-occupant-row ${b.status === 'OCCUPIED' ? 'occ' : 'vac'}`}>
                              <span style={{ fontWeight: 700 }}>{String(b.bed_number || '').toLowerCase().startsWith('bed') ? b.bed_number : `Bed ${b.bed_number}`}:</span>
                              {b.status === 'OCCUPIED' ? (
                                <span style={{ color: '#166534', fontWeight: 600 }}>
                                  {b.student_name} {b.student_code ? `(${b.student_code})` : ''}
                                </span>
                              ) : (
                                <span style={{ color: '#0284c7', fontStyle: 'italic' }}>Vacant / Available</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 3: FLOORS EXPLORER (FLOORS IN ASCENDING ORDER) --- */}
      {/* ========================================================================= */}
      {activeTab === 'floors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-title">Configure Floors (Sorted by Floor Number)</h3>
            <Button onClick={() => handleOpenFloorModal('add')} variant="primary" style={{ padding: '8px 16px' }}>
              + Add Floor
            </Button>
          </div>

          {floors.length === 0 ? (
            <div className="empty-hostels-state">
              <p>No floors have been configured in this hostel yet.</p>
            </div>
          ) : (
            <div className="hostels-grid">
              {floors.map(floor => {
                const floorRooms = rooms.filter(r => r.floor_id === floor.id);
                const floorRoomIds = floorRooms.map(r => r.id);
                const floorBeds = beds.filter(b => floorRoomIds.includes(b.room_id));
                const floorOccupied = floorBeds.filter(b => b.status === 'OCCUPIED').length;

                return (
                  <Card 
                    key={floor.id} 
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={18} color="#4f46e5" />
                        <span>{floor.floor_name} (Level {floor.floor_number})</span>
                      </div>
                    }
                    footer={
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Button 
                          onClick={() => {
                            setBedFloorFilter(String(floor.id));
                            setActiveTab('beds');
                          }} 
                          variant="secondary" 
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          View Rooms & Beds
                        </Button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Button onClick={() => handleOpenFloorModal('edit', floor)} variant="secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                            Edit
                          </Button>
                          <Button onClick={() => handleDeleteFloor(floor.id, floor.floor_name)} variant="danger" style={{ padding: '4px 10px', fontSize: '12px' }}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    <div className="hostel-detail-item">
                      <span className="detail-label">Floor Number:</span>
                      <span className="detail-value">Level {floor.floor_number}</span>
                    </div>
                    <div className="hostel-detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-value ${floor.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}>
                        ● {floor.status}
                      </span>
                    </div>
                    <div className="hostel-detail-item">
                      <span className="detail-label">Rooms Configured:</span>
                      <span className="detail-value">{floorRooms.length} rooms</span>
                    </div>
                    <div className="hostel-detail-item">
                      <span className="detail-label">Bed Occupancy:</span>
                      <span className="detail-value">{floorOccupied} / {floorBeds.length} beds allotted</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- CRUD MODALS & ALLOCATION MODALS --- */}
      {/* ========================================================================= */}

      {/* Floor Form Modal */}
      {activeModal === 'floor' && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="custom-modal-container" style={{ maxWidth: '480px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">{modalMode === 'add' ? 'Add Floor' : 'Edit Floor'}</h2>
                <p className="custom-modal-subtitle">Configure floor level and details for this hostel.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="custom-modal-close-btn" aria-label="Close modal" title="Close">
                &times;
              </button>
            </div>

            <form onSubmit={handleFloorSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-body">
                {modalError && (
                  <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                    <span className="alert-icon">⚠️</span>
                    <span className="alert-text">{modalError}</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <Input 
                    label="Floor Name *"
                    id="floor_name"
                    name="floor_name"
                    value={floorForm.floor_name}
                    onChange={e => setFloorForm(prev => ({ ...prev, floor_name: e.target.value }))}
                    placeholder="e.g. Ground Floor, 1st Floor, 2nd Floor"
                    required
                  />

                  <Input 
                    label="Floor Number (Integer Level) *"
                    id="floor_number"
                    name="floor_number"
                    type="number"
                    value={floorForm.floor_number}
                    onChange={e => setFloorForm(prev => ({ ...prev, floor_number: e.target.value }))}
                    placeholder="e.g. 0, 1, 2, 3"
                    required
                  />

                  <div className="form-group">
                    <label className="form-label" htmlFor="floor_status">Floor Status *</label>
                    <select 
                      id="floor_status" 
                      value={floorForm.status}
                      onChange={e => setFloorForm(prev => ({ ...prev, status: e.target.value }))}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="custom-modal-footer">
                <Button onClick={() => setActiveModal(null)} variant="secondary" type="button">Cancel</Button>
                <Button type="submit" variant="primary" isLoading={actionLoading}>Save Floor</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Form Modal */}
      {activeModal === 'room' && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="custom-modal-container" style={{ maxWidth: '500px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">{modalMode === 'add' ? 'Add Room' : 'Edit Room'}</h2>
                <p className="custom-modal-subtitle">Configure room number and bed capacity.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="custom-modal-close-btn" aria-label="Close modal" title="Close">
                &times;
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-body">
                {modalError && (
                  <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                    <span className="alert-icon">⚠️</span>
                    <span className="alert-text">{modalError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="room_floor_id">Select Floor (Optional)</label>
                    <select 
                      id="room_floor_id" 
                      value={roomForm.floor_id}
                      onChange={e => setRoomForm(prev => ({ ...prev, floor_id: e.target.value }))}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                    >
                      <option value="">-- No Floor / Single Floor / Ground --</option>
                      {floors.map(f => (
                        <option key={f.id} value={f.id}>{f.floor_name} (Level {f.floor_number})</option>
                      ))}
                    </select>
                  </div>

                  <Input 
                    label="Room Number *"
                    id="room_number"
                    name="room_number"
                    value={roomForm.room_number}
                    onChange={e => setRoomForm(prev => ({ ...prev, room_number: e.target.value }))}
                    placeholder="e.g. 1, 2, 101, A-102"
                    required
                  />

                  <Input 
                    label="Room Capacity (Beds Count) *"
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    value={roomForm.capacity}
                    onChange={e => setRoomForm(prev => ({ ...prev, capacity: e.target.value }))}
                    required
                  />
                  <small style={{ color: '#059669', fontSize: '0.82rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                    {roomForm.capacity || 0} bed slots (Bed 1, Bed 2...) will be automatically created in ascending order.
                  </small>

                  <div className="form-group">
                    <label className="form-label" htmlFor="room_status">Room Status *</label>
                    <select 
                      id="room_status" 
                      value={roomForm.status}
                      onChange={e => setRoomForm(prev => ({ ...prev, status: e.target.value }))}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="custom-modal-footer">
                <Button onClick={() => setActiveModal(null)} variant="secondary" type="button">Cancel</Button>
                <Button type="submit" variant="primary" isLoading={actionLoading}>Save Room</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Form Modal */}
      {activeModal === 'bed' && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="custom-modal-container" style={{ maxWidth: '500px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">{modalMode === 'add' ? 'Add Bed' : 'Edit Bed'}</h2>
                <p className="custom-modal-subtitle">Configure bed slot and occupancy status.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="custom-modal-close-btn" aria-label="Close modal" title="Close">
                &times;
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="custom-modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>Please create at least one room before adding beds.</p>
                <Button onClick={() => setActiveModal(null)} variant="secondary">Close</Button>
              </div>
            ) : (
              <form onSubmit={handleBedSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div className="custom-modal-body">
                  {modalError && (
                    <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                      <span className="alert-icon">⚠️</span>
                      <span className="alert-text">{modalError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {modalMode === 'add' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="bed_room_id">Select Room *</label>
                        <select 
                          id="bed_room_id" 
                          value={bedForm.room_id}
                          onChange={e => setBedForm(prev => ({ ...prev, room_id: e.target.value }))}
                          className="form-input"
                          style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                        >
                          {rooms.map(r => (
                            <option key={r.id} value={r.id}>Room {r.room_number}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Capacity statistics details */}
                    {modalMode === 'add' && roomStats && (
                      <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Room Capacity: <strong>{roomStats.capacity}</strong></div>
                        <div>Existing Beds: <strong>{roomStats.existingCount}</strong></div>
                        <div>Remaining Slots: <strong style={{ color: roomStats.availableSlots > 0 ? '#16a34a' : '#ef4444' }}>{roomStats.availableSlots}</strong></div>
                      </div>
                    )}

                    <Input 
                      label="Bed Number / Label *"
                      id="bed_number"
                      name="bed_number"
                      value={bedForm.bed_number}
                      onChange={e => setBedForm(prev => ({ ...prev, bed_number: e.target.value }))}
                      placeholder="e.g. 1, 2, Bed-A"
                      required
                    />

                    <div className="form-group">
                      <label className="form-label" htmlFor="bed_status">Bed Status *</label>
                      <select 
                        id="bed_status" 
                        value={bedForm.status}
                        onChange={e => setBedForm(prev => ({ ...prev, status: e.target.value }))}
                        className="form-input"
                        style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                      >
                        <option value="AVAILABLE">AVAILABLE (Vacant)</option>
                        <option value="OCCUPIED">OCCUPIED</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="custom-modal-footer">
                  <Button onClick={() => setActiveModal(null)} variant="secondary" type="button">Cancel</Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    isLoading={actionLoading}
                    disabled={modalMode === 'add' && roomStats && roomStats.availableSlots <= 0}
                  >
                    Save Bed
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Quick In-Page Allocation Modal */}
      <AllocationModal
        isOpen={isAllocateOpen}
        onClose={() => {
          setIsAllocateOpen(false);
          setTargetBedAllocation({ roomId: null, bedId: null });
        }}
        onSuccess={() => {
          fetchData();
        }}
        hostels={hostelsList.length > 0 ? hostelsList : [{ id: hostelId, name: summary?.hostel?.name }]}
        unallocatedStudents={unallocatedStudents}
        initialHostelId={hostelId}
        initialRoomId={targetBedAllocation.roomId}
        initialBedId={targetBedAllocation.bedId}
      />

      {/* Quick In-Page Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setSelectedAllocationData(null);
        }}
        onSuccess={() => {
          fetchData();
        }}
        allocation={selectedAllocationData}
        hostels={hostelsList.length > 0 ? hostelsList : [{ id: hostelId, name: summary?.hostel?.name }]}
      />

      {/* Quick In-Page Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedAllocationData(null);
        }}
        onSuccess={() => {
          fetchData();
        }}
        allocation={selectedAllocationData}
      />
    </div>
  );
};

/* ========================================================================= */
/* --- SUBCOMPONENT: ROOM MATRIX CARD WITH ASCENDING BED ALLOCATIONS --- */
/* ========================================================================= */
const RoomMatrixCard = ({
  room,
  beds,
  onQuickAllocate,
  onQuickTransfer,
  onQuickCheckout,
  onOpenBedModal,
  onOpenRoomModal,
  onDeleteBed
}) => {
  const occupiedCount = beds.filter(b => b.status === 'OCCUPIED').length;
  const availableCount = beds.filter(b => b.status === 'AVAILABLE').length;
  const capacity = room.capacity || beds.length || 1;
  const occPercentage = Math.min(100, Math.round((occupiedCount / capacity) * 100));

  return (
    <div className="room-matrix-card">
      {/* Room Header */}
      <div className="room-matrix-header">
        <div className="room-header-left">
          <span className="room-number-badge">
            <DoorClosed size={18} color="#4f46e5" />
            Room {room.room_number}
          </span>
          <span className="room-floor-tag">{room.floor_name || 'Ground Floor'}</span>
        </div>
        <div className="room-header-right">
          <span className={`room-occupancy-pill ${occupiedCount === capacity ? 'room-occ-full' : occupiedCount > 0 ? 'room-occ-partial' : 'room-occ-empty'}`}>
            {occupiedCount === capacity
              ? `Full • ${occupiedCount}/${capacity} Occupied`
              : occupiedCount > 0
              ? `${occupiedCount}/${capacity} Occupied • ${availableCount} Free`
              : `0/${capacity} Occupied • All Vacant`}
          </span>
        </div>
      </div>

      {/* Progress occupancy bar */}
      <div className="room-occ-bar-bg">
        <div
          className="room-occ-bar-fill"
          style={{
            width: `${occPercentage}%`,
            background: occupiedCount === capacity ? '#4f46e5' : '#16a34a'
          }}
        />
      </div>

      {/* Structured Bed Slots Matrix (in Ascending Order: Bed 1, Bed 2, Bed 3...) */}
      <div className="room-beds-container">
        {beds.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '1.75rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
              No beds installed in this room yet. (Max Capacity: {room.capacity} beds)
            </p>
            <button
              type="button"
              className="add-bed-shortcut-btn"
              onClick={() => onOpenBedModal('add', null, room.id)}
            >
              <Plus size={14} /> Install First Bed (Bed 1)
            </button>
          </div>
        ) : (
          beds.map(bed => {
            const isOccupied = bed.status === 'OCCUPIED';
            const isAvailable = bed.status === 'AVAILABLE';
            const isMaintenance = bed.status === 'MAINTENANCE';
            const bedLabel = String(bed.bed_number || '').trim();
            const displayBedTitle = bedLabel.toLowerCase().startsWith('bed') ? bedLabel : `Bed ${bedLabel}`;

            return (
              <div
                key={bed.id}
                className={`bed-slot-card ${isOccupied ? 'occupied' : isAvailable ? 'available' : 'maintenance'}`}
              >
                {/* Bed Slot Header */}
                <div className="bed-slot-header">
                  <span className="bed-slot-title">
                    <BedDouble size={16} color={isOccupied ? '#166534' : isAvailable ? '#0284c7' : '#b45309'} />
                    {displayBedTitle}
                  </span>
                  <span className={`bed-status-badge ${isOccupied ? 'occupied' : isAvailable ? 'available' : 'maintenance'}`}>
                    ● {bed.status}
                  </span>
                </div>

                {/* Structured Bed Occupant Info */}
                <div className="bed-occupant-info">
                  {isOccupied ? (
                    <div className="occupant-details-box">
                      <div className="occupant-name">
                        <div className="occupant-avatar-circle">
                          {bed.student_name ? bed.student_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {bed.student_name || 'Allocated Student'}
                          </div>
                          {bed.roll_number && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Roll: {bed.roll_number}</div>
                          )}
                        </div>
                      </div>

                      {bed.student_code && (
                        <div style={{ marginTop: '5px' }}>
                          <span className="occupant-id-badge">ID: {bed.student_code}</span>
                        </div>
                      )}

                      {(bed.branch || bed.course) && (
                        <div className="occupant-branch">
                          🎓 {bed.course ? `${bed.course} • ` : ''}{bed.branch}{bed.student_year ? ` (Yr ${bed.student_year})` : ''}
                        </div>
                      )}

                      {bed.student_phone && (
                        <div className="occupant-contact-row">
                          <Phone size={11} />
                          <span>{bed.student_phone}</span>
                        </div>
                      )}

                      {bed.allocated_from && (
                        <div className="occupant-date-row">
                          <Calendar size={11} />
                          <span>From: {new Date(bed.allocated_from).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ) : isAvailable ? (
                    <div className="vacant-slot-box">
                      <div className="vacant-bed-text">
                        <CheckCircle2 size={14} color="#0284c7" />
                        <span>Vacant slot • Ready for allocation</span>
                      </div>
                      <button
                        type="button"
                        className="assign-student-btn"
                        onClick={() => onQuickAllocate(room.id, bed.id)}
                      >
                        <UserPlus size={13} />
                        <span>+ Assign Student</span>
                      </button>
                    </div>
                  ) : (
                    <div className="vacant-slot-box">
                      <div className="vacant-bed-text" style={{ color: '#b45309' }}>
                        <AlertTriangle size={14} color="#b45309" />
                        <span>Under Maintenance / Inspection</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bed Slot Actions */}
                <div className="bed-slot-actions">
                  {isOccupied ? (
                    <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        className="bed-action-btn bed-action-transfer"
                        title="Transfer to another bed"
                        onClick={() => onQuickTransfer(bed)}
                      >
                        <ArrowRightLeft size={11} /> Transfer
                      </button>
                      <button
                        type="button"
                        className="bed-action-btn bed-action-danger"
                        title="Checkout / Release Bed"
                        onClick={() => onQuickCheckout(bed)}
                      >
                        <LogOut size={11} /> Checkout
                      </button>
                      <button
                        type="button"
                        className="bed-action-btn"
                        title="Edit Bed"
                        onClick={() => onOpenBedModal('edit', bed, room.id)}
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="bed-action-btn"
                        title="Edit Bed"
                        onClick={() => onOpenBedModal('edit', bed, room.id)}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        className="bed-action-btn bed-action-danger"
                        title="Delete Bed"
                        onClick={() => onDeleteBed(bed.id, bed.bed_number)}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Room Footer */}
      <div className="room-matrix-footer">
        {beds.length < capacity ? (
          <button
            type="button"
            className="add-bed-shortcut-btn"
            onClick={() => onOpenBedModal('add', null, room.id)}
          >
            <Plus size={13} /> Add Bed ({capacity - beds.length} slot{capacity - beds.length > 1 ? 's' : ''} left)
          </button>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={13} color="#16a34a" /> Max capacity reached ({capacity} beds)
          </span>
        )}

        <div style={{ display: 'flex', gap: '6px' }}>
          <Button
            onClick={() => onOpenRoomModal('edit', room)}
            variant="secondary"
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Edit Room
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HostelDetailsPage;
