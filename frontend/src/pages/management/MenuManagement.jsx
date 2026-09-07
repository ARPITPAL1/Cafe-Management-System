import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Tag,
  DollarSign,
  Clock,
  Sparkles,
  Layers,
  X
} from 'lucide-react';

export default function MenuManagement() {
  const { requireAdminAuth } = useAuth();
  const [catalog, setCatalog] = useState({ categories: [], global_addons: [] });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [addDishOpen, setAddDishOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);

  // Form State
  const [dishForm, setDishForm] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    food_cost: '',
    packaging_cost: '5.00',
    is_veg: true,
    spice_level: 0,
    prep_time_mins: 15,
    is_bestseller: false,
    is_recommended: false,
    image_url: ''
  });

  const [newCatName, setNewCatName] = useState('');

  const fetchMenu = async () => {
    try {
      const res = await api.getMenuCatalog(false);
      setCatalog(res);
      if (res.categories?.length > 0 && !dishForm.category_id) {
        setDishForm(prev => ({ ...prev, category_id: res.categories[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleStock = async (itemId) => {
    requireAdminAuth(async () => {
      try {
        await api.toggleItemStock(itemId);
        fetchMenu();
      } catch (err) {
        alert('Error updating availability: ' + err.message);
      }
    }, 'change item stock availability');
  };

  const handleAddDish = async (e) => {
    e.preventDefault();
    requireAdminAuth(async () => {
      try {
        await api.addMenuItem({
          ...dishForm,
          category: parseInt(dishForm.category_id),
          price: parseFloat(dishForm.price),
          food_cost: parseFloat(dishForm.food_cost || 0),
          packaging_cost: parseFloat(dishForm.packaging_cost || 0)
        });
        setAddDishOpen(false);
        setDishForm({
          name: '',
          category_id: catalog.categories[0]?.id || '',
          description: '',
          price: '',
          food_cost: '',
          packaging_cost: '5.00',
          is_veg: true,
          spice_level: 0,
          prep_time_mins: 15,
          is_bestseller: false,
          is_recommended: false,
          image_url: ''
        });
        fetchMenu();
      } catch (err) {
        alert('Failed to add dish: ' + err.message);
      }
    }, 'add new menu dish');
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    requireAdminAuth(async () => {
      try {
        await api.addCategory({ name: newCatName, display_order: catalog.categories.length + 1 });
        setNewCatName('');
        setAddCatOpen(false);
        fetchMenu();
      } catch (err) {
        alert('Failed to add category: ' + err.message);
      }
    }, 'create menu category');
  };

  // Flatten items for listing
  const allItems = [];
  catalog.categories?.forEach(cat => {
    cat.items?.forEach(item => {
      allItems.push({ ...item, category_name: cat.name });
    });
  });

  const filteredItems = allItems.filter(item => {
    const matchesCat = selectedCategory === 'ALL' || item.category_name === selectedCategory;
    const matchesSearch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate live margin in form
  const formPrice = parseFloat(dishForm.price) || 0;
  const formCost = (parseFloat(dishForm.food_cost) || 0) + (parseFloat(dishForm.packaging_cost) || 0);
  const formMargin = formPrice - formCost;
  const formMarginPct = formPrice > 0 ? ((formMargin / formPrice) * 100).toFixed(1) : 0;

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Menu & Recipe Cost Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Control dish pricing, food costs, gross profit margins and instant stock availability
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setAddCatOpen(true)} className="btn btn-secondary btn-sm">
            <Layers size={14} />
            <span>+ Category</span>
          </button>
          <button onClick={() => setAddDishOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>+ Add Dish</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedCategory === 'ALL' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              background: selectedCategory === 'ALL' ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
              color: selectedCategory === 'ALL' ? 'var(--accent-gold)' : 'var(--text-secondary)'
            }}
          >
            All Items ({allItems.length})
          </button>

          {catalog.categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: selectedCategory === cat.name ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                background: selectedCategory === cat.name ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                color: selectedCategory === cat.name ? 'var(--accent-gold)' : 'var(--text-secondary)'
              }}
            >
              {cat.name} ({cat.items?.length || 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search dish or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading menu catalog...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20
        }}>
          {filteredItems.map(dish => (
            <div
              key={dish.id}
              className="glass-panel"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: dish.is_available ? 1 : 0.65,
                border: dish.is_available ? '1px solid var(--border-subtle)' : '1px dashed var(--status-occupied)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* Dish image thumbnail if present */}
                {dish.image_url && (
                  <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => e.target.style.display = 'none'}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(4px)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: dish.is_veg ? 'var(--status-available)' : 'var(--status-occupied)'
                    }}>
                      {dish.is_veg ? '🟢 VEG' : '🔴 NON-VEG'}
                    </div>

                    {!dish.is_available && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--status-occupied)',
                        fontWeight: 800,
                        fontSize: '1rem',
                        letterSpacing: '0.05em'
                      }}>
                        OUT OF STOCK
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {dish.name}
                      </h3>
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                        {dish.category_name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{dish.price}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--status-available)', fontWeight: 600 }}>
                        {dish.margin_percentage}% margin
                      </div>
                    </div>
                  </div>

                  {dish.description && (
                    <p style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      marginTop: 8,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {dish.description}
                    </p>
                  )}

                  {/* Food Cost & Profit Metrics */}
                  <div style={{
                    marginTop: 14,
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Food Cost: </span>
                      <strong style={{ color: 'var(--text-secondary)' }}>₹{dish.food_cost}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Gross Profit: </span>
                      <strong style={{ color: 'var(--status-available)' }}>+₹{dish.gross_margin}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Stock Toggle */}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface)'
              }}>
                <span style={{ fontSize: '0.78rem', color: dish.is_available ? 'var(--status-available)' : 'var(--status-occupied)', fontWeight: 700 }}>
                  {dish.is_available ? 'In Stock (Live)' : 'Marked Out of Stock'}
                </span>

                <button
                  onClick={() => handleToggleStock(dish.id)}
                  className={`btn btn-sm ${dish.is_available ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ fontSize: '0.75rem' }}
                >
                  {dish.is_available ? 'Mark Out of Stock' : 'Make Available'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      {addCatOpen && (
        <div className="modal-backdrop" onClick={() => setAddCatOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem' }}>Add Menu Category</h3>
              <button onClick={() => setAddCatOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Artisanal Sandwiches, Mocktails"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  marginBottom: 16
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setAddCatOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dish Modal with Cost & Margin Architecture */}
      {addDishOpen && (
        <div className="modal-backdrop" onClick={() => setAddDishOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Add Gourmet Dish</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Set selling price, recipe food costs & live margin intelligence
                </p>
              </div>
              <button onClick={() => setAddDishOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDish} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Dish Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Truffle Cream Fettuccine"
                  value={dishForm.name}
                  onChange={e => setDishForm({ ...dishForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={dishForm.category_id}
                    onChange={e => setDishForm({ ...dishForm, category_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  >
                    {catalog.categories?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Dietary Type
                  </label>
                  <select
                    value={dishForm.is_veg ? 'true' : 'false'}
                    onChange={e => setDishForm({ ...dishForm, is_veg: e.target.value === 'true' })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="true">🟢 Vegetarian</option>
                    <option value="false">🔴 Non-Vegetarian</option>
                  </select>
                </div>
              </div>

              {/* Price & Cost Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="299"
                    value={dishForm.price}
                    onChange={e => setDishForm({ ...dishForm, price: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontWeight: 700
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Food / Raw Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="90"
                    value={dishForm.food_cost}
                    onChange={e => setDishForm({ ...dishForm, food_cost: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Packaging Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dishForm.packaging_cost}
                    onChange={e => setDishForm({ ...dishForm, packaging_cost: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Live Margin Calculation Preview */}
              <div style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem'
              }}>
                <span>Gross Profit: <strong>₹{formMargin.toFixed(2)}</strong></span>
                <span style={{ color: 'var(--status-available)', fontWeight: 700 }}>
                  Estimated Margin: {formMarginPct}%
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Description & Ingredients
                </label>
                <textarea
                  rows={2}
                  placeholder="Gourmet ingredients, prep style, and allergens..."
                  value={dishForm.description}
                  onChange={e => setDishForm({ ...dishForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Image URL (Unsplash or direct)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={dishForm.image_url}
                  onChange={e => setDishForm({ ...dishForm, image_url: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setAddDishOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Dish & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
