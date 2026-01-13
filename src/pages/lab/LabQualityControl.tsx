import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, CheckCircle, AlertTriangle, Search, Plus, Calendar } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import QualityControlForm from "@/components/lab/QualityControlForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

interface QualityControlCheck {
  id: string;
  equipment_name: string;
  check_type: 'daily' | 'weekly' | 'monthly' | 'calibration';
  status: 'passed' | 'failed' | 'pending';
  checked_by: string;
  check_date: string;
  next_check_date: string;
  notes?: string;
}

const LabQualityControl = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checks, setChecks] = useState<QualityControlCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCheck, setEditCheck] = useState<QualityControlCheck | null>(null);

  useEffect(() => {
    fetchChecks();
  }, []);

  const fetchChecks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quality_control_checks')
        .select('*')
        .order('check_date', { ascending: false });
      if (error) throw error;
      
      // Map and validate the data to match our interface
      const mappedChecks: QualityControlCheck[] = (data || []).map((item: any) => {
        const validCheckTypes = ['daily', 'weekly', 'monthly', 'calibration'];
        const validStatuses = ['passed', 'failed', 'pending'];
        
        return {
          id: item.id,
          equipment_name: item.equipment_name,
          check_type: validCheckTypes.includes(item.check_type) ? item.check_type : 'daily',
          status: validStatuses.includes(item.status) ? item.status : 'pending',
          checked_by: item.checked_by,
          check_date: item.check_date,
          next_check_date: item.next_check_date,
          notes: item.notes || undefined,
        };
      });
      
      setChecks(mappedChecks);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load quality control checks', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleCreateCheck = async (newCheck: Omit<QualityControlCheck, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('quality_control_checks')
        .insert({
          ...newCheck,
          checked_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      
      // Map the returned data to match our interface
      const validCheckTypes = ['daily', 'weekly', 'monthly', 'calibration'];
      const validStatuses = ['passed', 'failed', 'pending'];
      
      const mappedCheck: QualityControlCheck = {
        id: data.id,
        equipment_name: data.equipment_name,
        check_type: validCheckTypes.includes(data.check_type) ? data.check_type as QualityControlCheck['check_type'] : 'daily',
        status: validStatuses.includes(data.status) ? data.status as QualityControlCheck['status'] : 'pending',
        checked_by: data.checked_by,
        check_date: data.check_date,
        next_check_date: data.next_check_date,
        notes: data.notes || undefined,
      };
      
      setChecks([mappedCheck, ...checks]);
      toast({
        title: 'Quality control check created',
        description: `New ${newCheck.check_type} check for ${newCheck.equipment_name} has been recorded.`,
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create quality control check', variant: 'destructive' });
    }
  };

  const handleUpdateCheck = (id: string, updates: Partial<QualityControlCheck>) => {
    setChecks(checks.map(check => 
      check.id === id ? { ...check, ...updates } : check
    ));
    toast({
      title: "Check updated",
      description: "Quality control check has been updated successfully.",
    });
  };

  const handleEditCheck = async (id: string, updates: Partial<QualityControlCheck>) => {
    try {
      const { data, error } = await supabase
        .from('quality_control_checks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Map the returned data
      const validCheckTypes = ['daily', 'weekly', 'monthly', 'calibration'];
      const validStatuses = ['passed', 'failed', 'pending'];
      
      const mappedCheck: QualityControlCheck = {
        id: data.id,
        equipment_name: data.equipment_name,
        check_type: validCheckTypes.includes(data.check_type) ? data.check_type as QualityControlCheck['check_type'] : 'daily',
        status: validStatuses.includes(data.status) ? data.status as QualityControlCheck['status'] : 'pending',
        checked_by: data.checked_by,
        check_date: data.check_date,
        next_check_date: data.next_check_date,
        notes: data.notes || undefined,
      };
      
      setChecks(checks.map(check => check.id === id ? mappedCheck : check));
      toast({ title: 'Check updated', description: 'Quality control check has been updated successfully.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update quality control check', variant: 'destructive' });
    }
  };

  const handleDeleteCheck = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quality_control_checks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setChecks(checks.filter(check => check.id !== id));
      toast({ title: 'Check deleted', description: 'Quality control check has been deleted.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete quality control check', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCheckTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-purple-100 text-purple-800';
      case 'monthly': return 'bg-indigo-100 text-indigo-800';
      case 'calibration': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredChecks = checks.filter(check =>
    check.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    check.checked_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div>Loading quality control data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Quality Control"
          description="Monitor and manage laboratory quality control checks"
          badge={{ text: "Lab Portal", variant: "outline" }}
        />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search equipment or technician..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New QC Check
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Passed</p>
                  <p className="text-xl font-bold text-green-600">
                    {checks.filter(c => c.status === 'passed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-xl font-bold text-red-600">
                    {checks.filter(c => c.status === 'failed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {checks.filter(c => c.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Checks</p>
                  <p className="text-xl font-bold text-blue-600">{checks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {filteredChecks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quality control checks found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "No checks match your search." : "No quality control checks available."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredChecks.map((check) => (
              <Card key={check.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{check.equipment_name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getCheckTypeColor(check.check_type)}>
                          {check.check_type}
                        </Badge>
                        <Badge className={getStatusColor(check.status)}>
                          {check.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">Checked by: {check.checked_by}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Last Check: {new Date(check.check_date).toLocaleDateString()}</div>
                      <div>Next Check: {new Date(check.next_check_date).toLocaleDateString()}</div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setEditCheck(check)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCheck(check.id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                  
                  {check.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <h4 className="text-sm font-medium mb-1">Notes</h4>
                      <p className="text-sm text-gray-700">{check.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateCheck(check.id, { status: 'passed' })}
                    >
                      Update Check
                    </Button>
                    <Button variant="outline" size="sm">
                      Schedule Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <QualityControlForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateCheck}
        />
        {/* Edit QC Check Modal */}
        {editCheck && (
          <QualityControlForm
            isOpen={!!editCheck}
            onClose={() => setEditCheck(null)}
            onSubmit={async (data) => {
              await handleEditCheck(editCheck.id, data);
              setEditCheck(null);
            }}
            initialData={editCheck}
          />
        )}
      </div>
    </div>
  );
};

export default LabQualityControl;
