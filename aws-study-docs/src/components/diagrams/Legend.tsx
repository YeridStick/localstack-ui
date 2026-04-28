import './Legend.css'

interface LegendItem {
  color: string
  label: string
}

interface LegendProps {
  items: LegendItem[]
}

export function Legend({ items }: LegendProps) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span 
          key={item.label} 
          className="legend-item"
          style={{ background: item.color }}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}
