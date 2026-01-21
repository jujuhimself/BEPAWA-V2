import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Store, Package, ClipboardList, BarChart3 } from 'lucide-react';

interface BusinessToolsProps {
  compact?: boolean;
}

const BusinessTools: React.FC<BusinessToolsProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const tools = [
    {
      key: 'staff',
      label: 'Staff Management',
      icon: <Users className="h-6 w-6" />,
      path: '/staff',
      roles: ['retail', 'wholesale'],
    },
    {
      key: 'credit',
      label: 'Credit/CRM',
      icon: <Store className="h-6 w-6" />,
      path: user && user.role === 'wholesale' ? '/wholesale/business-tools/credit' : '/credit',
      roles: ['retail', 'wholesale'],
    },
    {
      key: 'adjustments',
      label: 'Inventory Adjustments',
      icon: <Package className="h-6 w-6" />,
      path: '/inventory-adjustments',
      roles: ['retail', 'wholesale'],
    },
    {
      key: 'audit',
      label: 'Audit Reports',
      icon: <ClipboardList className="h-6 w-6" />,
      path: '/audit',
      roles: ['retail', 'wholesale'],
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-6 w-6" />,
      path: '/analytics',
      roles: ['retail', 'wholesale'],
    },
  ];

  const visibleTools = tools.filter(tool => tool.roles.includes(role));

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleTools.map(tool => (
          <Card 
            key={tool.key} 
            className="bg-card border-border hover:bg-muted/50 dark:hover:bg-muted/20 transition-all cursor-pointer group"
            onClick={() => navigate(tool.path)}
          >
            <CardContent className="flex flex-col items-center p-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary mb-2 group-hover:bg-primary/20 transition-colors">
                {tool.icon}
              </div>
              <span className="text-sm font-medium text-foreground text-center">{tool.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Business Tools</h2>
        <p className="text-muted-foreground mt-1">Enhanced tools to manage your healthcare business efficiently</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTools.map(tool => (
          <Card 
            key={tool.key} 
            className="bg-card border-border hover:border-primary/30 hover:shadow-lg dark:hover:shadow-black/30 transition-all cursor-pointer group"
            onClick={() => navigate(tool.path)}
          >
            <CardContent className="flex flex-col items-center p-6">
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-3 group-hover:bg-primary/20 transition-colors">
                {tool.icon}
              </div>
              <span className="font-semibold text-foreground">{tool.label}</span>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-3 border-border" 
                onClick={e => { e.stopPropagation(); navigate(tool.path); }}
              >
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BusinessTools;
