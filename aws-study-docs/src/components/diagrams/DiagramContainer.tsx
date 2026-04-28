import './DiagramContainer.css'

interface DiagramContainerProps {
  children: React.ReactNode
  title?: string
}

export function DiagramContainer({ children, title }: DiagramContainerProps) {
  return (
    <div className="diagram-container">
      {title && <h4 className="diagram-title">{title}</h4>}
      <div className="diagram-content">
        {children}
      </div>
    </div>
  )
}
