import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Package, 
  Images, 
  DollarSign, 
  Settings,
  Box
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Multimedia", href: "/multimedia", icon: Images },
  { name: "Configuración", href: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

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
      </div>
    </div>
  );
}
