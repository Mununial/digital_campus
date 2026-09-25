import React from 'react';

/**
 * MealCard - Displays single meal item details and participation actions for students.
 */
const MealCard = ({
  mealType,
  menuItem,
  participation,
  onToggleParticipation,
  isStudent = false,
  isUpdating = false,
  onEdit = null,
  canManage = false
}) => {
  const mealIcons = {
    BREAKFAST: 'fa-mug-hot',
    LUNCH: 'fa-bowl-rice',
    DINNER: 'fa-utensils'
  };

  const mealColors = {
    BREAKFAST: '#f59e0b',
    LUNCH: '#10b981',
    DINNER: '#6366f1'
  };

  const mealTitles = {
    BREAKFAST: 'Breakfast',
    LUNCH: 'Lunch',
    DINNER: 'Dinner'
  };

  const mealTimings = {
    BREAKFAST: '07:30 AM – 09:30 AM',
    LUNCH: '12:30 PM – 02:30 PM',
    DINNER: '07:30 PM – 09:30 PM'
  };

  const currentStatus = participation ? participation.status : 'TAKING'; // default opt-in

  return (
    <div className={`meal-card ${menuItem?.is_available === 0 ? 'unavailable' : ''}`}>
      <div className="meal-card-header">
        <div className="meal-title-group">
          <span className="meal-icon" style={{ color: mealColors[mealType] || '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`fa-solid ${mealIcons[mealType] || 'fa-utensils'}`}></i>
          </span>
          <div>
            <h4 className="meal-type-title">{mealTitles[mealType] || mealType}</h4>
            <span className="meal-timing-pill">
              <i className="fa-regular fa-clock mr-1"></i>
              {mealTimings[mealType] || 'Service Hours'}
            </span>
          </div>
        </div>
        {canManage && menuItem && onEdit && (
          <button 
            type="button" 
            className="btn-edit-meal"
            title="Edit this meal"
            onClick={() => onEdit(menuItem)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <i className="fa-solid fa-pen-to-square"></i> Edit
          </button>
        )}
      </div>

      <div className="meal-card-body">
        {menuItem ? (
          <>
            <h3 className="meal-name">{menuItem.meal_name}</h3>
            {menuItem.description && (
              <p className="meal-description">{menuItem.description}</p>
            )}
            <div className="meal-meta-row">
              <span className={`availability-badge ${menuItem.is_available ? 'available' : 'unavailable'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <i className={`fa-solid ${menuItem.is_available ? 'fa-check' : 'fa-xmark'}`}></i>
                {menuItem.is_available ? 'Serving Today' : 'Not Available'}
              </span>
              {menuItem.hostel_name && (
                <span className="meal-hostel-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-building text-slate-400"></i>
                  Hostel: {menuItem.hostel_name}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="empty-meal-state">
            <i className="fa-solid fa-utensils text-slate-300" style={{ fontSize: '1.5rem', marginBottom: '4px', display: 'block' }}></i>
            <p>No menu published for today</p>
          </div>
        )}
      </div>

      {isStudent && menuItem && menuItem.is_available !== 0 && (
        <div className="meal-card-footer">
          <div className="participation-toggle-container">
            <span className="participation-label">My Meal Status:</span>
            <div className="btn-group-toggle">
              <button
                type="button"
                className={`toggle-btn taking ${currentStatus === 'TAKING' ? 'active' : ''}`}
                disabled={isUpdating}
                onClick={() => onToggleParticipation && onToggleParticipation(mealType, 'TAKING')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <i className="fa-solid fa-check"></i> Taking
              </button>
              <button
                type="button"
                className={`toggle-btn not-taking ${currentStatus === 'NOT_TAKING' ? 'active' : ''}`}
                disabled={isUpdating}
                onClick={() => onToggleParticipation && onToggleParticipation(mealType, 'NOT_TAKING')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <i className="fa-solid fa-xmark"></i> Skipping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealCard;
