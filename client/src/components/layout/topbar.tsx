import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Menu,
  ChevronDown
} from "lucide-react";

interface TopbarProps {
  onMobileMenuToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Topbar({ 
  onMobileMenuToggle, 
  searchQuery = "", 
  onSearchChange 
}: TopbarProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of KOR Dashboard",
      });
    } catch (error) {
      // Even if the API call fails, we should still log out locally
      logout();
    }
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-card shadow-sm border-b border-border">
      <Button
        variant="ghost"
        size="sm"
        className="px-4 border-r border-border md:hidden"
        onClick={onMobileMenuToggle}
        data-testid="button-mobile-menu"
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <div className="relative w-96 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Buscar productos por SKU, modelo o descripción..."
                className="block w-full pl-10 pr-3 py-2"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 rounded-full"
            data-testid="button-notifications"
          >
            <Bell className="h-6 w-6" />
          </Button>
          
          <div className="ml-3 relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="max-w-xs flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="ml-3 text-foreground text-sm font-medium">
                    {user?.username || "Admin"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
