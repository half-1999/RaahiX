import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { bookingService } from '../../services/bookingService';
import {
  buildMockVerifyPayload,
  isMockPaymentOrder,
  loadRazorpayScript,
  paymentService,
} from '../../services/paymentService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CheckoutSummary from '../../components/booking/CheckoutSummary';
import RideSummary from '../../components/rides/RideSummary';
import HoldTimer from '../../components/seats/HoldTimer';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/common/PageHeader';
import { entityId } from '../../utils/format';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingId = location.state?.bookingId || location.state?.booking?.id || location.state?.booking?._id;
  const [error, setError] = useState('');

  const bookingQuery = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingService.getById(bookingId),
    enabled: Boolean(bookingId),
  });

  const booking = bookingQuery.data?.booking || bookingQuery.data || location.state?.booking;
  const ride = booking?.ride;

  const payMutation = useMutation({
    mutationFn: async () => {
      const order = await paymentService.createOrder(bookingId || entityId(booking));

      if (isMockPaymentOrder(order)) {
        // Server accepts mock:true only when PAYMENT_GATEWAY=mock (signs HMAC server-side)
        return paymentService.verify(
          buildMockVerifyPayload(order, bookingId || entityId(booking))
        );
      }

      await loadRazorpayScript();
      const key = order.keyId || import.meta.env.VITE_PAYMENT_KEY_ID;
      const amountPaise =
        order.amountPaise ??
        (Number(order.amount) > 1000 ? Number(order.amount) : Math.round(Number(order.amount) * 100));

      return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key,
          amount: amountPaise,
          currency: order.currency || 'INR',
          name: 'RouteSeat',
          description: `Booking ${booking?.bookingNumber || ''}`.trim(),
          order_id: order.gatewayOrderId,
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone,
          },
          handler: async (response) => {
            try {
              const verified = await paymentService.verify({
                bookingId: bookingId || entityId(booking),
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve(verified);
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        });
        rzp.on('payment.failed', (resp) => {
          reject(new Error(resp?.error?.description || 'Payment failed'));
        });
        rzp.open();
      });
    },
    onSuccess: (data) => {
      const confirmed = data.booking || data;
      navigate('/booking-success', {
        replace: true,
        state: { booking: confirmed, bookingId: entityId(confirmed) },
      });
    },
    onError: (err) => {
      setError(
        getErrorMessage(
          err,
          'Payment could not be verified. Contact support if amount was deducted.'
        )
      );
    },
  });

  if (!bookingId && !booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert tone="warning" title="No booking to checkout">
          Start from a ride and hold seats first.{' '}
          <Link to="/search" className="underline">
            Search rides
          </Link>
        </Alert>
      </div>
    );
  }

  if (bookingQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Checkout" subtitle="Confirm fare and pay securely" />
      {booking?.holdExpiresAt ? <HoldTimer expiresAt={booking.holdExpiresAt} className="mb-4" /> : null}
      {error ? (
        <Alert tone="error" title="Payment issue" className="mb-4">
          {error}
        </Alert>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {ride ? <RideSummary ride={ride} compact /> : null}
        <CheckoutSummary booking={booking} ride={ride} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button loading={payMutation.isPending} onClick={() => payMutation.mutate()}>
          Pay now
        </Button>
        <Link to={`/booking/${entityId(booking)}`} className="text-sm text-ink-muted underline self-center">
          View booking draft
        </Link>
      </div>
    </div>
  );
}
