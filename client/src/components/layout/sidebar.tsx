import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuthStore, isAdmin } from "@/lib/auth";
import { 
  Home, 
  Package, 
  Images, 
  DollarSign, 
  Settings,
  Box,
  BarChart3,
  Users,
  Bell,
  FileSpreadsheet
} from "lucide-react";

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, requiresAdmin: false },
  { name: "Productos", href: "/products", icon: Package, requiresAdmin: false },
  { name: "Importar/Exportar", href: "/import-export", icon: FileSpreadsheet, requiresAdmin: false },
  { name: "Multimedia", href: "/multimedia", icon: Images, requiresAdmin: false },
  { name: "Reportes", href: "/reports", icon: BarChart3, requiresAdmin: false },
];

const adminNavigation = [
  { name: "Usuarios", href: "/users", icon: Users, requiresAdmin: true },
  { name: "Alertas", href: "/alerts", icon: Bell, requiresAdmin: true },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const user = useAuthStore((state) => state.user);
  
  // Combinar navegación base con navegación de admin si el usuario es admin
  const navigation = [
    ...baseNavigation,
    ...(isAdmin() ? adminNavigation : []),
  ];

  return (
    <div className={cn("flex flex-col w-64 bg-sidebar border-r border-sidebar-border", className)}>
      <div className="flex items-center flex-shrink-0 px-4 py-5">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Box className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="ml-3 text-xl font-bold text-sidebar-foreground">KOR Dashboard</h1>
        </div>
      </div>
      
      <div className="mt-8 flex-grow flex flex-col">
        <nav className="flex-1 px-2 pb-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/dashboard" && location === "/");
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* Indicador del rol del usuario actual */}
        {user && (
          <div className="px-4 pb-4 border-t border-sidebar-border pt-4">
            <div className="text-xs text-sidebar-foreground/60">
              <div className="font-medium">{user.username}</div>
              <div className="mt-1">
                Rol: <span className="font-medium capitalize">
                  {user.role === 'admin' ? 'Administrador' : 
                   user.role === 'editor' ? 'Editor' : 'Visor'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
