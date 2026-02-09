import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prepPepService } from '@/services/prepPepService';
import { useToast } from '@/hooks/use-toast';

export const useMyPrepPepServices = () => useQuery({
  queryKey: ['prep-pep-services-mine'],
  queryFn: () => prepPepService.getMyServices(),
});

export const useAvailablePrepPepServices = () => useQuery({
  queryKey: ['prep-pep-services-available'],
  queryFn: () => prepPepService.getAvailableServices(),
});

export const useUpsertPrepPepService = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Parameters<typeof prepPepService.upsertService>[0]) => prepPepService.upsertService(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prep-pep-services-mine'] });
      toast({ title: 'Service updated', description: 'PrEP/PEP service settings saved.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update service.', variant: 'destructive' }),
  });
};

export const useCreatePrepPepBooking = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Parameters<typeof prepPepService.createBooking>[0]) => prepPepService.createBooking(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prep-pep-bookings'] });
      toast({ title: 'Booking placed! 🎉', description: 'Your booking has been sent. Pay on delivery.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create booking.', variant: 'destructive' }),
  });
};

export const useMyPrepPepBookings = () => useQuery({
  queryKey: ['prep-pep-bookings'],
  queryFn: () => prepPepService.getMyBookings(),
});

export const useLabPrepPepBookings = () => useQuery({
  queryKey: ['prep-pep-lab-bookings'],
  queryFn: () => prepPepService.getLabBookings(),
});

export const useUpdatePrepPepBookingStatus = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: string; status: any; paymentStatus?: any }) =>
      prepPepService.updateBookingStatus(id, status, paymentStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prep-pep-lab-bookings'] });
      qc.invalidateQueries({ queryKey: ['prep-pep-bookings'] });
      toast({ title: 'Booking updated', description: 'Status changed successfully.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update booking.', variant: 'destructive' }),
  });
};
