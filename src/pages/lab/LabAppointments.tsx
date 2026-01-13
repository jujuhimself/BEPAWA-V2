import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Plus, Filter } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppointmentScheduler from "@/components/lab/AppointmentScheduler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LabAppointment {
  id: string;
  user_id: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  patient_name: string;
  patient_phone?: string;
  priority?: string;
}

const LabAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<LabAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<LabAppointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [patientPhones, setPatientPhones] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  useEffect(() => {
    async function fetchPatientPhones() {
      const userIds = Array.from(new Set(appointments.map(a => a.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, phone')
          .in('id', userIds);
        if (profiles) {
          const phoneMap: Record<string, string> = {};
          profiles.forEach((p: any) => {
            phoneMap[p.id] = p.phone || '';
          });
          setPatientPhones(phoneMap);
        }
      }
    }
    fetchPatientPhones();
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      // 1. Fetch all lab appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_type', 'lab')
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        setIsLoading(false);
        return;
      }

      // 2. Get all unique user_ids
      const userIds = [...new Set(appointmentsData.map(a => a.user_id))];

      // 3. Fetch all profiles for those user_ids
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      const profilesMap = new Map();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // 4. Merge profile info into appointments with proper type casting
      const typedAppointments: LabAppointment[] = appointmentsData.map(apt => {
        const profile = profilesMap.get(apt.user_id);
        const validStatuses = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'];
        const status = validStatuses.includes(apt.status) ? apt.status as LabAppointment['status'] : 'scheduled';
        
        return {
          id: apt.id,
          user_id: apt.user_id,
          service_type: apt.service_type,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          status,
          notes: apt.notes || undefined,
          patient_name: profile?.name || 'Unknown',
          patient_phone: profile?.phone || 'Unknown',
          priority: apt.priority || undefined,
        };
      });
      setAppointments(typedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true;
    return apt.status === filter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div>Loading appointments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Lab Appointments"
          description="Manage laboratory test appointments"
          badge={{ text: "Lab Portal", variant: "outline" }}
        />

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={filter === 'scheduled' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('scheduled')}
            >
              Scheduled
            </Button>
            <Button 
              variant={filter === 'confirmed' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('confirmed')}
            >
              Confirmed
            </Button>
            <Button 
              variant={filter === 'completed' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Completed
            </Button>
          </div>
          <Button onClick={() => setShowAppointmentScheduler(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>

        <AppointmentScheduler
          isOpen={showAppointmentScheduler}
          onClose={() => setShowAppointmentScheduler(false)}
          onAppointmentCreated={() => { setShowAppointmentScheduler(false); fetchAppointments(); }}
          lab={user ? { id: user.id, name: user.name || user.email } : undefined}
        />

        {filteredAppointments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600 mb-4">
                {filter === 'all' 
                  ? "No lab appointments scheduled."
                  : `No ${filter} appointments found.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{appointment.service_type}</h3>
                      <div className="flex items-center text-gray-600 mb-2">
                        <User className="h-4 w-4 mr-1" />
                        <span>{appointment.patient_name}</span>
                      </div>
                      {appointment.patient_phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-1" />
                          <span>{appointment.patient_phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                      {appointment.priority && ['urgent', 'emergency'].includes(appointment.priority) && (
                        <Badge className={appointment.priority === 'urgent' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {appointment.priority.charAt(0).toUpperCase() + appointment.priority.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {appointment.priority && ['urgent', 'emergency'].includes(appointment.priority) && (
                    <div className="mt-2">
                      <span className="block text-xs text-red-700 font-semibold mb-1">This appointment requires immediate attention.</span>
                      {appointment.user_id && patientPhones[appointment.user_id] ? (
                        <a href={`tel:${patientPhones[appointment.user_id]}`} className="inline-block px-3 py-1 bg-green-600 text-white rounded shadow hover:bg-green-700 text-xs font-bold">
                          Call Patient
                        </a>
                      ) : (
                        <span className="block text-xs text-gray-600">Please follow up with the patient by phone as soon as possible.</span>
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{appointment.appointment_time}</span>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">{appointment.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedAppointment(appointment); setShowDetailsModal(true); }}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedAppointment(appointment); setShowUpdateModal(true); }}>
                      Update Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-2">
              <div><b>Service:</b> {selectedAppointment.service_type}</div>
              <div><b>Patient Name:</b> {selectedAppointment.patient_name}</div>
              <div><b>Phone:</b> {selectedAppointment.patient_phone}</div>
              <div><b>Date:</b> {new Date(selectedAppointment.appointment_date).toLocaleDateString()}</div>
              <div><b>Time:</b> {selectedAppointment.appointment_time}</div>
              <div><b>Status:</b> {selectedAppointment.status}</div>
              {selectedAppointment.notes && <div><b>Notes:</b> {selectedAppointment.notes}</div>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Update Status Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Appointment</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-2">
              <div><b>Current Status:</b> {selectedAppointment.status}</div>
              {/* Add status update, reschedule, cancel logic here */}
              <Button variant="destructive" onClick={() => {/* implement cancel logic */}}>Cancel Appointment</Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowUpdateModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabAppointments;
