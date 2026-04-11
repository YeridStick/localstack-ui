import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VPC, Subnet, SecurityGroup, SecurityGroupRule, RDSInstance, LoadBalancer } from '@/types/vpc';

interface VPCStore {
  vpcs: VPC[];
  securityGroups: SecurityGroup[];
  rdsInstances: RDSInstance[];
  loadBalancers: LoadBalancer[];
  
  // VPC actions
  addVPC: (vpc: VPC) => void;
  removeVPC: (id: string) => void;
  addSubnet: (vpcId: string, subnet: Subnet) => void;
  removeSubnet: (vpcId: string, subnetId: string) => void;
  
  // Security Group actions
  addSecurityGroup: (sg: SecurityGroup) => void;
  removeSecurityGroup: (id: string) => void;
  addInboundRule: (sgId: string, rule: SecurityGroupRule) => void;
  addOutboundRule: (sgId: string, rule: SecurityGroupRule) => void;
  
  // RDS actions
  addRDS: (rds: RDSInstance) => void;
  removeRDS: (id: string) => void;
  updateRDSStatus: (id: string, status: RDSInstance['status']) => void;
  updateRDSEndpoint: (id: string, endpoint: string) => void;
  
  // ALB actions
  addLoadBalancer: (alb: LoadBalancer) => void;
  removeLoadBalancer: (id: string) => void;
}

export const useVPCStore = create<VPCStore>()(
  persist(
    (set, get) => ({
      vpcs: [],
      securityGroups: [],
      rdsInstances: [],
      loadBalancers: [],
      
      addVPC: (vpc) => set((state) => ({ vpcs: [...state.vpcs, vpc] })),
      removeVPC: (id) => set((state) => ({ 
        vpcs: state.vpcs.filter((v) => v.id !== id),
        securityGroups: state.securityGroups.filter((sg) => sg.vpcId !== id),
      })),
      
      addSubnet: (vpcId, subnet) => set((state) => ({
        vpcs: state.vpcs.map((v) =>
          v.id === vpcId ? { ...v, subnets: [...v.subnets, subnet] } : v
        ),
      })),
      
      removeSubnet: (vpcId, subnetId) => set((state) => ({
        vpcs: state.vpcs.map((v) =>
          v.id === vpcId
            ? { ...v, subnets: v.subnets.filter((s) => s.id !== subnetId) }
            : v
        ),
      })),
      
      addSecurityGroup: (sg) => set((state) => ({
        securityGroups: [...state.securityGroups, sg],
      })),
      
      removeSecurityGroup: (id) => set((state) => ({
        securityGroups: state.securityGroups.filter((sg) => sg.id !== id),
      })),
      
      addInboundRule: (sgId, rule) => set((state) => ({
        securityGroups: state.securityGroups.map((sg) =>
          sg.id === sgId
            ? { ...sg, inboundRules: [...sg.inboundRules, rule] }
            : sg
        ),
      })),
      
      addOutboundRule: (sgId, rule) => set((state) => ({
        securityGroups: state.securityGroups.map((sg) =>
          sg.id === sgId
            ? { ...sg, outboundRules: [...sg.outboundRules, rule] }
            : sg
        ),
      })),
      
      addRDS: (rds) => set((state) => ({
        rdsInstances: [...state.rdsInstances, rds],
      })),
      
      removeRDS: (id) => set((state) => ({
        rdsInstances: state.rdsInstances.filter((r) => r.id !== id),
      })),
      
      updateRDSStatus: (id, status) => set((state) => ({
        rdsInstances: state.rdsInstances.map((r) =>
          r.id === id ? { ...r, status } : r
        ),
      })),
      
      updateRDSEndpoint: (id, endpoint) => set((state) => ({
        rdsInstances: state.rdsInstances.map((r) =>
          r.id === id ? { ...r, endpoint } : r
        ),
      })),
      
      addLoadBalancer: (alb) => set((state) => ({
        loadBalancers: [...state.loadBalancers, alb],
      })),
      
      removeLoadBalancer: (id) => set((state) => ({
        loadBalancers: state.loadBalancers.filter((lb) => lb.id !== id),
      })),
    }),
    {
      name: 'vpc-storage',
    }
  )
);
