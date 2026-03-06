import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextValue>({
  toast: {
    success: () => {},
    error: () => {},
    info: () => {},
  },
})

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext).toast
}

function ToastMessage({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(item.id), 200)
    }, item.duration)
    return () => clearTimeout(timer)
  }, [item, onRemove])

  const bgColor = {
    success: 'var(--jf-success)',
    error: 'var(--jf-error)',
    info: 'var(--jf-primary)',
  }[item.type]

  return (
    <div
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--jf-primary-text)',
        backgroundColor: bgColor,
        transition: 'all 0.2s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: 'auto',
      }}
    >
      {item.message}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const add = useCallback((message: string, type: ToastType, duration = 2000) => {
    const id = crypto.randomUUID()
    setItems(prev => [...prev, { id, message, type, duration }])
  }, [])

  const toast = {
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {items.map(item => (
          <ToastMessage key={item.id} item={item} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
