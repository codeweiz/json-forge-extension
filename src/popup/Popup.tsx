export default function Popup() {
  const openForge = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
  }

  return (
    <div style={{ padding: '16px', background: '#1e1e2e', color: '#cdd6f4', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#89b4fa', fontWeight: 700, fontSize: '16px', margin: '0 0 12px 0' }}>
        ⚒ JSON Forge
      </h1>
      <button
        onClick={openForge}
        style={{
          width: '100%',
          padding: '8px',
          background: '#89b4fa',
          color: '#1e1e2e',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
        }}
      >
        Open Forge
      </button>
      <p style={{ marginTop: '8px', fontSize: '12px', color: '#6c7086', margin: '8px 0 0 0' }}>
        Visit any JSON URL to auto-render
      </p>
    </div>
  )
}
