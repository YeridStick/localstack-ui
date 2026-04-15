"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AVAILABLE_SERVICES } from "@/config/services";
import {
  Package,
  MessageSquare,
  Key,
  Activity,
  Workflow,
  Clock,
  FileText,
  Layers,
  BookOpenCheck,
  Globe,
  Shield,
  Zap,
  Home,
  LucideIcon,
  Server,
  Database,
  Network,
  Scale,
  Container,
  Users,
  Folder,
  Boxes,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const iconMap: Record<string, LucideIcon> = {
  Package,
  MessageSquare,
  Key,
  Activity,
  Workflow,
  Clock,
  FileText,
  Layers,
  Globe,
  Shield,
  Zap,
  Server,
  Database,
  Network,
  Scale,
  Container,
  Users,
  Folder,
};

const SERVICE_GROUPS: Array<{
  label: string;
  ids: string[];
}> = [
  {
    label: "Compute",
    ids: ["ec2", "lambda", "ecs", "elbv2"],
  },
  {
    label: "Storage",
    ids: ["s3", "efs", "rds", "elasticache", "dynamodb"],
  },
  {
    label: "Networking",
    ids: ["vpc", "apigateway", "route53"],
  },
  {
    label: "Integration",
    ids: ["sqs", "eventbridge", "scheduler"],
  },
  {
    label: "Security & IaC",
    ids: ["iam", "secretsmanager", "cloudformation", "cloudwatch", "logs"],
  },
];

interface SidebarProps {
  className?: string;
}

function serviceById(id: string) {
  return AVAILABLE_SERVICES.find((service) => service.id === id);
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("w-72 border-r bg-slate-950 text-slate-100", className)}>
      <ScrollArea className="h-full">
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-orange-500/20 p-1.5">
              <Boxes className="h-4 w-4 text-orange-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">AWS Local Console</h2>
              <p className="mt-1 text-[11px] text-slate-400">MiniStack / LocalStack</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3">
          <Link href="/">
            <div
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === "/"
                  ? "bg-orange-500/20 text-orange-200"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
              )}
            >
              <Home className="h-4 w-4" />
              <span>Overview</span>
            </div>
          </Link>

          <Link href="/services/infrastructure">
            <div
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === "/services/infrastructure"
                  ? "bg-orange-500/20 text-orange-200"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
              )}
            >
              <Activity className="h-4 w-4" />
              <span>Infrastructure</span>
            </div>
          </Link>

          <Link href="/services/study">
            <div
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === "/services/study"
                  ? "bg-orange-500/20 text-orange-200"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
              )}
            >
              <BookOpenCheck className="h-4 w-4" />
              <span>Study Lab</span>
            </div>
          </Link>

          <div className="h-px bg-slate-800" />

          {SERVICE_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
              {group.ids.map((serviceId) => {
                const service = serviceById(serviceId);
                if (!service || !service.enabled) {
                  return null;
                }

                const Icon = iconMap[service.icon] || Package;
                const href = service.href || `/services/${service.id}`;
                const isActive = pathname === href;

                return (
                  <Link key={service.id} href={href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-orange-500/20 text-orange-200"
                          : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{service.displayName}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
