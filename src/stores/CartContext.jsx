import { createContext, useContext, useReducer, useMemo } from 'react'

const CartContext = createContext(null)
const CartDispatchContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.id === action.item.id && i.shade === action.item.shade
      )
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === existing.id && i.shade === existing.shade
              ? { ...i, qty: i.qty + 1 }
              : i
          ),
        }
      }
      return { ...state, items: [...state.items, { ...action.item, qty: 1 }] }
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(
          (i) => !(i.id === action.id && i.shade === action.shade)
        ),
      }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id && i.shade === action.shade
            ? { ...i, qty: Math.max(0, action.qty) }
            : i
        ).filter((i) => i.qty > 0),
      }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'TOGGLE_PANEL':
      return { ...state, isOpen: !state.isOpen }
    case 'SET_PANEL':
      return { ...state, isOpen: action.isOpen }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false })

  const enrichedState = useMemo(() => ({
    ...state,
    totalItems: state.items.reduce((sum, i) => sum + i.qty, 0),
    totalPrice: state.items.reduce((sum, i) => sum + i.price * i.qty, 0),
  }), [state])

  return (
    <CartContext.Provider value={enrichedState}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function useCartDispatch() {
  const ctx = useContext(CartDispatchContext)
  if (!ctx) throw new Error('useCartDispatch must be used within CartProvider')
  return ctx
}
