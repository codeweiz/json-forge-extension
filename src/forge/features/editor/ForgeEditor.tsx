interface Props {
  initialValue: string
}

export default function ForgeEditor({ initialValue }: Props) {
  return (
    <div className="flex items-center justify-center h-full text-[#6c7086]">
      <p>Loading editor... ({initialValue.length} chars)</p>
    </div>
  )
}
