import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('cafe_customer');
    return saved ? JSON.parse(saved) : null;
  });

  const addItem = (menuItem, quantity = 1, variant = null, addons = [], notes = '') => {
    setCartItems(prev => {
      // Check if identical item (same dish, variant, addons, notes) exists
      const addonIds = addons.map(a => a.name).sort().join(',');
      const existingIdx = prev.findIndex(ci => 
        ci.item.id === menuItem.id &&
        ci.variant?.name === variant?.name &&
        ci.addons.map(a => a.name).sort().join(',') === addonIds &&
        ci.notes === notes
      );

      const basePrice = variant ? parseFloat(variant.price) : parseFloat(menuItem.price);
      const addonsPrice = addons.reduce((sum, a) => sum + parseFloat(a.price), 0);
      const unitTotal = basePrice + addonsPrice;

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        updated[existingIdx].totalPrice = updated[existingIdx].quantity * unitTotal;
        return updated;
      } else {
        return [
          ...prev,
          {
            item: menuItem,
            quantity,
            variant,
            addons,
            notes,
            unitPrice: unitTotal,
            totalPrice: unitTotal * quantity
          }
        ];
      }
    });
  };

  const updateQuantity = (index, newQty) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setCartItems(prev => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
      return updated;
    });
  };

  const removeItem = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const saveCustomer = (cust) => {
    setCustomer(cust);
    localStorage.setItem('cafe_customer', JSON.stringify(cust));
  };

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      cartCount,
      cartSubtotal,
      customer,
      saveCustomer
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
