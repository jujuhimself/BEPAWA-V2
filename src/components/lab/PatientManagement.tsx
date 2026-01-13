import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  AlertTriangle, 
  FileText, 
  Plus,
  Edit,
  Eye,
  X,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PatientSearch, { Patient } from "./PatientSearch";

interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  blood_type?: string;
  height?: number;
  weight?: number;
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    provider: string;
    policy_number: string;
    group_number?: string;
  };
  allergies: string[];
  medications: string[];
  medical_history: string[];
  created_at: string;
  updated_at: string;
}

interface LabResult {
  id: string;
  test_type: string;
  result_data: any;
  status: string;
  created_at: string;
}

interface Appointment {
  id: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

const PatientManagement = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientData(selectedPatient.id);
    }
  }, [selectedPatient]);

  const fetchPatientData = async (patientId: string) => {
    try {
      // Create default profile from selected patient (no patient_profiles table)
      const defaultProfile: PatientProfile = {
        id: patientId,
        user_id: patientId,
        full_name: selectedPatient?.full_name || selectedPatient?.email || "",
        email: selectedPatient?.email || "",
        phone: selectedPatient?.phone || "",
        date_of_birth: "",
        gender: "other",
        emergency_contact: {
          name: "",
          relationship: "",
          phone: ""
        },
        insurance: {
          provider: "",
          policy_number: "",
          group_number: ""
        },
        allergies: [],
        medications: [],
        medical_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setPatientProfile(defaultProfile);

      // Fetch lab results
      const { data: results } = await supabase
        .from('lab_results')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      const mappedResults: LabResult[] = (results || []).map((r: any) => ({
        id: r.id,
        test_type: r.test_type || 'Unknown',
        result_data: r.result_data,
        status: r.status || 'pending',
        created_at: r.created_at
      }));
      setLabResults(mappedResults);

      // Fetch appointments
      const { data: apts } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', patientId)
        .order('appointment_date', { ascending: false });

      const mappedAppointments: Appointment[] = (apts || []).map((a: any) => ({
        id: a.id,
        service_type: a.service_type,
        appointment_date: a.appointment_date,
        appointment_time: a.appointment_time,
        status: a.status,
        created_at: a.created_at
      }));
      setAppointments(mappedAppointments);

    } catch (error) {
      console.error("Error fetching patient data:", error);
      toast({
        title: "Error",
        description: "Failed to load patient data",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async () => {
    if (!patientProfile) return;

    // Since there's no patient_profiles table, just update local state
    setPatientProfile(prev => prev ? { ...prev, ...formData } : null);
    setShowEditProfile(false);
    setFormData({});
    
    toast({
      title: "Profile Updated",
      description: "Patient profile has been updated locally.",
    });
  };

  const handleAddAllergy = () => {
    if (!formData.allergy || !patientProfile) return;

    const updatedProfile = {
      ...patientProfile,
      allergies: [...patientProfile.allergies, formData.allergy]
    };
    setPatientProfile(updatedProfile);
    setShowAddAllergy(false);
    setFormData({});
  };

  const handleAddMedication = () => {
    if (!formData.medication || !patientProfile) return;

    const updatedProfile = {
      ...patientProfile,
      medications: [...patientProfile.medications, formData.medication]
    };
    setPatientProfile(updatedProfile);
    setShowAddMedication(false);
    setFormData({});
  };

  const handleRemoveAllergy = (allergy: string) => {
    if (!patientProfile) return;

    const updatedProfile = {
      ...patientProfile,
      allergies: patientProfile.allergies.filter(a => a !== allergy)
    };
    setPatientProfile(updatedProfile);
  };

  const handleRemoveMedication = (medication: string) => {
    if (!patientProfile) return;

    const updatedProfile = {
      ...patientProfile,
      medications: patientProfile.medications.filter(m => m !== medication)
    };
    setPatientProfile(updatedProfile);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (!selectedPatient) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Patient Management</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Patient</h3>
              <p className="text-gray-600 mb-4">Search for a patient to view their profile and medical history</p>
              <PatientSearch
                onPatientSelect={setSelectedPatient}
                selectedPatient={selectedPatient}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Patient Management</h2>
        <div className="flex gap-2">
          <PatientSearch
            onPatientSelect={setSelectedPatient}
            selectedPatient={selectedPatient}
          />
          <Button onClick={() => setShowEditProfile(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {patientProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">{patientProfile.full_name}</h4>
                  <p className="text-sm text-gray-600">{patientProfile.email}</p>
                  <p className="text-sm text-gray-600">{patientProfile.phone}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500">Date of Birth</Label>
                    <p>{patientProfile.date_of_birth ? format(new Date(patientProfile.date_of_birth), 'MMM dd, yyyy') : 'Not specified'}</p>
                    {patientProfile.date_of_birth && (
                      <p className="text-xs text-gray-500">Age: {calculateAge(patientProfile.date_of_birth)}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-500">Gender</Label>
                    <p className="capitalize">{patientProfile.gender}</p>
                  </div>
                  {patientProfile.blood_type && (
                    <div>
                      <Label className="text-gray-500">Blood Type</Label>
                      <p>{patientProfile.blood_type}</p>
                    </div>
                  )}
                  {patientProfile.height && patientProfile.weight && (
                    <div>
                      <Label className="text-gray-500">BMI</Label>
                      <p>{((patientProfile.weight / Math.pow(patientProfile.height / 100, 2)).toFixed(1))}</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-gray-500">Emergency Contact</Label>
                  <div className="mt-1 p-2 bg-red-50 rounded">
                    <p className="font-medium">{patientProfile.emergency_contact.name || 'Not specified'}</p>
                    <p className="text-sm text-gray-600">{patientProfile.emergency_contact.relationship}</p>
                    <p className="text-sm text-gray-600">{patientProfile.emergency_contact.phone}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500">Insurance</Label>
                  <div className="mt-1 p-2 bg-blue-50 rounded">
                    <p className="font-medium">{patientProfile.insurance.provider || 'Not specified'}</p>
                    <p className="text-sm text-gray-600">Policy: {patientProfile.insurance.policy_number || 'N/A'}</p>
                    {patientProfile.insurance.group_number && (
                      <p className="text-sm text-gray-600">Group: {patientProfile.insurance.group_number}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-gray-500">Allergies</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAllergy(true)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {patientProfile.allergies.length === 0 ? (
                      <p className="text-sm text-gray-500">No allergies recorded</p>
                    ) : (
                      patientProfile.allergies.map((allergy, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm">{allergy}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAllergy(allergy)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-gray-500">Current Medications</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMedication(true)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {patientProfile.medications.length === 0 ? (
                      <p className="text-sm text-gray-500">No medications recorded</p>
                    ) : (
                      patientProfile.medications.map((medication, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <span className="text-sm">{medication}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMedication(medication)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500">Medical History</Label>
                  <div className="mt-1 space-y-1">
                    {patientProfile.medical_history.length === 0 ? (
                      <p className="text-sm text-gray-500">No medical history recorded</p>
                    ) : (
                      patientProfile.medical_history.map((condition, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded">
                          <span className="text-sm">{condition}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-500">Recent Lab Results</Label>
                  <div className="mt-1 space-y-1">
                    {labResults.slice(0, 3).map((result) => (
                      <div key={result.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{result.test_type}</span>
                          <Badge className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(result.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    ))}
                    {labResults.length === 0 && (
                      <p className="text-sm text-gray-500">No lab results</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500">Recent Appointments</Label>
                  <div className="mt-1 space-y-1">
                    {appointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{appointment.service_type}</span>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(appointment.appointment_date), 'MMM dd, yyyy')} at {appointment.appointment_time}
                        </p>
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <p className="text-sm text-gray-500">No appointments</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Patient Profile</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.full_name || patientProfile?.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone || patientProfile?.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth || patientProfile?.date_of_birth || ''}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select
                value={formData.gender || patientProfile?.gender || 'other'}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Blood Type</Label>
              <Input
                value={formData.blood_type || patientProfile?.blood_type || ''}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
              />
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input
                type="number"
                value={formData.height || patientProfile?.height || ''}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                value={formData.weight || patientProfile?.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>Cancel</Button>
            <Button onClick={handleUpdateProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Allergy Dialog */}
      <Dialog open={showAddAllergy} onOpenChange={setShowAddAllergy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allergy</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Allergy</Label>
            <Input
              value={formData.allergy || ''}
              onChange={(e) => setFormData({ ...formData, allergy: e.target.value })}
              placeholder="Enter allergy name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAllergy(false)}>Cancel</Button>
            <Button onClick={handleAddAllergy}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Medication Dialog */}
      <Dialog open={showAddMedication} onOpenChange={setShowAddMedication}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medication</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Medication</Label>
            <Input
              value={formData.medication || ''}
              onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
              placeholder="Enter medication name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMedication(false)}>Cancel</Button>
            <Button onClick={handleAddMedication}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientManagement;
