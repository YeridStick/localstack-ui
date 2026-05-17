import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Cloud, 
  Server, 
  Layers, 
  Zap, 
  Database, 
  Network, 
  Shield, 
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

const menuItems = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/eks', icon: Cloud, label: 'EKS + K8s' },
  { path: '/serverless', icon: Zap, label: 'Serverless' },
  { path: '/three-tier', icon: Server, label: '3 Capas (EC2)' },
  { path: '/event-driven', icon: Layers, label: 'Event-Driven' },
  { path: '/data-pipeline', icon: Database, label: 'Data Pipeline' },
  { path: '/vpc-networking', icon: Network, label: 'VPC Networking' },
  { path: '/security', icon: Shield, label: 'Seguridad' },
]


export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Cloud size={28} className="logo-icon" />
            <span className="logo-text">AWS Study</span>
          </div>
          <p className="logo-subtitle">Arquitectura Cloud</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              <ChevronRight size={16} className="nav-arrow" />
            </NavLink>
          ))}
          
        </nav>

        <div className="sidebar-footer">
          <div className="footer-badges">
            <span className="footer-badge aws">AWS</span>
            <span className="footer-badge k8s">K8s</span>
            <span className="footer-badge tf">IaC</span>
          </div>
          <p className="footer-text">Docs Profesionales</p>
        </div>
      </aside>

      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}
    </>
  )
}
