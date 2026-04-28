import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { EKSArchitecture } from './pages/EKSArchitecture'
import { ServerlessArchitecture } from './pages/ServerlessArchitecture'
import { ThreeTierArchitecture } from './pages/ThreeTierArchitecture'
import { EventDrivenArchitecture } from './pages/EventDrivenArchitecture'
import { DataPipelineArchitecture } from './pages/DataPipelineArchitecture'
import { VPCNetworking } from './pages/VPCNetworking'
import { SecurityBestPractices } from './pages/SecurityBestPractices'
import { InfrastructureDesignerPage } from './pages/InfrastructureDesignerPage'
import { PipelineDesignerPage } from './pages/PipelineDesignerPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eks" element={<EKSArchitecture />} />
        <Route path="/serverless" element={<ServerlessArchitecture />} />
        <Route path="/three-tier" element={<ThreeTierArchitecture />} />
        <Route path="/event-driven" element={<EventDrivenArchitecture />} />
        <Route path="/data-pipeline" element={<DataPipelineArchitecture />} />
        <Route path="/vpc-networking" element={<VPCNetworking />} />
        <Route path="/security" element={<SecurityBestPractices />} />
        <Route path="/ai/infrastructure" element={<InfrastructureDesignerPage />} />
        <Route path="/ai/pipeline" element={<PipelineDesignerPage />} />
      </Routes>
    </Layout>
  )
}

export default App
