import React, { useState, useEffect } from 'react';

const MEAL_OPTIONS = [
  { value: 'BREAKFAST', label: ' Breakfast (07:30 AM – 09:30 AM)' },
  { value: 'LUNCH', label: ' Lunch (12:30 PM – 02:30 PM)' },
  { value: 'DINNER', label: ' Dinner (07:30 PM – 09:30 PM)' }
];

const CATEGORIZED_PRESETS = {
  BREAKFAST: [
    { name: 'Puri Sabzi & Boiled Egg / Banana', desc: 'Hot puris with spiced aloo chana sabzi, boiled egg or banana, and hot tea/coffee' },
    { name: 'Idli Sambar & Coconut Chutney', desc: 'Soft steamed idlis with piping hot vegetable sambar, fresh coconut chutney and tea/coffee' },
    { name: 'Aloo Paratha with Curd & Pickle', desc: 'Stuffed aloo parathas served with fresh curd, mango pickle, butter and hot masala chai' },
    { name: 'Uttapam / Masala Dosa with Sambar', desc: 'Crispy dosa / onion uttapam served with lentil sambar, tomato chutney and tea' },
    { name: 'Poha with Peanuts & Sev', desc: 'Indori poha garnished with roasted peanuts, coriander and sev, boiled egg or fruit, tea' },
    { name: 'Bread Butter Jam & Veg Cutlet / Omelette', desc: 'Toasted bread with butter & fruit jam, crispy vegetable cutlet or masala omelette, tea/coffee' },
    { name: 'Chole Bhature & Masala Chai', desc: 'Fluffy bhaturas with Punjabi chole, sliced onions & green chillies, and special masala tea' }
  ],
  LUNCH: [
    { name: 'Steamed Rice, Dal Tadka & Mix Veg', desc: 'Basmati rice, yellow dal tadka, seasonal mixed vegetables, crispy papad, salad and fresh curd' },
    { name: 'Rice, Dal Fry, Aloo Gobhi Matar & Salad', desc: 'Steamed rice, arhar dal fry, homestyle aloo gobhi matar sabzi, green salad and curd' },
    { name: 'Rice, Odia Dalma & Bhindi Kurkuri', desc: 'Steamed rice, authentic vegetable dalma, crispy bhindi fry, papad, curd and lemon' },
    { name: 'Rice, Chana Dal & Aloo Baingan', desc: 'Steamed rice, chana dal fry, spiced aloo baingan bhaja, cucumber salad and fresh dahi' },
    { name: 'Rice, Yellow Moong Dal, Soyabean Aloo Curry', desc: 'Steamed rice, yellow moong dal, soya chunks aloo curry, roasted papad and curd' },
    { name: 'Rice, Dal Makhani & Kashmiri Aloo Dum', desc: 'Steamed rice, rich dal makhani, Kashmiri aloo dum, cucumber tomato salad and curd' },
    { name: 'Sunday Feast: Biryani / Chicken Curry / Shahi Paneer', desc: 'Weekend special biryani / ghee rice, chicken masala / shahi paneer, boondi raita, papad & sweet' }
  ],
  DINNER: [
    { name: 'Tawa Roti, Egg Curry / Paneer Butter Masala', desc: 'Fresh wheat rotis, rich egg curry or paneer butter masala, steamed rice, dal fry and pickle' },
    { name: 'Roti, Veg Pulao, Dal Makhani & Sweet Kheer', desc: 'Soft rotis, aromatic veg pulao, creamy dal makhani, mix veg curry and sweet rice kheer' },
    { name: 'Roti, Chicken Curry / Shahi Paneer & Rice', desc: 'Hot rotis, special chicken curry or shahi paneer, jeera rice, dal tadka and onions' },
    { name: 'Roti, Jeera Rice, Kadai Sabzi & Gulab Jamun', desc: 'Phulka rotis, jeera rice, seasonal kadai veg curry, dal fry, and warm gulab jamun' },
    { name: 'Roti, Egg Curry / Kadai Paneer, Rice & Dal', desc: 'Fresh wheat rotis, egg curry or kadai paneer, steamed rice, dal fry and green salad' },
    { name: 'Roti, Veg Fried Rice & Manchurian / Chilli Paneer', desc: 'Soft rotis, Indo-Chinese veg fried rice, veg manchurian gravy / chilli paneer, and soup' },
    { name: 'Roti, Special Bhog Khichdi, Aloo Bhaja & Ice Cream', desc: 'Light comfort dinner: Roti, special bhog khichdi / steamed rice, aloo bhaja, dal, and ice cream' }
  ]
};

/**
 * MenuFormModal - Warden & Admin modal to create or update hostel mess meals.
 */
const MenuFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  editItem = null,
  initialDate = null,
  initialMealType = null,
  hostels = [],
  selectedHostelId = '',
  userRole = 'SUPER_ADMIN'
}) => {
  const [formData, setFormData] = useState({
    hostel_id: '',
    menu_date: new Date().toISOString().split('T')[0],
    meal_type: 'BREAKFAST',
    meal_name: '',
    description: '',
    is_available: true
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        hostel_id: editItem.hostel_id ? String(editItem.hostel_id) : (selectedHostelId || (hostels.length > 0 ? String(hostels[0].id) : '')),
        menu_date: editItem.menu_date ? String(editItem.menu_date).substring(0, 10) : new Date().toISOString().split('T')[0],
        meal_type: editItem.meal_type || 'BREAKFAST',
        meal_name: editItem.meal_name || '',
        description: editItem.description || '',
        is_available: editItem.is_available === 1 || editItem.is_available === true
      });
    } else {
      const defaultHostel = selectedHostelId || (hostels.length > 0 ? String(hostels[0].id) : '');
      setFormData({
        hostel_id: defaultHostel,
        menu_date: initialDate || new Date().toISOString().split('T')[0],
        meal_type: initialMealType || 'BREAKFAST',
        meal_name: '',
        description: '',
        is_available: true
      });
    }
    setError('');
  }, [editItem, initialDate, initialMealType, isOpen, hostels, selectedHostelId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectPreset = (presetObj) => {
    setFormData(prev => ({
      ...prev,
      meal_name: presetObj.name,
      description: presetObj.desc
    }));
  };

  const handleAutoFillTemplate = () => {
    const currentList = CATEGORIZED_PRESETS[formData.meal_type] || CATEGORIZED_PRESETS.BREAKFAST;
    const randomItem = currentList[Math.floor(Math.random() * currentList.length)];
    setFormData(prev => ({
      ...prev,
      meal_name: randomItem.name,
      description: randomItem.desc
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.meal_name.trim()) {
      setError('Please enter a meal / dish name.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSubmit({
        ...formData,
        hostel_id: formData.hostel_id ? parseInt(formData.hostel_id, 10) : null
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save menu item.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentMealPresets = CATEGORIZED_PRESETS[formData.meal_type] || CATEGORIZED_PRESETS.BREAKFAST;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-md mess-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header flex-between align-center">
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-utensils text-indigo-600"></i>
              {editItem ? 'Update Mess Food Dish' : 'Add Meal Dish to Time-Table'}
            </h3>
            <p className="modal-sub">Fast manual menu entry with 1-click food suggestions</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            {error && <div className="alert alert-danger mb-3">{error}</div>}

            {hostels.length > 0 && (
              <div className="form-group mb-3">
                <label className="form-label">Hostel</label>
                <select
                  name="hostel_id"
                  value={formData.hostel_id}
                  onChange={handleChange}
                  disabled={!!editItem}
                  className="form-select"
                >
                  {userRole === 'SUPER_ADMIN' && <option value="">All Hostels (Common Schedule)</option>}
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row mb-3" style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label required">Schedule Date</label>
                <input
                  type="date"
                  name="menu_date"
                  value={formData.menu_date}
                  onChange={handleChange}
                  required
                  disabled={!!editItem}
                  className="form-control"
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label required">Meal Time</label>
                <select
                  name="meal_type"
                  value={formData.meal_type}
                  onChange={handleChange}
                  disabled={!!editItem}
                  className="form-select"
                >
                  {MEAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group mb-3">
              <div className="flex-between align-center mb-1">
                <label className="form-label required" style={{ marginBottom: 0 }}>Dish / Menu Items</label>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleAutoFillTemplate}
                  style={{ fontSize: '0.82rem', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  ✨ Auto-Fill Template Dish
                </button>
              </div>

              <input
                type="text"
                name="meal_name"
                placeholder="e.g. Puri Sabzi & Boiled Egg / Chai"
                value={formData.meal_name}
                onChange={handleChange}
                required
                className="form-control"
              />
              
              {/* Quick Preset Chips grouped by meal type */}
              <div className="preset-chips-container mt-2" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span className="preset-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  ⚡ Quick {formData.meal_type} Suggestions (Click to fill):
                </span>
                <div className="preset-chips-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {currentMealPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-chip-btn"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        borderRadius: '20px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.borderColor = '#6366f1'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Detailed Description / Ingredients (Optional)</label>
              <textarea
                name="description"
                placeholder="e.g. Served with hot spicy chana sabzi, banana or boiled egg, tea/coffee"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="form-control"
              />
            </div>

            <div className="form-group mb-3">
              <label className="checkbox-label flex-gap align-center" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_available"
                  checked={formData.is_available}
                  onChange={handleChange}
                />
                <span>Dish is currently served & available in mess</span>
              </label>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving Menu...' : (editItem ? '✓ Save Changes' : '✓ Add Meal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuFormModal;
