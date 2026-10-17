import { Alert } from './feedback';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getCart, persistCart, getCustomerRentals, getEquipment } from './database';

// Context shares SQLite-backed lists and cart state across nested screens.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const db = useSQLiteContext();
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartReady, setCartReady] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(null);

  const refreshEquipment = useCallback(async () => {
    try { setEquipment(await getEquipment(db)); } catch (error) { Alert.alert('Could not refresh equipment', error.message); }
  }, [db]);

  const refreshRentals = useCallback(async () => {
    try { setRentals(await getCustomerRentals(db)); } catch (error) { Alert.alert('Could not refresh rentals', error.message); }
  }, [db]);

  useEffect(() => {
    let active = true;
    Promise.all([getEquipment(db), getCustomerRentals(db), getCart(db)]).then(([nextEquipment, nextRentals, savedCart]) => {
      if (!active) return;
      setEquipment(nextEquipment);
      setRentals(nextRentals);
      setCart(savedCart);
      setCartReady(true);
    }).catch(error => Alert.alert('Could not load data', error.message));
    return () => { active = false; };
  }, [db]);

  // Save cart changes to SQLite after initial hydration, so a restart retains them.
  useEffect(() => {
    if (cartReady) persistCart(db, cart).catch(error => Alert.alert('Could not save cart', error.message));
  }, [db, cart, cartReady]);

  const addToCart = useCallback((item, quantity = 1) => {
    if (!item.is_active || item.total_quantity < 1) throw new Error('This equipment is out of stock.');
    const inCart = cart.find(row => row.equipment_id === item.equipment_id)?.quantity || 0;
    if (inCart + quantity > item.total_quantity) throw new Error(`Only ${item.total_quantity} units are in stock; ${inCart} are already in your cart.`);
    setCart((current) => {
      const existing = current.find((row) => row.equipment_id === item.equipment_id);
      if (existing) {
        return current.map((row) =>
          row.equipment_id === item.equipment_id
            ? { ...row, quantity: Math.min(row.quantity + quantity, item.total_quantity) }
            : row
        );
      }
      return [...current, { ...item, quantity }];
    });
  }, [cart]);

  const updateCartQuantity = useCallback((equipmentId, quantity) => {
    setCart((current) =>
      current.map((item) =>
        item.equipment_id === equipmentId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.total_quantity)) }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((equipmentId) => {
    setCart((current) => current.filter((item) => item.equipment_id !== equipmentId));
  }, []);

  const value = useMemo(
    () => ({
      db,
      equipment,
      rentals,
      cart,
      bookingDraft,
      setBookingDraft,
      refreshEquipment,
      refreshRentals,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart: () => setCart([]),
    }),
    [
      db,
      equipment,
      rentals,
      cart,
      bookingDraft,
      refreshEquipment,
      refreshRentals,
      addToCart,
      updateCartQuantity,
      removeFromCart,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
