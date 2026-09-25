import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './CafeteriaPage.css';

export default function CafeteriaPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'STUDENT';
  const isStaff = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'SUPERINTENDENT';

  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'orders', 'management'
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cart State (map of itemId => quantity)
  const [cart, setCart] = useState({});

  // Modals state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form states
  const [deliveryType, setDeliveryType] = useState('PICKUP');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [newItemForm, setNewItemForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    is_vegetarian: 1,
    preparation_time_mins: 15
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [selectedCategory, vegOnly]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCategory) filters.category_id = selectedCategory;
      if (vegOnly) filters.is_vegetarian = true;
      if (searchTerm) filters.search = searchTerm;

      const [catsRes, menuRes, statsRes] = await Promise.all([
        api.getCafeteriaCategories(),
        api.getCafeteriaMenu(filters),
        api.getCafeteriaStats()
      ]);

      setCategories(catsRes.data || []);
      setMenuItems(menuRes.data || []);
      setStats(statsRes.data || {});

      if (catsRes.data && catsRes.data.length > 0 && !newItemForm.category_id) {
        setNewItemForm(prev => ({ ...prev, category_id: catsRes.data[0].id }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load cafeteria data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.getCafeteriaOrders();
      setOrders(res.data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load orders.');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'orders') {
      fetchOrders();
    }
  };

  // Cart operations
  const updateCartQuantity = (itemId, delta) => {
    setCart(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const cartItemsList = Object.entries(cart).map(([itemId, qty]) => {
    const item = menuItems.find(i => i.id === Number(itemId));
    return { ...item, quantity: qty, subtotal: Number(item?.price || 0) * qty };
  }).filter(i => i.id);

  const totalCartAmount = cartItemsList.reduce((sum, item) => sum + item.subtotal, 0);
  const totalCartCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);

  // Place Order Submit
  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const orderPayload = {
        items: cartItemsList.map(i => ({ item_id: i.id, quantity: i.quantity })),
        delivery_type: deliveryType,
        delivery_location: deliveryLocation,
        payment_method: paymentMethod,
        special_instructions: specialInstructions
      };

      const res = await api.placeCafeteriaOrder(orderPayload);
      setSuccessMsg(`Order ${res.data.order_number} placed successfully!`);
      setCart({});
      setShowCheckoutModal(false);
      handleTabChange('orders');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to place cafeteria order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Add Food Item
  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.createCafeteriaItem(newItemForm);
      setSuccessMsg('New cafeteria food item added successfully!');
      setShowAddItemModal(false);
      setNewItemForm({
        category_id: categories[0]?.id || '',
        name: '',
        description: '',
        price: '',
        is_vegetarian: 1,
        preparation_time_mins: 15
      });
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add food item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Status Update
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.updateCafeteriaOrderStatus(orderId, newStatus);
      setSuccessMsg(`Order status updated to ${newStatus}.`);
      fetchOrders();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update order status.');
    }
  };

  // Toggle Item Availability
  const handleToggleAvailability = async (item) => {
    try {
      await api.updateCafeteriaItem(item.id, { is_available: !item.is_available });
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update item availability.');
    }
  };

  return (
    <div className="cafeteria-container">
      {/* Header Banner */}
      <div className="cafeteria-header">
        <div>
          <h1>🍕 Campus Cafeteria & Food Hub</h1>
          <p>Order fresh snacks, beverages, and meals directly to your hostel room or cafeteria pickup counter.</p>
        </div>
        {isStaff && (
          <button className="btn-request-primary" onClick={() => setShowAddItemModal(true)}>
            ➕ Add Food Item
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600 }}>⚠️ {errorMsg}</div>}
      {successMsg && <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600 }}>✅ {successMsg}</div>}

      {/* Summary KPI Cards */}
      <div className="cafeteria-stats-grid">
        <div className="cafeteria-stat-card">
          <div className="stat-info">
            <h3>Active Orders</h3>
            <div className="stat-number">{stats.active_orders || 0}</div>
          </div>
          <div className="stat-icon">🛵</div>
        </div>
        <div className="cafeteria-stat-card">
          <div className="stat-info">
            <h3>Preparing Kitchen</h3>
            <div className="stat-number">{stats.preparing || 0}</div>
          </div>
          <div className="stat-icon">🍳</div>
        </div>
        <div className="cafeteria-stat-card">
          <div className="stat-info">
            <h3>Delivered Today</h3>
            <div className="stat-number">{stats.delivered || 0}</div>
          </div>
          <div className="stat-icon">✅</div>
        </div>
        <div className="cafeteria-stat-card">
          <div className="stat-info">
            <h3>Total Sales</h3>
            <div className="stat-number">₹{Number(stats.total_revenue || 0).toFixed(0)}</div>
          </div>
          <div className="stat-icon">💰</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="cafeteria-tabs">
        <button
          className={`cafeteria-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => handleTabChange('menu')}
        >
          🍽️ Food Menu Catalog
        </button>
        <button
          className={`cafeteria-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleTabChange('orders')}
        >
          📋 {isStaff ? 'Order Management Dashboard' : 'My Orders & Live Status'}
        </button>
      </div>

      {/* TAB 1: MENU CATALOG */}
      {activeTab === 'menu' && (
        <>
          {/* Category Filter Pills */}
          <div className="category-pills-bar">
            <button
              className={`category-pill ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              All Categories ({menuItems.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name} ({cat.item_count || 0})
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading cafeteria menu...</div>
          ) : menuItems.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No food items available in this category.</div>
          ) : (
            <div className="menu-grid">
              {menuItems.map(item => {
                const cartQty = cart[item.id] || 0;
                return (
                  <div key={item.id} className="food-card">
                    <div>
                      {item.is_vegetarian ? (
                        <div className="veg-icon" title="Vegetarian"><div className="dot"></div></div>
                      ) : (
                        <div className="non-veg-icon" title="Non-Vegetarian"><div className="dot"></div></div>
                      )}
                      <div className="food-card-title">{item.name}</div>
                      <div className="food-card-desc">{item.description || 'Freshly prepared delicious item.'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        ⏱️ ~{item.preparation_time_mins || 15} mins prep
                      </div>
                      <div className="food-card-footer">
                        <div className="food-price">₹{Number(item.price).toFixed(2)}</div>

                        {!isStaff ? (
                          cartQty > 0 ? (
                            <div className="qty-counter">
                              <button onClick={() => updateCartQuantity(item.id, -1)}>-</button>
                              <span>{cartQty}</span>
                              <button onClick={() => updateCartQuantity(item.id, 1)}>+</button>
                            </div>
                          ) : (
                            <button
                              className="btn-add-cart"
                              onClick={() => updateCartQuantity(item.id, 1)}
                              disabled={!item.is_available}
                            >
                              {item.is_available ? '+ Add' : 'Out of Stock'}
                            </button>
                          )
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              style={{
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: item.is_available ? '#dcfce7' : '#fee2e2',
                                color: item.is_available ? '#166534' : '#991b1b',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              onClick={() => handleToggleAvailability(item)}
                            >
                              {item.is_available ? 'Available' : 'Out of Stock'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Cart Drawer (Student) */}
          {!isStaff && totalCartCount > 0 && (
            <div className="cart-floating-bar">
              <div className="cart-summary-text">
                <span className="cart-items-count">🛒 {totalCartCount} item(s)</span>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Amount</div>
                  <div className="cart-total-price">₹{totalCartAmount.toFixed(2)}</div>
                </div>
              </div>
              <button className="btn-view-cart" onClick={() => setShowCheckoutModal(true)}>
                View Cart & Checkout ➔
              </button>
            </div>
          )}
        </>
      )}

      {/* TAB 2: ORDERS DASHBOARD */}
      {activeTab === 'orders' && (
        <div className="orders-table-card">
          {orders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No active cafeteria orders found.</div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Details</th>
                  <th>Student Info</th>
                  <th>Items Ordered</th>
                  <th>Total Amount</th>
                  <th>Delivery & Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{order.order_number}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Placed: {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.student_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.roll_number}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {order.items && order.items.map((it, idx) => (
                          <div key={idx}>• {it.item_name} x {it.quantity} (₹{it.subtotal})</div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0284c7' }}>₹{Number(order.total_amount).toFixed(2)}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div><strong>Type:</strong> {order.delivery_type === 'ROOM_DELIVERY' ? '🛵 Room Delivery' : '🏃 Counter Pickup'}</div>
                        <div><strong>Payment:</strong> {order.payment_method} ({order.payment_status})</div>
                      </div>
                    </td>
                    <td>
                      <span className={`order-status-badge ${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {isStaff && order.status === 'PLACED' && (
                          <button
                            style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                            onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                          >
                            🍳 Start Prep
                          </button>
                        )}
                        {isStaff && order.status === 'PREPARING' && (
                          <button
                            style={{ background: '#0891b2', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                            onClick={() => handleStatusUpdate(order.id, 'READY')}
                          >
                            🔔 Mark Ready
                          </button>
                        )}
                        {isStaff && (order.status === 'READY' || order.status === 'PREPARING') && (
                          <button
                            style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                            onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                          >
                            ✅ Delivered
                          </button>
                        )}
                        {isStaff && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                          <button
                            style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                            onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                          >
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Checkout Modal (Student) */}
      {showCheckoutModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>🛒 Checkout Cafeteria Order</h2>
              <button className="btn-close" onClick={() => setShowCheckoutModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePlaceOrderSubmit}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Order Items</h3>
                  {cartItemsList.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      <span>{item.name} x {item.quantity}</span>
                      <strong>₹{item.subtotal.toFixed(2)}</strong>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>
                    <span>Total Amount</span>
                    <span>₹{totalCartAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Delivery Option</label>
                  <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                    <option value="PICKUP">🏃 Counter Pickup at Cafeteria</option>
                    <option value="ROOM_DELIVERY">🛵 Express Room Delivery</option>
                  </select>
                </div>

                {deliveryType === 'ROOM_DELIVERY' && (
                  <div className="form-group">
                    <label>Delivery Location Details</label>
                    <input
                      type="text"
                      placeholder="E.g., BEC Boys Hostel 1, Room 102"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="UPI">📱 Instant UPI / QR Scan</option>
                    <option value="MESS_CREDIT">💳 Deduct from Mess Monthly Credit</option>
                    <option value="CASH">💵 Cash on Delivery / Counter</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Special Cooking Instructions (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Extra chutney, less sugar, make spicy..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCheckoutModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" style={{ background: '#0284c7' }} disabled={submitting}>
                  {submitting ? 'Placing Order...' : 'Confirm & Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal (Staff) */}
      {showAddItemModal && isStaff && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>➕ Add New Food Item</h2>
              <button className="btn-close" onClick={() => setShowAddItemModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddItemSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={newItemForm.category_id}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category_id: e.target.value })}
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    placeholder="E.g., Cheese Garlic Bread"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="E.g. 50"
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Dietary Type</label>
                  <select
                    value={newItemForm.is_vegetarian}
                    onChange={(e) => setNewItemForm({ ...newItemForm, is_vegetarian: Number(e.target.value) })}
                  >
                    <option value={1}>🟢 Vegetarian</option>
                    <option value={0}>🔴 Non-Vegetarian</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="2"
                    placeholder="Short description of ingredients or taste..."
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddItemModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
