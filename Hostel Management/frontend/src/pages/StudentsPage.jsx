import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Loading from '../components/Loading';
import Error from '../components/Error';
import './StudentsPage.css';

export const COURSE_PROGRAMS = ['B.Tech', 'Diploma', 'MBA'];

export const COURSE_BRANCH_MAP = {
  'B.Tech': [
    'Computer Science & Engineering (CSE)',
    'Aeronautical Engineering',
    'Aircraft Maintenance Engineering (AME)',
    'Civil Engineering',
    'Electrical Engineering',
    'Electronics & Communication Engineering (ECE)',
    'Mechanical Engineering',
    'Agriculture Engineering'
  ],
  'Diploma': [
    'Aeronautical Engineering',
    'Aircraft Maintenance Engineering (AME)',
    'Civil Engineering',
    'Electrical Engineering',
    'Mechanical Engineering'
  ],
  'MBA': [
    'Marketing',
    'Finance',
    'Human Resource',
    'Agri-Business'
  ]
};

const formatPhotoUrl = (url) => {
  if (!url) return null;
  const str = String(url).trim();
  if (str.includes('drive.google.com')) {
    const match = str.match(/id=([a-zA-Z0-9_-]+)/) || str.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return str;
};

const StudentsPage = () => {
  const { user, impersonateStudent } = useAuth();
  const navigate = useNavigate();
  const [impersonatingId, setImpersonatingId] = useState(null);
  
  // Lists and filtering state
  const [students, setStudents] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [limit, setLimit] = useState(10);

  // Modal control states
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Mass Bulk Import States
  const [parsedStudents, setParsedStudents] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);

  const handleOpenBulkImportModal = () => {
    setParsedStudents([]);
    setImportSummary(null);
    setImportError(null);
    setIsBulkImportOpen(true);
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Student Name': 'Bhagyabrata Gantayat',
        'D.O.B': '2004-05-15',
        'Registration No.': 'REG2026101',
        'Email Id': 'bhagya@bec.ac.in',
        'Course': 'B.Tech',
        'stream': 'Computer Science & Engineering (CSE)',
        'Year': '1',
        'Semister': '1',
        'Hostel': 'BARAMUNDA BOYS HOSTEL',
        'Floor': 'Floor 1',
        'Passport Size Photo': 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        'ROOM NO': '101'
      },
      {
        'Student Name': 'Jitendra Nial',
        'D.O.B': '2003-08-22',
        'Registration No.': 'REG2026102',
        'Email Id': 'jitendra@bec.ac.in',
        'Course': 'B.Tech',
        'stream': 'Mechanical Engineering',
        'Year': '2',
        'Semister': '3',
        'Hostel': 'BARAMUNDA BOYS HOSTEL',
        'Floor': 'Floor 2',
        'Passport Size Photo': 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        'ROOM NO': '201'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Import_Template');
    XLSX.writeFile(workbook, 'BEC_Hostel_Student_Import_Template.xlsx');
  };

  const handleExcelFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRecords = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonRecords || jsonRecords.length === 0) {
          setImportError('The uploaded file is empty or has no readable rows.');
          return;
        }

        setParsedStudents(jsonRecords);
      } catch (err) {
        setImportError('Failed to parse Excel/CSV file. Please check file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmBulkImport = async () => {
    if (!parsedStudents || parsedStudents.length === 0) return;

    setImportLoading(true);
    setImportError(null);
    setImportSummary(null);

    try {
      const res = await api.bulkImportStudents(parsedStudents);
      setImportSummary(res.data);
      fetchStudents();
    } catch (err) {
      setImportError(err.message || 'Mass import operation failed.');
    } finally {
      setImportLoading(false);
    }
  };
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [actionLoading, setActionLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomBranch, setIsCustomBranch] = useState(false);

  // Dynamic cascading option states for dropdowns
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  
  const [floorsLoading, setFloorsLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [bedsLoading, setBedsLoading] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    date_of_birth: '',
    email: '',
    phone: '',
    branch: '',
    course: 'B.Tech',
    year: '1',
    semester: '1',
    password: '',
    hostel_id: '',
    floor_id: '',
    room_id: '',
    bed_id: '',
    base64Photo: ''
  });

  // Automatically generate/suggest email when typing student full name
  const handleFullNameChange = (name) => {
    const cleanName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const autoEmail = cleanName ? `${cleanName}@bec.ac.in` : '';
    setFormData(prev => {
      // Auto-update email whenever it is empty or matches previous @bec.ac.in address
      const isAuto = !prev.email || prev.email.endsWith('@bec.ac.in') || prev.email === '';
      return {
        ...prev,
        full_name: name,
        email: isAuto ? autoEmail : prev.email
      };
    });
  };

  // Automatically convert DOB (YYYY-MM-DD) into default DDMMYYYY password
  const handleDobChange = (dobString) => {
    let autoPassword = '';
    if (dobString && /^\d{4}-\d{2}-\d{2}$/.test(dobString)) {
      const [yyyy, mm, dd] = dobString.split('-');
      autoPassword = `${dd}${mm}${yyyy}`;
    }
    setFormData(prev => ({
      ...prev,
      date_of_birth: dobString,
      password: modalMode === 'add' ? autoPassword : prev.password
    }));
  };

  // Dynamically switch course and reset branch selection
  const handleCourseChange = (newCourse) => {
    const defaultBranch = COURSE_BRANCH_MAP[newCourse]?.[0] || '';
    setFormData(prev => ({
      ...prev,
      course: newCourse,
      branch: defaultBranch
    }));
    setIsCustomBranch(false);
  };

  // Branch selection handler with custom branch support
  const handleBranchChange = (newBranch) => {
    if (newBranch === 'OTHER') {
      setIsCustomBranch(true);
      setFormData(prev => ({ ...prev, branch: '' }));
    } else {
      setIsCustomBranch(false);
      setFormData(prev => ({ ...prev, branch: newBranch }));
    }
  };

  // Transfer Fields State
  const [transferData, setTransferData] = useState({
    new_hostel_id: '',
    new_floor_id: '',
    new_room_id: '',
    new_bed_id: ''
  });

  // Status Change Fields State
  const [statusData, setStatusData] = useState({
    status: 'INACTIVE'
  });

  // Keyboard shortcut (Escape) to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDetailsOpen(false);
        setIsAddEditOpen(false);
        setIsTransferOpen(false);
        setIsStatusOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch student records from the backend
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/students', {
        params: {
          page: currentPage,
          limit,
          search: search.trim() || undefined,
          hostel_id: hostelFilter || undefined,
          status: statusFilter || undefined,
          course: courseFilter || undefined
        }
      });
      setStudents(res.data.students || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalStudents(res.data.totalStudents || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch student directories.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch hostels (filtered by RBAC on server side)
  const fetchHostels = async () => {
    try {
      const res = await api.get('/hostels');
      setHostels(res.data || []);
    } catch (err) {
      console.error('Failed to load hostels list:', err);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, limit, hostelFilter, statusFilter, courseFilter]);

  // Handle live search execution
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchStudents();
  };

  // Cascading lists helpers
  const handleHostelChange = async (hostelId, isTransfer = false) => {
    if (isTransfer) {
      setTransferData(prev => ({ ...prev, new_hostel_id: hostelId, new_floor_id: '', new_room_id: '', new_bed_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, hostel_id: hostelId, floor_id: '', room_id: '', bed_id: '' }));
    }
    setFloors([]);
    setRooms([]);
    setBeds([]);

    if (!hostelId) return;

    setFloorsLoading(true);
    setRoomsLoading(true);
    try {
      const [floorsRes, roomsRes] = await Promise.all([
        api.get(`/floors?hostel_id=${hostelId}`),
        api.get(`/rooms?hostel_id=${hostelId}`)
      ]);
      setFloors(floorsRes.data || []);
      setRooms(roomsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch floors / rooms:', err);
    } finally {
      setFloorsLoading(false);
      setRoomsLoading(false);
    }
  };

  const handleFloorChange = async (floorId, isTransfer = false) => {
    const hostelId = isTransfer ? transferData.new_hostel_id : formData.hostel_id;
    if (isTransfer) {
      setTransferData(prev => ({ ...prev, new_floor_id: floorId, new_room_id: '', new_bed_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, floor_id: floorId, room_id: '', bed_id: '' }));
    }
    setRooms([]);
    setBeds([]);

    setRoomsLoading(true);
    try {
      const url = floorId ? `/rooms?floor_id=${floorId}` : `/rooms?hostel_id=${hostelId}`;
      const res = await api.get(url);
      setRooms(res.data || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleRoomChange = async (roomId, isTransfer = false) => {
    if (isTransfer) {
      setTransferData(prev => ({ ...prev, new_room_id: roomId, new_bed_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, room_id: roomId, bed_id: '' }));
    }
    setBeds([]);

    if (!roomId) return;

    setBedsLoading(true);
    try {
      const res = await api.get(`/beds?room_id=${roomId}`);
      // Show only AVAILABLE beds for registration or transfer, 
      // or include currently assigned bed if in edit mode (not applicable to student creation)
      setBeds(res.data || []);
    } catch (err) {
      console.error('Failed to fetch beds:', err);
    } finally {
      setBedsLoading(false);
    }
  };

  // Convert uploaded image file to optimized base64
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, base64Photo: 'Image size exceeds maximum limit of 10MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, base64Photo: compressedBase64 }));
        setFormErrors(prev => ({ ...prev, base64Photo: null }));
      };
      img.onerror = () => {
        setFormData(prev => ({ ...prev, base64Photo: event.target.result }));
        setFormErrors(prev => ({ ...prev, base64Photo: null }));
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setFormErrors(prev => ({ ...prev, base64Photo: 'Could not parse image file.' }));
    };
    reader.readAsDataURL(file);
  };

  // Open creation modal
  const handleOpenAddModal = () => {
    const defaultCourse = 'B.Tech';
    const defaultBranch = COURSE_BRANCH_MAP['B.Tech'][0];
    setFormData({
      student_id: '',
      full_name: '',
      date_of_birth: '',
      email: '',
      phone: '',
      branch: defaultBranch,
      course: defaultCourse,
      year: '1',
      semester: '1',
      password: '',
      hostel_id: '',
      floor_id: '',
      room_id: '',
      bed_id: '',
      base64Photo: ''
    });
    setFormErrors({});
    setFloors([]);
    setRooms([]);
    setBeds([]);
    setIsCustomBranch(false);
    setShowPassword(false);
    setModalMode('add');
    setIsAddEditOpen(true);
  };

  // Open edit details modal
  const handleOpenEditModal = (student) => {
    const currentCourse = student.course || 'B.Tech';
    const currentBranch = student.branch || '';
    const branchesForCourse = COURSE_BRANCH_MAP[currentCourse] || [];
    const isOther = currentBranch && !branchesForCourse.includes(currentBranch);
    setIsCustomBranch(Boolean(isOther));
    setShowPassword(false);

    let dobFormatted = '';
    if (student.date_of_birth) {
      try {
        dobFormatted = new Date(student.date_of_birth).toISOString().split('T')[0];
      } catch (e) {
        dobFormatted = student.date_of_birth;
      }
    }

    setFormData({
      student_id: student.student_id,
      full_name: student.full_name,
      date_of_birth: dobFormatted,
      email: student.email,
      phone: student.phone || '',
      branch: currentBranch,
      course: currentCourse,
      year: student.year?.toString() || '1',
      semester: student.semester?.toString() || '1',
      password: '', // Password is not modified here
      hostel_id: student.hostel_id || '',
      floor_id: student.floor_id || '',
      room_id: student.room_id || '',
      bed_id: student.bed_id || '',
      base64Photo: '' // Stays blank unless uploading a new one
    });
    setSelectedStudent(student);
    setFormErrors({});
    setModalMode('edit');
    setIsAddEditOpen(true);
  };

  // Open transfer modal
  const handleOpenTransferModal = (student) => {
    setSelectedStudent(student);
    setTransferData({
      new_hostel_id: '',
      new_floor_id: '',
      new_room_id: '',
      new_bed_id: ''
    });
    setFloors([]);
    setRooms([]);
    setBeds([]);
    setIsTransferOpen(true);
  };

  // Open status updates modal
  const handleOpenStatusModal = (student) => {
    setSelectedStudent(student);
    setStatusData({
      status: student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });
    setIsStatusOpen(true);
  };

  // Submit Add / Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validations (Registration Number is optional)
    const errors = {};
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required.';
    if (!formData.email.trim()) errors.email = 'Email address is required.';
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of Birth is required.';
    
    if (modalMode === 'add') {
      if (!formData.password || formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters (enter Date of Birth).';
      }
      if (!formData.hostel_id) errors.hostel_id = 'Hostel assignment is required.';
      if (!formData.room_id) errors.room_id = 'Room assignment is required.';
      if (!formData.bed_id) errors.bed_id = 'Bed assignment is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setActionLoading(true);
    try {
      if (modalMode === 'add') {
        await api.post('/students', {
          ...formData,
          date_of_birth: formData.date_of_birth || null
        });
      } else {
        // Prepare update fields (filter out empty password / photo)
        const updatePayload = {
          student_id: formData.student_id ? formData.student_id.trim() : undefined,
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth || null,
          phone: formData.phone,
          email: formData.email,
          branch: formData.branch,
          course: formData.course,
          year: parseInt(formData.year, 10),
          semester: parseInt(formData.semester, 10),
        };
        if (formData.base64Photo) {
          updatePayload.base64Photo = formData.base64Photo;
        }
        await api.put(`/students/${selectedStudent.id}`, updatePayload);
      }
      setIsAddEditOpen(false);
      fetchStudents();
    } catch (err) {
      const errorText = err.message || err.data?.message || err.response?.data?.message || 'Operation failed.';
      setFormErrors({ form: errorText });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Transfer Form
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.new_hostel_id || !transferData.new_room_id || !transferData.new_bed_id) {
      setFormErrors({ form: 'Complete destination hostel, room, and bed assignments are required.' });
      return;
    }

    setActionLoading(true);
    setFormErrors({});
    try {
      await api.post(`/students/${selectedStudent.id}/transfer`, {
        new_hostel_id: Number(transferData.new_hostel_id),
        new_floor_id: transferData.new_floor_id ? Number(transferData.new_floor_id) : null,
        new_room_id: Number(transferData.new_room_id),
        new_bed_id: Number(transferData.new_bed_id)
      });
      setIsTransferOpen(false);
      fetchStudents();
    } catch (err) {
      setFormErrors({ form: err.message || 'Transfer failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Status Change Form
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors({});
    try {
      await api.patch(`/students/${selectedStudent.id}/status`, {
        status: statusData.status
      });
      setIsStatusOpen(false);
      fetchStudents();
    } catch (err) {
      setFormErrors({ form: err.message || 'Failed to update student status.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Login as Student (Super Admin / Warden Impersonation)
  const handleImpersonateStudent = async (student) => {
    if (!student) return;
    if (!window.confirm(`Are you sure you want to 1-Click Login as "${student.full_name}" (${student.student_id})?`)) {
      return;
    }
    setImpersonatingId(student.id);
    try {
      const res = await impersonateStudent(student.id);
      if (res.success) {
        navigate('/student/dashboard');
      } else {
        alert(res.message || 'Failed to login as student.');
      }
    } catch (err) {
      alert(err.message || 'Error occurred during student login.');
    } finally {
      setImpersonatingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-heading">Student Directory</h1>
          <p className="page-subheading">
            {user.role === 'SUPER_ADMIN' 
              ? 'Manage student credentials, allocations, transfers, and profiles campus-wide.' 
              : 'Warden console: View and register students allocated to your assigned hostels.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={handleOpenBulkImportModal} variant="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            <i className="fa-solid fa-file-excel"></i> Import Excel / CSV
          </Button>
          <Button onClick={handleOpenAddModal} variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-user-plus"></i> Add New Student
          </Button>
        </div>
      </div>

      {/* Filters and Search panel */}
      <Card className="filters-card" style={{ padding: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 250px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Search Student</label>
            <Input 
              placeholder="Search by ID, name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ width: '160px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Filter by Course</label>
            <select
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ width: '100%', height: '40px', padding: '8px 12px' }}
            >
              <option value="">All Courses</option>
              {COURSE_PROGRAMS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '200px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Filter by Hostel</label>
            <select
              value={hostelFilter}
              onChange={(e) => { setHostelFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ width: '100%', height: '40px', padding: '8px 12px' }}
            >
              <option value="">All Hostels</option>
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ width: '100%', height: '40px', padding: '8px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>
          </div>

          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Show per Page</label>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="form-input"
              style={{ width: '100%', height: '40px', padding: '8px 12px', fontWeight: '700', color: '#1e293b' }}
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
              <option value={1000}>All ({totalStudents})</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="submit" variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-magnifying-glass"></i> Search
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setSearch('');
                setHostelFilter('');
                setStatusFilter('');
                setCourseFilter('');
                setCurrentPage(1);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-rotate-left"></i> Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Main Student Directory Content */}
      {loading ? (
        <Loading message="Syncing student directories..." />
      ) : error ? (
        <Error message={error} onRetry={fetchStudents} />
      ) : students.length === 0 ? (
        <div className="empty-hostels-state">
          <p>No student records match your query.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table view */}
          <Card style={{ overflowX: 'auto', padding: 0 }}>
            <table className="student-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '16px' }}>Student Details</th>
                  <th style={{ padding: '16px' }}>Academic Info</th>
                  <th style={{ padding: '16px' }}>Hostel Allocation</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} className="student-row-hover">
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {student.photo_url ? (
                        <img 
                          src={student.photo_url} 
                          alt={student.full_name} 
                          className="student-photo-frame"
                        />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', color: 'var(--text-secondary)' }}>
                          {student.full_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{student.full_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: <code>{student.student_id}</code></div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{student.email}</div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '500' }}>{student.course} - {student.branch}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Year {student.year}, Sem {student.semester}</div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      {student.hostel_name ? (
                        <>
                          <div style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{student.hostel_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Room {student.room_number}, Bed {student.bed_number}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not Allocated</span>
                      )}
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span className={`hostel-gender-badge ${
                        student.status === 'ACTIVE' ? 'male' : 'female'
                      }`} style={{ textTransform: 'uppercase' }}>
                        {student.status}
                      </span>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {['SUPER_ADMIN', 'SUPERINTENDENT'].includes(user?.role) && (
                          <Button 
                            onClick={() => handleImpersonateStudent(student)}
                            variant="primary" 
                            className="btn-sm"
                            style={{ 
                              padding: '6px 10px', 
                              fontSize: '12px', 
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                              border: 'none', 
                              color: '#ffffff',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            isLoading={impersonatingId === student.id}
                            title={`1-Click Login as ${student.full_name}`}
                          >
                            <i className="fa-solid fa-right-to-bracket"></i> Login
                          </Button>
                        )}
                        <Button 
                          onClick={() => { setSelectedStudent(student); setIsDetailsOpen(true); }}
                          variant="secondary" 
                          className="btn-sm"
                          style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="fa-solid fa-eye"></i> View
                        </Button>
                        <Button 
                          onClick={() => handleOpenEditModal(student)}
                          variant="secondary" 
                          className="btn-sm"
                          style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </Button>
                        <Button 
                          onClick={() => handleOpenTransferModal(student)}
                          variant="secondary" 
                          className="btn-sm"
                          style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          disabled={student.status !== 'ACTIVE'}
                        >
                          <i className="fa-solid fa-right-left"></i> Transfer
                        </Button>
                        <Button 
                          onClick={() => handleOpenStatusModal(student)}
                          variant={student.status === 'ACTIVE' ? 'danger' : 'primary'}
                          className="btn-sm"
                          style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className={`fa-solid ${student.status === 'ACTIVE' ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                          {student.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pagination Controls & Rows Per Page Dropdown */}
          {totalStudents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Showing <strong>{students.length}</strong> of <strong>{totalStudents}</strong> student accounts
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="limit-footer-select" style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Show:</label>
                  <select
                    id="limit-footer-select"
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}
                    className="form-input"
                    style={{ height: '34px', padding: '2px 10px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                    <option value={1000}>All Students ({totalStudents})</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '13px' }}
                >
                  <i className="fa-solid fa-chevron-left"></i> Previous
                </Button>
                <span style={{ alignSelf: 'center', fontSize: '13px', padding: '0 8px', fontWeight: 600, color: '#334155' }}>
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  variant="secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '13px' }}
                >
                  Next <i className="fa-solid fa-chevron-right"></i>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: View Profile Details */}
      {isDetailsOpen && selectedStudent && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsDetailsOpen(false); }}>
          <div className="custom-modal-container" style={{ maxWidth: '640px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">Student Profile Details</h2>
                <p className="custom-modal-subtitle">Comprehensive registered student account information.</p>
              </div>
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="custom-modal-close-btn"
                aria-label="Close modal"
                title="Close"
              >
                &times;
              </button>
            </div>

            <div className="custom-modal-body">
              {/* Header Profile Card */}
              <div className="profile-header-card">
                <div className="profile-header-avatar">
                  {formatPhotoUrl(selectedStudent.photo_url) ? (
                    <img 
                      src={formatPhotoUrl(selectedStudent.photo_url)} 
                      alt={selectedStudent.full_name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="avatar-fallback" style={{ display: formatPhotoUrl(selectedStudent.photo_url) ? 'none' : 'flex' }}>
                    {selectedStudent.full_name ? selectedStudent.full_name.substring(0, 2).toUpperCase() : 'ST'}
                  </div>
                </div>

                <div className="profile-header-info">
                  <h3 className="profile-header-name">{selectedStudent.full_name}</h3>
                  <div className="profile-header-tags">
                    <span className="profile-tag tag-reg">
                      <i className="fa-solid fa-id-card"></i> ID: <code>{selectedStudent.student_id}</code>
                    </span>
                    <span className={`profile-tag ${selectedStudent.status === 'ACTIVE' ? 'tag-active' : 'tag-inactive'}`}>
                      ● {selectedStudent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Organized Section Cards */}
              <div className="profile-sections-wrapper">
                {/* Section 1: Academic Standing */}
                <div className="profile-section-card">
                  <h4 className="profile-section-title">
                    <i className="fa-solid fa-graduation-cap text-indigo-600"></i>
                    Academic Profile
                  </h4>
                  <div className="profile-info-grid-2">
                    <div className="profile-info-item">
                      <span className="profile-info-label">Course Program</span>
                      <span className="profile-info-value">{selectedStudent.course || 'B.Tech'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Branch / Stream</span>
                      <span className="profile-info-value">{selectedStudent.branch || 'N/A'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Year & Semester</span>
                      <span className="profile-info-value">Year {selectedStudent.year || 1}, Sem {selectedStudent.semester || 1}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Admission Date</span>
                      <span className="profile-info-value">{selectedStudent.admission_date ? new Date(selectedStudent.admission_date).toLocaleDateString('en-GB') : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Hostel & Accommodation */}
                <div className="profile-section-card">
                  <h4 className="profile-section-title">
                    <i className="fa-solid fa-building-user text-indigo-600"></i>
                    Hostel & Accommodation
                  </h4>
                  <div className="profile-info-grid-2">
                    <div className="profile-info-item">
                      <span className="profile-info-label">Assigned Hostel</span>
                      <span className="profile-info-value" style={{ color: '#2563eb' }}>{selectedStudent.hostel_name || 'Not Allocated'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Room & Bed</span>
                      <span className="profile-info-value">
                        {selectedStudent.room_number 
                          ? `Room ${selectedStudent.room_number} • Bed ${selectedStudent.bed_number}`
                          : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Personal & Contact Info */}
                <div className="profile-section-card">
                  <h4 className="profile-section-title">
                    <i className="fa-solid fa-user-gear text-indigo-600"></i>
                    Contact & Personal Details
                  </h4>
                  <div className="profile-info-grid-2">
                    <div className="profile-info-item">
                      <span className="profile-info-label">Date of Birth</span>
                      <span className="profile-info-value">
                        {selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString('en-GB') : 'Not Specified'}
                      </span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Email Address</span>
                      <span className="profile-info-value" style={{ fontSize: '0.85rem' }}>{selectedStudent.email}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Phone Number</span>
                      <span className="profile-info-value">{selectedStudent.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="custom-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {['SUPER_ADMIN', 'SUPERINTENDENT'].includes(user?.role) && selectedStudent && (
                  <Button 
                    onClick={() => { setIsDetailsOpen(false); handleImpersonateStudent(selectedStudent); }}
                    variant="primary"
                    style={{ 
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                      border: 'none', 
                      color: '#ffffff',
                      fontWeight: 600
                    }}
                    isLoading={impersonatingId === selectedStudent.id}
                  >
                    1-Click Login as this Student
                  </Button>
                )}
              </div>
              <Button onClick={() => setIsDetailsOpen(false)} variant="secondary">
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Register/Edit Student Profile */}
      {isAddEditOpen && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAddEditOpen(false); }}>
          <div className="custom-modal-container" style={{ maxWidth: '680px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">
                  {modalMode === 'add' ? 'Register New Student' : 'Edit Student Details'}
                </h2>
                <p className="custom-modal-subtitle">Provide information to register or update the student profile.</p>
              </div>
              <button 
                onClick={() => setIsAddEditOpen(false)}
                className="custom-modal-close-btn"
                aria-label="Close modal"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-body">
                {formErrors.form && (
                  <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                    <span className="alert-icon">️</span>
                    <span className="alert-text">{formErrors.form}</span>
                  </div>
                )}

                <div className="modal-form-grid-2">
                  <Input 
                    label="Student Full Name *"
                    id="full_name"
                    name="full_name"
                    placeholder="e.g. Soumya Ranjan Panda"
                    value={formData.full_name}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    error={formErrors.full_name}
                    required
                  />

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" htmlFor="date_of_birth">
                      Date of Birth *
                    </label>
                    <input 
                      type="date"
                      id="date_of_birth"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={(e) => handleDobChange(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                      required
                    />
                    {formErrors.date_of_birth && <span className="form-error-msg">{formErrors.date_of_birth}</span>}
                    <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                      Used as the default login password (format DDMMYYYY).
                    </small>
                  </div>
                </div>

                <div className="modal-form-grid-2">
                  <div>
                    <Input 
                      label={modalMode === 'add' ? 'Registration Number (User ID) (Optional)' : 'Registration Number (User ID)'}
                      id="student_id"
                      name="student_id"
                      placeholder="e.g. 2301316095 (Auto-generated if empty)"
                      autoComplete="new-student-id"
                      value={formData.student_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                      error={formErrors.student_id}
                    />
                    <small style={{ display: 'block', marginTop: '-8px', marginBottom: '12px', fontSize: '11px', color: '#64748b' }}>
                      {modalMode === 'add' 
                        ? 'Optional for 1st-year students. Auto-generated if left blank.' 
                        : 'Official college/university registration number. Can be added or updated anytime.'}
                    </small>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <label className="form-label" htmlFor="email" style={{ marginBottom: 0 }}>
                        Email Address *
                      </label>
                      {formData.full_name && (
                        <button
                          type="button"
                          onClick={() => {
                            const clean = formData.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (clean) setFormData(prev => ({ ...prev, email: `${clean}@bec.ac.in` }));
                          }}
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                          title="Generate email from full name"
                        >
                          Auto-fill @bec.ac.in
                        </button>
                      )}
                    </div>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      placeholder="e.g. fullname@bec.ac.in"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      error={formErrors.email}
                      required
                    />
                    <small style={{ display: 'block', marginTop: '-8px', marginBottom: '12px', fontSize: '11px', color: '#64748b' }}>
                      Used for student portal login (format <code>fullname@bec.ac.in</code>).
                    </small>
                  </div>
                </div>

                <div className="modal-form-grid-2">
                  <Input 
                    label="Phone Number"
                    id="phone"
                    name="phone"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />

                  {modalMode === 'add' ? (
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label" htmlFor="password">
                        Access Password (Auto-set from DOB) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          id="student_access_password"
                          name="student_access_password"
                          autoComplete="new-password"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          className="form-input"
                          placeholder="Select DOB to auto-generate password"
                          style={{ width: '100%', height: '42px', padding: '8px 40px 8px 12px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px',
                            color: '#64748b'
                          }}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? '' : ''}
                        </button>
                      </div>
                      {formErrors.password && <span className="form-error-msg">{formErrors.password}</span>}
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label" style={{ color: '#64748b', fontSize: '13px' }}>Password Management</label>
                      <div style={{ color: '#94a3b8', fontSize: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        Password is kept secure. Can be reset via User Management.
                      </div>
                    </div>
                  )}
                </div>

                {modalMode === 'add' && (
                  <div style={{ marginBottom: '16px', fontSize: '12px', color: '#0369a1', background: '#f0f9ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <strong>Student Login Credentials:</strong><br />
                    • <strong>Login Email:</strong> <code>{formData.email || 'fullname@bec.ac.in'}</code><br />
                    • <strong>Registration ID:</strong> <code>{formData.student_id || '(Auto-assigned upon registration)'}</code><br />
                    • <strong>Default Password:</strong> <code>{formData.password || 'Select Date of Birth (format DDMMYYYY)'}</code>
                  </div>
                )}

                <div className="modal-form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="course">Course / Program *</label>
                    <select
                      id="course"
                      value={formData.course}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                      required
                    >
                      {COURSE_PROGRAMS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="branch">Academic Branch / Department *</label>
                    <select
                      id="branch"
                      value={isCustomBranch ? 'OTHER' : formData.branch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                      required={!isCustomBranch}
                    >
                      {(COURSE_BRANCH_MAP[formData.course] || []).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="OTHER">Other / Custom Branch...</option>
                    </select>

                    {isCustomBranch && (
                      <input
                        type="text"
                        placeholder="Type custom branch name"
                        value={formData.branch}
                        onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                        className="form-input"
                        style={{ width: '100%', height: '38px', marginTop: '6px', padding: '6px 10px' }}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="modal-form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="year">Current Year</label>
                    <select 
                      id="year" 
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="semester">Current Semester</label>
                    <select 
                      id="semester" 
                      value={formData.semester}
                      onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Photo Upload input */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Profile Photo (Max 5MB)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload}
                    className="form-input"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                  {formErrors.base64Photo && <span className="form-error-msg">{formErrors.base64Photo}</span>}
                  {formData.base64Photo && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={formData.base64Photo} 
                        alt="Upload Preview" 
                        style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                      />
                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>✓ Image ready for upload</span>
                    </div>
                  )}
                </div>

                {/* BED ASSIGNMENT FLOW: Only visible on Student Creation */}
                {modalMode === 'add' && (
                  <div className="modal-allocation-card">
                    <h3 className="modal-allocation-title">
                      Hostel Bed Assignment
                    </h3>
                    
                    <div className="modal-form-grid-2" style={{ marginBottom: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Select Hostel *</label>
                        <select 
                          value={formData.hostel_id} 
                          onChange={(e) => handleHostelChange(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', height: '40px', padding: '8px 12px' }}
                        >
                          <option value="">-- Choose Hostel --</option>
                          {hostels.map(h => (
                            <option key={h.id} value={h.id}>{h.name} ({h.gender})</option>
                          ))}
                        </select>
                        {formErrors.hostel_id && <span className="form-error-msg" style={{ fontSize: '11px' }}>{formErrors.hostel_id}</span>}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Select Floor (Optional)</label>
                        <select 
                          value={formData.floor_id} 
                          onChange={(e) => handleFloorChange(e.target.value)}
                          disabled={!formData.hostel_id || floorsLoading}
                          className="form-input"
                          style={{ width: '100%', height: '40px', padding: '8px 12px' }}
                        >
                          <option value="">{floorsLoading ? 'Loading floors...' : floors.length === 0 ? '-- No Floors / Single Floor --' : '-- Choose Floor (Optional) --'}</option>
                          {floors.map(f => (
                            <option key={f.id} value={f.id}>{f.floor_name} (Floor {f.floor_number})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="modal-form-grid-2" style={{ marginBottom: 0 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Select Room *</label>
                        <select 
                          value={formData.room_id} 
                          onChange={(e) => handleRoomChange(e.target.value)}
                          disabled={!formData.floor_id || roomsLoading}
                          className="form-input"
                          style={{ width: '100%', height: '40px', padding: '8px 12px' }}
                        >
                          <option value="">{roomsLoading ? 'Loading rooms...' : '-- Choose Room --'}</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.id}>Room {r.room_number} (Cap {r.capacity})</option>
                          ))}
                        </select>
                        {formErrors.room_id && <span className="form-error-msg" style={{ fontSize: '11px' }}>{formErrors.room_id}</span>}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Select Bed *</label>
                        <select 
                          value={formData.bed_id} 
                          onChange={(e) => setFormData(prev => ({ ...prev, bed_id: e.target.value }))}
                          disabled={!formData.room_id || bedsLoading}
                          className="form-input"
                          style={{ width: '100%', height: '40px', padding: '8px 12px' }}
                        >
                          <option value="">{bedsLoading ? 'Loading beds...' : '-- Choose Bed --'}</option>
                          {beds.filter(b => b.status === 'AVAILABLE').map(b => (
                            <option key={b.id} value={b.id}>Bed {b.bed_number}</option>
                          ))}
                        </select>
                        {formErrors.bed_id && <span className="form-error-msg" style={{ fontSize: '11px' }}>{formErrors.bed_id}</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="custom-modal-footer">
                <Button onClick={() => setIsAddEditOpen(false)} variant="secondary" type="button">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={actionLoading}>
                  {modalMode === 'add' ? 'Register Student' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Transfer Bed Assignment */}
      {isTransferOpen && selectedStudent && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsTransferOpen(false); }}>
          <div className="custom-modal-container" style={{ maxWidth: '520px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">Transfer Student Bed</h2>
                <p className="custom-modal-subtitle">Allocate <strong>{selectedStudent.full_name}</strong> to a different bed vacancy.</p>
              </div>
              <button 
                onClick={() => setIsTransferOpen(false)}
                className="custom-modal-close-btn"
                aria-label="Close modal"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-body">
                {formErrors.form && (
                  <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                    <span className="alert-icon">️</span>
                    <span className="alert-text">{formErrors.form}</span>
                  </div>
                )}

                <div style={{ marginBottom: '16px', fontSize: '13.5px', color: '#475569', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  Current: <strong style={{ color: '#2563eb' }}>{selectedStudent.hostel_name || 'Unassigned'}</strong>
                  {selectedStudent.room_number ? ` (Room ${selectedStudent.room_number}, Bed ${selectedStudent.bed_number})` : ''}
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Destination Hostel *</label>
                  <select 
                    value={transferData.new_hostel_id} 
                    onChange={(e) => handleHostelChange(e.target.value, true)}
                    className="form-input"
                    style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                  >
                    <option value="">-- Choose Hostel --</option>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Destination Floor (Optional)</label>
                  <select 
                    value={transferData.new_floor_id} 
                    onChange={(e) => handleFloorChange(e.target.value, true)}
                    disabled={!transferData.new_hostel_id || floorsLoading}
                    className="form-input"
                    style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                  >
                    <option value="">{floorsLoading ? 'Loading floors...' : floors.length === 0 ? '-- No Floors / Single Floor --' : '-- Choose Floor (Optional) --'}</option>
                    {floors.map(f => (
                      <option key={f.id} value={f.id}>{f.floor_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Destination Room *</label>
                  <select 
                    value={transferData.new_room_id} 
                    onChange={(e) => handleRoomChange(e.target.value, true)}
                    disabled={!transferData.new_floor_id || roomsLoading}
                    className="form-input"
                    style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                  >
                    <option value="">{roomsLoading ? 'Loading rooms...' : '-- Choose Room --'}</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.room_number}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Available Destination Bed *</label>
                  <select 
                    value={transferData.new_bed_id} 
                    onChange={(e) => setTransferData(prev => ({ ...prev, new_bed_id: e.target.value }))}
                    disabled={!transferData.new_room_id || bedsLoading}
                    className="form-input"
                    style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                  >
                    <option value="">{bedsLoading ? 'Loading beds...' : '-- Choose Bed --'}</option>
                    {beds.filter(b => b.status === 'AVAILABLE').map(b => (
                      <option key={b.id} value={b.id}>Bed {b.bed_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="custom-modal-footer">
                <Button onClick={() => setIsTransferOpen(false)} variant="secondary" type="button">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={actionLoading}>
                  Confirm Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Deactivate/Archive Student Account */}
      {isStatusOpen && selectedStudent && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsStatusOpen(false); }}>
          <div className="custom-modal-container" style={{ maxWidth: '480px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">Update Status / Deactivate</h2>
                <p className="custom-modal-subtitle">Alter the account status of <strong>{selectedStudent.full_name}</strong>.</p>
              </div>
              <button 
                onClick={() => setIsStatusOpen(false)}
                className="custom-modal-close-btn"
                aria-label="Close modal"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-body">
                {formErrors.form && (
                  <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                    <span className="alert-icon">️</span>
                    <span className="alert-text">{formErrors.form}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" htmlFor="status-select">Select New Status *</label>
                  <select 
                    id="status-select" 
                    value={statusData.status}
                    onChange={(e) => setStatusData({ status: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                  >
                    <option value="ACTIVE">ACTIVE (Re-activate or Restore account)</option>
                    <option value="INACTIVE">INACTIVE (Deactivates access & releases assigned bed)</option>
                    <option value="GRADUATED">GRADUATED (Archive student & releases assigned bed)</option>
                  </select>
                </div>

                <div style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong>Important Note:</strong> Switching a student to <code>INACTIVE</code> or <code>GRADUATED</code> will instantly release their currently assigned bed back to the availability pool.
                </div>
              </div>

              <div className="custom-modal-footer">
                <Button onClick={() => setIsStatusOpen(false)} variant="secondary" type="button">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={actionLoading}>
                  Confirm Status Change
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mass Student Excel / CSV Import Modal */}
      {isBulkImportOpen && (
        <div className="custom-modal-overlay" onClick={() => setIsBulkImportOpen(false)}>
          <div className="custom-modal-container" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">
                  <i className="fa-solid fa-file-excel text-emerald-600"></i>
                  Mass Student Excel / CSV Import
                </h2>
                <p className="custom-modal-subtitle">
                  Upload Google Form responses export (.xlsx, .csv) to register and allocate students in bulk.
                </p>
              </div>
              <button 
                onClick={() => setIsBulkImportOpen(false)}
                className="custom-modal-close-btn"
              >
                &times;
              </button>
            </div>

            <div className="custom-modal-body">
              {/* Step 1: Template download banner */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-circle-info text-emerald-600 text-lg"></i>
                  <div>
                    <strong style={{ color: '#15803d', fontSize: '14px' }}>Need the exact Excel format?</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#166534' }}>
                      Download our sample template matching all 12 Google Form fields.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="master-action-btn"
                  style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-download"></i> Download Sample Template (.xlsx)
                </button>
              </div>

              {/* Step 2: File Drag & Drop Input Zone */}
              <div className="bulk-drop-zone" onClick={() => document.getElementById('excel-file-input').click()}>
                <i className="fa-solid fa-cloud-arrow-up bulk-drop-icon"></i>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  {parsedStudents.length > 0 ? `Selected File (${parsedStudents.length} Students Parsed)` : 'Click to select or drag & drop Excel / CSV file'}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Supports .xlsx, .xls, and .csv files containing your 12 Google Form columns
                </p>
                <input 
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Import Alerts & Error Display */}
              {importError && (
                <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                  <span className="alert-icon">⚠️</span>
                  <span className="alert-text">{importError}</span>
                </div>
              )}

              {importSummary && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <span className="bulk-summary-badge badge-success">
                      <i className="fa-solid fa-circle-check"></i> Imported: {importSummary.importedCount}
                    </span>
                    <span className="bulk-summary-badge badge-warning">
                      <i className="fa-solid fa-circle-exclamation"></i> Skipped: {importSummary.skippedCount}
                    </span>
                    <span className="bulk-summary-badge badge-danger">
                      <i className="fa-solid fa-list-ol"></i> Total: {importSummary.total}
                    </span>
                  </div>

                  {importSummary.errors && importSummary.errors.length > 0 && (
                    <div style={{ maxHeight: '140px', overflowY: 'auto', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#9f1239' }}>
                      <strong style={{ display: 'block', marginBottom: '4px' }}>Skipped / Error Rows:</strong>
                      {importSummary.errors.map((errItem, eIdx) => (
                        <div key={eIdx}>
                          • Row {errItem.row} ({errItem.name} - {errItem.regNo}): {errItem.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Parsed Data Live Preview Table */}
              {parsedStudents.length > 0 && !importSummary && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                      Parsed Student Roster Preview ({parsedStudents.length} Records)
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Showing top 50 records</span>
                  </div>

                  <div className="bulk-preview-wrapper">
                    <table className="bulk-preview-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Student Name</th>
                          <th>Registration No</th>
                          <th>D.O.B</th>
                          <th>Email</th>
                          <th>Course</th>
                          <th>Stream</th>
                          <th>Year/Sem</th>
                          <th>Hostel</th>
                          <th>Floor</th>
                          <th>Room No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedStudents.slice(0, 50).map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td>{rIdx + 1}</td>
                            <td style={{ fontWeight: '700', color: '#0f172a' }}>{row['Student Name'] || row.name || 'N/A'}</td>
                            <td><code>{row['Registration No.'] || row['Registration No'] || row.registrationNo || 'AUTO'}</code></td>
                            <td>{row['D.O.B'] || row.dob || 'N/A'}</td>
                            <td>{row['Email Id'] || row['Email ID'] || row.email || 'AUTO'}</td>
                            <td>{row['Course'] || row.course || 'B.Tech'}</td>
                            <td>{row['stream'] || row.stream || row.branch || 'CSE'}</td>
                            <td>Yr {row['Year'] || 1}, Sem {row['Semister'] || 1}</td>
                            <td>{row['Hostel'] || row.hostel || 'Main Hostel'}</td>
                            <td>{row['Floor'] || row.floor || 'Floor 1'}</td>
                            <td>Room {row['ROOM NO'] || row.roomNo || '101'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="custom-modal-footer">
              <Button onClick={() => setIsBulkImportOpen(false)} variant="secondary" type="button">
                Close
              </Button>
              {parsedStudents.length > 0 && !importSummary && (
                <Button 
                  onClick={handleConfirmBulkImport} 
                  variant="primary" 
                  isLoading={importLoading}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  <i className="fa-solid fa-cloud-arrow-up mr-1"></i>
                  Confirm & Import ({parsedStudents.length} Students)
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
