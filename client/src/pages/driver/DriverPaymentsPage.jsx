import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function DriverPaymentsPage() {
  const queryClient = useQueryClient();
  const [upiId, setUpiId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const details = useQuery({
    queryKey: ['driver', 'payment-details'],
    queryFn: async () => {
      const data = await driverService.paymentDetails();
      setUpiId(data.upiId || '');
      setQrCode(data.qrCode || '');
      setPaymentInstructions(data.paymentInstructions || '');
      return data;
    },
  });

  const bookingsQuery = useQuery({
    queryKey: ['driver', 'bookings'],
    queryFn: () => driverService.listBookings(),
  });

  const saveDetails = useMutation({
    mutationFn: () => driverService.updatePaymentDetails({ upiId, qrCode, paymentInstructions }),
    onSuccess: () => setError(''),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const review = useMutation({
    mutationFn: ({ id, decision }) => driverService.reviewPayment(id, { decision, reason }),
    onSuccess: () => {
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'bookings'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const bookings = bookingsQuery.data?.bookings || [];

  return (
    <div>
      <PageHeader title="Payments" subtitle="Customers pay you directly. Approving a screenshot confirms the booking." />
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <form
        className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          saveDetails.mutate();
        }}
      >
        <Input label="UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
        <label className="block text-sm font-medium text-navy">
          QR code image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block w-full text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setError('QR image must be 2 MB or smaller');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setQrCode(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {qrCode ? <img src={qrCode} alt="Your UPI QR code" className="h-36 w-36 rounded-lg border border-line object-contain" /> : null}
        <Input label="Instructions" value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} />
        <Button type="submit" loading={saveDetails.isPending || details.isLoading}>Save payment details</Button>
      </form>
      <Input label="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} hint="Required when you reject a screenshot." />
      <ul className="mt-4 space-y-3">
        {bookings.map((booking) => (
          <li key={booking._id} className="rounded-xl border border-line bg-white p-4 text-sm">
            <p className="font-semibold text-navy">{booking.bookingNumber}</p>
            <p className="text-slate">
              {booking.userId?.name} · {booking.proofStatus} · ₹{booking.proofAmount || booking.totalAmount} · {booking.bookingStatus}
            </p>
            {booking.proofStatus === 'SUBMITTED' ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" loading={review.isPending} onClick={() => review.mutate({ id: booking._id, decision: 'APPROVE' })}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" loading={review.isPending} onClick={() => review.mutate({ id: booking._id, decision: 'REJECT' })}>
                  Reject
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
