import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Store, Building2, Microscope, Bike, Users } from 'lucide-react';

interface RoleSelectorProps {
  selectedRole: string;
  onRoleSelect: (role: 'individual' | 'retail' | 'wholesale' | 'lab' | 'delivery' | 'staff') => void;
}

const RoleSelector = ({ selectedRole, onRoleSelect }: RoleSelectorProps) => {
  const roles = [
    {
      id: 'individual',
      title: 'Patient / Individual',
      description: 'Access medicines, upload prescriptions, find pharmacies, and get health consultations',
      icon: User,
      features: ['Order prescription medicines', 'Upload & manage prescriptions', 'Find nearby pharmacies & labs', 'AI health consultations'],
      color: 'bg-blue-500'
    },
    {
      id: 'retail',
      title: 'Retail Pharmacy',
      description: 'Serve patients and manage inventory by ordering from wholesale suppliers',
      icon: Store,
      features: ['Sell to individual patients', 'Order from wholesale suppliers', 'Smart inventory management', 'Patient prescription processing'],
      color: 'bg-green-500'
    },
    {
      id: 'wholesale',
      title: 'Wholesale Distributor',
      description: 'Supply medicines to retail pharmacies with bulk pricing and minimum order quantities',
      icon: Building2,
      features: ['B2B sales to pharmacies', 'Bulk pricing & MOQ management', 'Advanced inventory tracking', 'Retailer relationship management'],
      color: 'bg-purple-500'
    },
    {
      id: 'lab',
      title: 'Laboratory / Health Center',
      description: 'Offer diagnostic services, manage patient appointments, and share test results',
      icon: Microscope,
      features: ['Diagnostic test services', 'Patient appointment booking', 'Test result management', 'Healthcare provider integration'],
      color: 'bg-orange-500'
    },
    {
      id: 'delivery',
      title: 'Boda Rider',
      description: 'Deliver medicines and health products to customers with cash on delivery support',
      icon: Bike,
      features: ['Accept delivery assignments', 'Real-time order tracking', 'Cash collection & remittance', 'Route navigation support'],
      color: 'bg-yellow-500'
    },
    {
      id: 'staff',
      title: 'Staff Member',
      description: 'Join your pharmacy or wholesaler team with an invitation from your employer',
      icon: Users,
      features: ['Join via email invitation', 'Access based on assigned permissions', 'Work with your team\'s inventory', 'Limited dashboard access'],
      color: 'bg-cyan-500'
    }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roles.map((role) => {
        const Icon = role.icon;
        const isSelected = selectedRole === role.id;
        
        return (
          <Card 
            key={role.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onRoleSelect(role.id as any)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${isSelected ? 'bg-primary-500 text-white' : role.color + ' text-white'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                  </div>
                </div>
                {isSelected && <Badge variant="default">Selected</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">{role.description}</p>
              <div className="space-y-2">
                {role.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span className="leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RoleSelector;
