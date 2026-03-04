interface Props {
  value: string
  filename?: string
}

export default function ExportBar({ value, filename = 'data.json' }: Props) {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value)
  }

  const downloadFile = () => {
    const blob = new Blob([value], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={copyToClipboard}
        className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] cursor-pointer transition-colors"
      >
        Copy
      </button>
      <button
        onClick={downloadFile}
        className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] cursor-pointer transition-colors"
      >
        Download
      </button>
    </div>
  )
}
