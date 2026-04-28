import './DiagramNode.css'

interface DiagramNodeProps {
  type: 'aws' | 'network' | 'k8s' | 'lb' | 'security' | 'storage' | 'compute' | 'database' | 'serverless' | 'messaging'
  title: string
  subtitle: string
  children?: React.ReactNode
}

const typeStyles = {
  aws: 'node-aws',
  network: 'node-network',
  k8s: 'node-k8s',
  lb: 'node-lb',
  security: 'node-security',
  storage: 'node-storage',
  compute: 'node-compute',
  database: 'node-database',
  serverless: 'node-serverless',
  messaging: 'node-messaging'
}

export function DiagramNode({ type, title, subtitle, children }: DiagramNodeProps) {
  return (
    <div className={`diagram-node ${typeStyles[type]}`}>
      <div className="node-content">
        <strong>{title}</strong>
        <small>{subtitle}</small>
        {children && <div className="node-children">{children}</div>}
      </div>
    </div>
  )
}
