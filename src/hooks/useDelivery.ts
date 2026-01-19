import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryService, DeliveryAssignment } from '@/services/deliveryService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Hook for pharmacy to get COD orders
export const usePharmacyCODOrders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pharmacy-cod-orders', user?.id],
    queryFn: () => user?.id ? deliveryService.getPharmacyCODOrders(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Hook for accepting an order
export const useAcceptOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (orderId: string) => deliveryService.acceptOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-cod-orders'] });
      toast({
        title: 'Order Accepted',
        description: 'Stock has been reserved. Prepare the order for pickup.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept order',
        variant: 'destructive',
      });
    },
  });
};

// Hook for rejecting an order
export const useRejectOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      deliveryService.rejectOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-cod-orders'] });
      toast({
        title: 'Order Rejected',
        description: 'The customer has been notified.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject order',
        variant: 'destructive',
      });
    },
  });
};

// Hook for marking order as ready
export const useMarkOrderReady = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (orderId: string) => deliveryService.markOrderReady(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-cod-orders'] });
      toast({
        title: 'Order Ready',
        description: 'You can now assign a rider for delivery.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark order ready',
        variant: 'destructive',
      });
    },
  });
};

// Hook for getting available riders
export const useAvailableRiders = () => {
  return useQuery({
    queryKey: ['available-riders'],
    queryFn: () => deliveryService.getAvailableRiders(),
  });
};

// Hook for requesting a rider
export const useRequestRider = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
      deliveryService.requestRider(orderId, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-cod-orders'] });
      queryClient.invalidateQueries({ queryKey: ['available-riders'] });
      toast({
        title: 'Rider Assigned',
        description: 'The rider has been notified about the pickup.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign rider',
        variant: 'destructive',
      });
    },
  });
};

// ==========================================
// RIDER HOOKS
// ==========================================

// Hook for rider to get their assignments
export const useRiderAssignments = () => {
  const { user } = useAuth();
  return useQuery<DeliveryAssignment[]>({
    queryKey: ['rider-assignments', user?.id],
    queryFn: () => user?.id ? deliveryService.getRiderAssignments(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
    refetchInterval: 15000, // Refresh every 15 seconds
  });
};

// Hook for accepting a delivery
export const useAcceptDelivery = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (assignmentId: string) => deliveryService.acceptDeliveryAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-assignments'] });
      toast({
        title: 'Delivery Accepted',
        description: 'Head to the pharmacy for pickup.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept delivery',
        variant: 'destructive',
      });
    },
  });
};

// Hook for marking picked up
export const useMarkPickedUp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (assignmentId: string) => deliveryService.markPickedUp(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-assignments'] });
      toast({
        title: 'Order Picked Up',
        description: 'Navigate to the customer for delivery.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as picked up',
        variant: 'destructive',
      });
    },
  });
};

// Hook for marking delivered and paid
export const useMarkDeliveredAndPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ assignmentId, cashAmount }: { assignmentId: string; cashAmount: number }) =>
      deliveryService.markDeliveredAndPaid(assignmentId, cashAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-assignments'] });
      toast({
        title: 'Delivery Complete!',
        description: 'Cash collected and order finalized.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete delivery',
        variant: 'destructive',
      });
    },
  });
};

// Hook for marking delivery failed
export const useMarkDeliveryFailed = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      deliveryService.markDeliveryFailed(assignmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-assignments'] });
      toast({
        title: 'Delivery Failed',
        description: 'The order has been marked as failed.',
        variant: 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark delivery as failed',
        variant: 'destructive',
      });
    },
  });
};

// Hook for creating a COD order (for individual users)
export const useCreateCODOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (orderData: {
      user_id: string;
      items: any[];
      total_amount: number;
      delivery_address: string;
      delivery_phone: string;
      delivery_notes?: string;
      pharmacy_id: string;
      delivery_fee?: number;
      delivery_coordinates?: {
        latitude: number;
        longitude: number;
      };
    }) => deliveryService.createCODOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Order Placed!',
        description: 'Your order has been sent to the pharmacy. Pay cash on delivery.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to place order',
        variant: 'destructive',
      });
    },
  });
};
