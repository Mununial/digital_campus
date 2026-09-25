import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HostelCard.css';

/**
 * HostelCard — displays per-hostel statistics on the dashboard.
 * Resolves navigation base path from current URL automatically.
 */
function HostelCard({ hostel }) {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/superintendent') ? '/superintendent' : '/admin';

  const handleView = () => navigate(`${basePath}/hostels/${hostel.hostelId}`);

  const {
    name,
    totalStudents = 0,
    present = 0,
    absent = 0,
    notMarked = 0,
    attendancePercentage = 0,
    totalRooms = 0,
    totalBeds = 0,
    occupiedBeds = 0,
    availableBeds = 0,
    maintenanceBeds = 0,
    occupancyPercentage = 0,
  } = hostel;

  const isEmpty = totalStudents === 0 && totalBeds === 0;

  return (
    <article className="hostel-card">
      <header className="hostel-card__header">
        <h3 className="hostel-card__name">{name}</h3>
      </header>

      {isEmpty && <p className="hostel-card__empty">No students or beds configured.</p>}

      <div className="hostel-card__section">
        <p className="hostel-card__section-title">Students</p>
        <ul className="hostel-card__stats">
          <li><span>Total</span><strong>{totalStudents}</strong></li>
          <li className="stat--green"><span>Present</span><strong>{present}</strong></li>
          <li className="stat--red"><span>Absent</span><strong>{absent}</strong></li>
          <li className="stat--grey"><span>Not Marked</span><strong>{notMarked}</strong></li>
          <li className="stat--blue"><span>Attendance</span><strong>{attendancePercentage}%</strong></li>
        </ul>
      </div>

      <div className="hostel-card__section">
        <p className="hostel-card__section-title">Beds & Rooms</p>
        <ul className="hostel-card__stats">
          <li><span>Rooms</span><strong>{totalRooms}</strong></li>
          <li><span>Total Beds</span><strong>{totalBeds}</strong></li>
          <li className="stat--purple"><span>Occupied</span><strong>{occupiedBeds}</strong></li>
          <li className="stat--green"><span>Available</span><strong>{availableBeds}</strong></li>
          <li className="stat--amber"><span>Maintenance</span><strong>{maintenanceBeds}</strong></li>
          <li className="stat--blue"><span>Occupancy</span><strong>{occupancyPercentage}%</strong></li>
        </ul>
      </div>

      <button className="hostel-card__btn" onClick={handleView} aria-label={`View details for ${name}`}>
        View Hostel →
      </button>
    </article>
  );
}

export default HostelCard;
