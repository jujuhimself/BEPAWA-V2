import React from "react";
import { 
  Home, 
  Settings, 
  FileText, 
  Package, 
  BarChart3, 
  Truck, 
  Users, 
  Wrench, 
  ShoppingCart, 
  TestTube, 
  Building, 
  CreditCard, 
  Calculator,
  Calendar,
  Heart,
  Shield,
  Activity,
  Database,
  UserCheck,
  Eye,
} from "lucide-react";
import { FaCashRegister } from 'react-icons/fa';

export interface NavigationItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

export interface NavigationGroup {
  name: string;
  items: NavigationItem[];
}

export class NavigationMenuConfig {
  private role: string;
  private staffPermissions?: Record<string, boolean>;

  constructor(role: string, staffPermissions?: Record<string, boolean>) {
    this.role = role;
    this.staffPermissions = staffPermissions;
  }

  private getNavigationItems(): Record<string, NavigationItem[]> {
    return {
      admin: [
        { label: "Dashboard", icon: React.createElement(Home, { className: "w-4 h-4" }), href: "/admin" },
        { label: "User Management", icon: React.createElement(Users, { className: "w-4 h-4" }), href: "/admin/users" },
        { label: "Branch Management", icon: React.createElement(Building, { className: "w-4 h-4" }), href: "/admin/branches" },
        { label: "System Monitoring", icon: React.createElement(Activity, { className: "w-4 h-4" }), href: "/admin/system-monitoring" },
        { label: "Audit Logs", icon: React.createElement(Eye, { className: "w-4 h-4" }), href: "/admin/audit-logs" },
        { label: "Settings", icon: React.createElement(Settings, { className: "w-4 h-4" }), href: "/settings" },
      ],
      individual: [
        { label: "Dashboard", icon: React.createElement(Home, { className: "w-4 h-4" }), href: "/individual" },
        { label: "Find Pharmacies", icon: React.createElement(Building, { className: "w-4 h-4" }), href: "/pharmacy-directory" },
        { label: "Find Labs", icon: React.createElement(TestTube, { className: "w-4 h-4" }), href: "/lab-directory" },
        { label: "My Prescriptions", icon: React.createElement(FileText, { className: "w-4 h-4" }), href: "/prescriptions" },
        { label: "My Orders", icon: React.createElement(Truck, { className: "w-4 h-4" }), href: "/my-orders" },
        { label: "Cart", icon: React.createElement(ShoppingCart, { className: "w-4 h-4" }), href: "/cart" },
        { label: "Appointments", icon: React.createElement(Calendar, { className: "w-4 h-4" }), href: "/appointments" },
        { label: "Health Records", icon: React.createElement(Heart, { className: "w-4 h-4" }), href: "/health-records" },
        { label: "Bepawa Care", icon: React.createElement(Shield, { className: "w-4 h-4" }), href: "/bepawa-care" },
        { label: "PrEP & PEP", icon: React.createElement(Heart, { className: "w-4 h-4" }), href: "/prep-pep" },
        { label: "Settings", icon: React.createElement(Settings, { className: "w-4 h-4" }), href: "/settings" },
      ],
      retail: [
        { label: "Dashboard", icon: React.createElement(Home, { className: "w-4 h-4" }), href: "/pharmacy" },
        { label: "Inventory Dashboard", icon: React.createElement(BarChart3, { className: "w-4 h-4" }), href: "/inventory-dashboard" },
        { label: "Inventory", icon: React.createElement(Package, { className: "w-4 h-4" }), href: "/inventory-management" },
        { label: "Browse Products", icon: React.createElement(Package, { className: "w-4 h-4" }), href: "/catalog" },
        { label: "Wholesale Orders", icon: React.createElement(Truck, { className: "w-4 h-4" }), href: "/wholesale-ordering" },
        { label: "Cart", icon: React.createElement(ShoppingCart, { className: "w-4 h-4" }), href: "/cart" },
        { label: "Orders", icon: React.createElement(FileText, { className: "w-4 h-4" }), href: "/orders" },
        { label: "Appointments", icon: React.createElement(Calendar, { className: "w-4 h-4" }), href: "/pharmacy/appointments" },
        { label: "Business Center", icon: React.createElement(Calculator, { className: "w-4 h-4" }), href: "/business-center" },
        { label: "Credit Request", icon: React.createElement(CreditCard, { className: "w-4 h-4" }), href: "/credit-request" },
        { label: "POS", icon: React.createElement(FaCashRegister, { size: 16 }), href: "/pos" },
        { label: "Business Operations Hub", icon: React.createElement(Wrench, { className: "w-4 h-4" }), href: "/business-tools" },
        { label: "Subscription", icon: React.createElement(CreditCard, { className: "w-4 h-4" }), href: "/subscription" },
        { label: "Settings", icon: React.createElement(Settings, { className: "w-4 h-4" }), href: "/settings" },
      ],
      wholesale: [
        { label: "Dashboard", icon: React.createElement(Home, { className: "w-4 h-4" }), href: "/wholesale" },
        { label: "Inventory Dashboard", icon: React.createElement(BarChart3, { className: "w-4 h-4" }), href: "/inventory-dashboard" },
        { label: "Inventory", icon: React.createElement(Package, { className: "w-4 h-4" }), href: "/wholesale/inventory" },
        { label: "Retailer Orders", icon: React.createElement(Users, { className: "w-4 h-4" }), href: "/wholesale/retailer-orders" },
        { label: "Purchase Orders", icon: React.createElement(FileText, { className: "w-4 h-4" }), href: "/wholesale/purchase-orders" },
        { label: "Retailers", icon: React.createElement(Users, { className: "w-4 h-4" }), href: "/wholesale/retailers" },
        { label: "POS", icon: React.createElement(FaCashRegister, { size: 16 }), href: "/pos" },
        { label: "Credit Management", icon: React.createElement(CreditCard, { className: "w-4 h-4" }), href: "/wholesale/business-tools/credit" },
        { label: "Business Operations Hub", icon: React.createElement(Wrench, { className: "w-4 h-4" }), href: "/business-tools" },
        { label: "Subscription", icon: React.createElement(CreditCard, { className: "w-4 h-4" }), href: "/subscription" },
        { label: "Settings", icon: React.createElement(Settings, { className: "w-4 h-4" }), href: "/settings" },
      ],
      lab: [
        { label: "Dashboard", icon: React.createElement(Home, { className: "w-4 h-4" }), href: "/lab" },
        { label: "Test Catalog", icon: React.createElement(TestTube, { className: "w-4 h-4" }), href: "/lab/test-catalog" },
        { label: "Appointments", icon: React.createElement(Calendar, { className: "w-4 h-4" }), href: "/lab/appointments" },
        { label: "Results Management", icon: React.createElement(Database, { className: "w-4 h-4" }), href: "/lab/results" },
        { label: "PrEP & PEP", icon: React.createElement(Shield, { className: "w-4 h-4" }), href: "/lab" },
        { label: "Quality Control", icon: React.createElement(Shield, { className: "w-4 h-4" }), href: "/lab/quality-control" },
        { label: "Subscription", icon: React.createElement(CreditCard, { className: "w-4 h-4" }), href: "/subscription" },
        { label: "Settings", icon: React.createElement(Settings, { className: "w-4 h-4" }), href: "/settings" },
      ],
      delivery: [
        { label: "My Deliveries", icon: React.createElement(Truck, { className: "w-4 h-4" }), href: "/delivery" },
        { label: "Settings", icon: React.createElement(Settings, { className: "w-4 h-4" }), href: "/settings" },
      ],
    };
  }

