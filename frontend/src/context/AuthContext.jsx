import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminPasswordModal from '../components/AdminPasswordModal';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cafe_staff_user');
    return saved ? JSON.parse(saved) : {
      id: 1,
      username: 'owner',
      name: 'Arpit Sharma (Owner)',
      role: 'OWNER',
      role_display: 'Owner / Admin'
    };
  });

  const [cafeInfo, setCafeInfo] = useState(null);

  // Admin Password Edit Protection
  const [isEditUnlocked, setIsEditUnlocked] = useState(() => {
    return Boolean(sessionStorage.getItem('cafe_admin_edit_password'));
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [actionDesc, setActionDesc] = useState('');
  const [pendingCallback, setPendingCallback] = useState(null);

  const unlockEditing = (password) => {
    sessionStorage.setItem('cafe_admin_edit_password', password);
    setIsEditUnlocked(true);
  };

  const lockEditing = () => {
    sessionStorage.removeItem('cafe_admin_edit_password');
    setIsEditUnlocked(false);
  };

  const requireAdminAuth = (callback, description = 'make changes') => {
    // If already verified in this session, proceed immediately
    const savedPw = sessionStorage.getItem('cafe_admin_edit_password');
    if (savedPw || isEditUnlocked) {
      setIsEditUnlocked(true);
      if (typeof callback === 'function') callback();
      return true;
    }

    // Prompt for password
    setActionDesc(description);
    setPendingCallback(() => callback);
    setAuthModalOpen(true);
    return false;
  };

  const handleModalSuccess = (password) => {
    setIsEditUnlocked(true);
    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      cb();
    }
  };

  const handleModalClose = () => {
    setAuthModalOpen(false);
    setPendingCallback(null);
  };

  const refreshCafeProfile = async () => {
    try {
      const data = await api.getCafeProfile();
      setCafeInfo(data);
      return data;
    } catch (err) {
      console.error('Failed to load cafe profile', err);
    }
  };

  useEffect(() => {
    refreshCafeProfile();
  }, []);

  const loginWithCredentials = (userData) => {
    setUser(userData);
    localStorage.setItem('cafe_staff_user', JSON.stringify(userData));
  };

  const loginAs = async (role = 'OWNER', username = '') => {
    const defaultUsernames = {
      OWNER: 'owner',
      MANAGER: 'manager',
      CASHIER: 'cashier',
      KITCHEN: 'kitchen'
    };
    const uname = username || defaultUsernames[role] || 'staff';

    try {
      const res = await api.staffLogin({ username: uname, role });
      setUser(res.user);
      localStorage.setItem('cafe_staff_user', JSON.stringify(res.user));
      return res.user;
    } catch (err) {
      // Fallback local state if backend is booting
      const fallbackUser = {
        id: Date.now(),
        username: uname,
        name: `${uname.toUpperCase()}`,
        role: role,
        role_display: role.charAt(0) + role.slice(1).toLowerCase()
      };
      setUser(fallbackUser);
      localStorage.setItem('cafe_staff_user', JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  };

  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(() => {
    const saved = localStorage.getItem('staff_sound_alerts_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSoundAlerts = () => {
    setSoundAlertsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('staff_sound_alerts_enabled', JSON.stringify(next));
      return next;
    });
  };

  const [waiterCallAlertsEnabled, setWaiterCallAlertsEnabled] = useState(() => {
    const saved = localStorage.getItem('staff_waiter_alerts_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleWaiterCallAlerts = async (explicitVal = null) => {
    const performToggle = async () => {
      const nextVal = explicitVal !== null ? explicitVal : !waiterCallAlertsEnabled;
      setWaiterCallAlertsEnabled(nextVal);
      localStorage.setItem('staff_waiter_alerts_enabled', JSON.stringify(nextVal));
      try {
        await api.toggleWaiterAlerts(nextVal);
        refreshCafeProfile();
      } catch (e) {
        console.log('Failed to sync waiter alerts toggle with backend', e);
      }
    };

    requireAdminAuth(performToggle, 'toggle waiter alerts');
  };

  const toggleAdvanceBooking = async (explicitVal = null) => {
    return new Promise((resolve, reject) => {
      requireAdminAuth(async () => {
        try {
          const res = await api.toggleAdvanceBooking(explicitVal);
          refreshCafeProfile();
          resolve(res);
        } catch (e) {
          console.error('Failed to toggle advance booking', e);
          reject(e);
        }
      }, 'toggle advance table bookings');
    });
  };

  const logout = () => {
    localStorage.removeItem('cafe_staff_user');
    lockEditing();
    loginAs('CASHIER');
  };

  return (
    <AuthContext.Provider value={{
      user,
      cafeInfo,
      setCafeInfo,
      refreshCafeProfile,
      loginWithCredentials,
      loginAs,
      logout,
      soundAlertsEnabled,
      toggleSoundAlerts,
      waiterCallAlertsEnabled,
      toggleWaiterCallAlerts,
      toggleAdvanceBooking,
      isEditUnlocked,
      unlockEditing,
      lockEditing,
      requireAdminAuth
    }}>
      {children}
      <AdminPasswordModal
        isOpen={authModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        actionDescription={actionDesc}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


