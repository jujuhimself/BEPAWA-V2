 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { deliveryService, DeliveryAssignment } from '@/services/deliveryService';
 import { useToast } from '@/hooks/use-toast';
 import { useAuth } from '@/contexts/AuthContext';
 
 // Hook for wholesaler to get COD orders
 export const useWholesaleCODOrders = () => {
   const { user } = useAuth();
   return useQuery({
     queryKey: ['wholesale-cod-orders', user?.id],
     queryFn: () => user?.id ? deliveryService.getWholesaleCODOrders(user.id) : Promise.resolve([]),
     enabled: !!user?.id,
     refetchInterval: 30000, // Refresh every 30 seconds
   });
 };
 
 // Hook for accepting a wholesale order
 export const useAcceptWholesaleOrder = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: (orderId: string) => deliveryService.acceptWholesaleOrder(orderId),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['wholesale-cod-orders'] });
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
 
 // Hook for rejecting a wholesale order
 export const useRejectWholesaleOrder = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
       deliveryService.rejectWholesaleOrder(orderId, reason),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['wholesale-cod-orders'] });
       toast({
         title: 'Order Rejected',
         description: 'The retailer has been notified.',
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
 
 // Hook for marking wholesale order as ready
 export const useMarkWholesaleOrderReady = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: (orderId: string) => deliveryService.markWholesaleOrderReady(orderId),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['wholesale-cod-orders'] });
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
 
 // Hook for requesting a rider for wholesale order
 export const useRequestWholesaleRider = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
       deliveryService.requestWholesaleRider(orderId, riderId),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['wholesale-cod-orders'] });
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
 
 // Hook for creating a wholesale COD order (for retailers ordering from wholesalers)
 export const useCreateWholesaleCODOrder = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: (orderData: {
       retailer_id: string;
       wholesaler_id: string;
       items: any[];
       total_amount: number;
       delivery_address: string;
       delivery_phone: string;
       delivery_notes?: string;
       delivery_fee?: number;
       delivery_coordinates?: {
         latitude: number;
         longitude: number;
       };
     }) => deliveryService.createWholesaleCODOrder(orderData),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['orders'] });
       toast({
         title: 'Order Placed!',
         description: 'Your order has been sent to the wholesaler. Pay cash on delivery.',
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