  private groupItemsByCategory(items: NavigationItem[]): NavigationGroup[] {
    // Merge all items with the same group name into a single group
    const groupedItems: Record<string, NavigationItem[]> = {};
    const groupMapping: Record<string, string> = {
      "Dashboard": "General",
      "Analytics": "General",
      "System Monitoring": "Administration",
      "User Management": "Administration", 
      "Audit Logs": "Administration",
      "Inventory": "Inventory",
      "Inventory Dashboard": "Inventory",
      "Browse Products": "Inventory",
      "Wholesale Orders": "Orders",
      "Cart": "Orders",
      "Orders": "Orders",
      "Business Center": "Business",
      "Business Operations Hub": "Business",
      "Credit Request": "Business",
      "Retailers": "Business",
      "Find Pharmacies": "Directory",
      "Find Labs": "Directory",
      "My Prescriptions": "Health",
      "My Orders": "Orders",
      "Appointments": "Health",
      "Health Records": "Health",
      "Bepawa Care": "Health",
      "PrEP & PEP": "Health",
      "Test Catalog": "Lab Services",
      "Results Management": "Lab Services",
      "Quality Control": "Lab Services",
      "POS": "General",
      "My Deliveries": "General",
      "Settings": "Account",
    };

    items.forEach(item => {
      const groupName = groupMapping[item.label] || "Other";
      if (!groupedItems[groupName]) {
        groupedItems[groupName] = [];
      }
      groupedItems[groupName].push(item);
    });

    const groupOrder = [
      "General", 
      "Administration",
      "Inventory", 
      "Orders", 
      "Business", 
      "Directory", 
      "Health", 
      "Lab Services", 
      "Tools", 
      "Account", 
      "Other"
    ];
    
    // Only one group per name, with all items merged
    return groupOrder
      .filter(groupName => groupedItems[groupName])
      .map(groupName => ({
        name: groupName,
        items: groupedItems[groupName]
      }));
  }

  getMenuGroups(): NavigationGroup[] {
    const allItems = this.getNavigationItems();
    let roleItems = allItems[this.role] || allItems['retail'];
    
    // If staff with permissions, filter navigation items to only allowed sections
    if (this.staffPermissions) {
      const permissionToLabels: Record<string, string[]> = {
        pos: ['POS'],
        inventory: ['Inventory', 'Inventory Dashboard', 'Browse Products'],
        orders: ['Orders', 'Wholesale Orders', 'Cart', 'Retailer Orders', 'Purchase Orders', 'My Orders'],
        business_tools: ['Business Center', 'Business Operations Hub'],
        analytics: ['Analytics'],
        credit_crm: ['Credit Request', 'Credit Management', 'Retailers'],
        audit: ['Audit Logs'],
        alerts: ['Alerts'],
      };
      
      // Always allow Dashboard and Settings
      const allowedLabels = new Set(['Dashboard', 'Settings', 'Subscription']);
      
      Object.entries(this.staffPermissions).forEach(([perm, enabled]) => {
        if (enabled && permissionToLabels[perm]) {
          permissionToLabels[perm].forEach(label => allowedLabels.add(label));
        }
      });
      
      roleItems = roleItems.filter(item => allowedLabels.has(item.label));
    }
    
    return this.groupItemsByCategory(roleItems);
  }

  getMenuItems(): NavigationItem[] {
    const allItems = this.getNavigationItems();
    return allItems[this.role] || allItems['retail'];
  }
}
