import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

export default function RideReviews({ vehicleId }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const reviewsQuery = useQuery({
    queryKey: ['reviews', vehicleId],
    queryFn: () => reviewService.list(vehicleId),
    enabled: Boolean(vehicleId),
  });

  const eligibilityQuery = useQuery({
    queryKey: ['reviews', vehicleId, 'eligibility'],
    queryFn: () => reviewService.eligibility(vehicleId),
    enabled: Boolean(vehicleId && isAuthenticated),
  });

  const save = useMutation({
    mutationFn: () => reviewService.create(vehicleId, { rating: Number(rating), comment }),
    onSuccess: () => {
      setComment('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['reviews', vehicleId] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const data = reviewsQuery.data;
  const reviews = data?.reviews || [];

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-navy">Ratings and reviews</h2>
        <p className="inline-flex items-center gap-1 text-sm font-bold text-navy">
          <Star className="h-4 w-4 fill-coral text-coral" />
          {data?.count ? Number(data.average).toFixed(1) : 'New'}
          <span className="font-medium text-slate">({data?.count || 0})</span>
        </p>
      </div>

      {reviewsQuery.isLoading ? <p className="mt-3 text-sm text-slate">Loading reviews…</p> : null}
      {!reviews.length && !reviewsQuery.isLoading ? (
        <p className="mt-3 text-sm text-slate">No reviews yet for this car.</p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-xl bg-mist/70 px-3 py-2">
            <p className="text-sm font-bold text-navy">
              {review.author} · {review.rating}/5
            </p>
            <p className="text-sm text-slate">{review.comment}</p>
          </li>
        ))}
      </ul>

      {isAuthenticated && eligibilityQuery.data?.allowed ? (
        <form
          className="mt-4 space-y-2 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <p className="text-sm font-semibold text-navy">You rode in this car. Leave a review.</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <label className="block text-sm">
            Rating
            <select
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
            >
              {[5, 4, 3, 2, 1].map((score) => (
                <option key={score} value={score}>
                  {score} star{score === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="w-full rounded-xl border border-line p-3 text-sm"
            rows={3}
            value={comment}
            placeholder="How was the car?"
            onChange={(event) => setComment(event.target.value)}
          />
          <Button type="submit" size="sm" loading={save.isPending}>
            Post review
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-slate">
          {isAuthenticated
            ? 'Reviews can be posted only after you have ridden in this car.'
            : 'Sign in after a completed ride to post a review. Guests can read reviews only.'}
        </p>
      )}
    </section>
  );
}
