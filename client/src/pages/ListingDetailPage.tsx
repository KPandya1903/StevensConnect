import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { listingsApi } from '../api/listings';
import type { Listing } from '@stevensconnect/shared';
import { useAuth } from '../hooks/useAuth';
import { useNavigate as useNav } from 'react-router-dom';
import { conversationsApi } from '../api/conversations';
import {
  formatPrice, timeAgo, labelForCategory, labelForCondition,
  labelForHousingSubtype, formatDate,
} from '../utils/format';

// Swiper requires CSS imports
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'scam', label: 'Scam' },
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'other', label: 'Other' },
] as const;

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navTo = useNav();
  const { user } = useAuth();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    listingsApi.getById(id)
      .then((res) => setListing(res.data.data))
      .catch(() => setError('Listing not found or could not be loaded.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleToggleSave() {
    if (!listing) return;
    setIsSaving(true);
    const prev = listing.isSaved;
    // Optimistic
    setListing((l) => l ? { ...l, isSaved: !prev } : l);
    try {
      const res = await listingsApi.toggleSave(listing.id);
      setListing((l) => l ? { ...l, isSaved: res.data.data.saved } : l);
      toast.success(res.data.data.saved ? 'Listing saved' : 'Listing unsaved');
    } catch {
      setListing((l) => l ? { ...l, isSaved: prev } : l);
      toast.error('Could not save listing.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetStatus(status: 'sold' | 'closed') {
    if (!listing) return;
    try {
      await listingsApi.setStatus(listing.id, status);
      setListing((l) => l ? { ...l, status } : l);
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error('Could not update status.');
    }
  }

  async function handleMessageSeller() {
    if (!listing) return;
    setIsStartingChat(true);
    try {
      const res = await conversationsApi.start(listing.userId, listing.id);
      navTo(`/messages/${res.data.data.conversationId}`);
    } catch {
      toast.error('Could not start conversation.');
    } finally {
      setIsStartingChat(false);
    }
  }

  async function handleReport() {
    if (!listing) return;
    setIsReporting(true);
    try {
      await listingsApi.report(listing.id, reportReason, reportDetails || undefined);
      setReportOpen(false);
      toast.success('Report submitted. Thank you.');
    } catch {
      toast.error('Failed to submit report.');
    } finally {
      setIsReporting(false);
    }
  }

  // ---- Render states ----

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center pt-24">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
          <p className="text-lg font-medium text-gray-700">{error ?? 'Listing not found.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.userId;
  const isActive = listing.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left: images + description */}
          <div className="space-y-6">
            {/* Image carousel */}
            {listing.imageUrls.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                <Swiper
                  modules={[Navigation, Pagination]}
                  navigation
                  pagination={{ clickable: true }}
                  className="aspect-[4/3]"
                >
                  {listing.imageUrls.map((url, i) => (
                    <SwiperSlide key={url}>
                      <img
                        src={url}
                        alt={`${listing.title} image ${i + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-300">
                <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18" />
                </svg>
              </div>
            )}

            {/* Description */}
            <div>
              <h2 className="mb-2 text-base font-semibold text-gray-900">Description</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Right: details panel */}
          <div className="space-y-5">
            {/* Status badge */}
            {listing.status !== 'active' && (
              <Badge variant={listing.status === 'sold' ? 'danger' : 'muted'} className="capitalize">
                {listing.status}
              </Badge>
            )}

            {/* Title + price */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
              <p className={`mt-1 text-2xl font-bold ${listing.isFree ? 'text-green-600' : 'text-gray-900'}`}>
                {formatPrice(listing.price, listing.isFree)}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {listing.listingType === 'marketplace' && listing.marketplaceCategory && (
                <Badge variant="default">{labelForCategory(listing.marketplaceCategory)}</Badge>
              )}
              {listing.listingType === 'housing' && listing.housingSubtype && (
                <Badge variant="info">{labelForHousingSubtype(listing.housingSubtype)}</Badge>
              )}
              {listing.condition && (
                <Badge variant="muted">{labelForCondition(listing.condition)}</Badge>
              )}
            </div>

            {/* Housing details */}
            {listing.listingType === 'housing' && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
                {(listing.bedrooms != null || listing.bathrooms != null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bedrooms / Bathrooms</span>
                    <span className="font-medium text-gray-800">
                      {listing.bedrooms === 0 ? 'Studio' : listing.bedrooms ?? '—'} / {listing.bathrooms ?? '—'}
                    </span>
                  </div>
                )}
                {listing.availableFrom && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available from</span>
                    <span className="font-medium text-gray-800">{formatDate(listing.availableFrom)}</span>
                  </div>
                )}
                {listing.availableUntil && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available until</span>
                    <span className="font-medium text-gray-800">{formatDate(listing.availableUntil)}</span>
                  </div>
                )}
                {listing.isFurnished != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Furnished</span>
                    <span className="font-medium text-gray-800">{listing.isFurnished ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {listing.petsAllowed != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pets allowed</span>
                    <span className="font-medium text-gray-800">{listing.petsAllowed ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {listing.utilitiesIncluded != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Utilities included</span>
                    <span className="font-medium text-gray-800">{listing.utilitiesIncluded ? 'Yes' : 'No'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Location + meta */}
            <div className="text-sm text-gray-500 space-y-1">
              {listing.locationText && (
                <p>
                  <span className="font-medium text-gray-700">Location:</span> {listing.locationText}
                </p>
              )}
              <p>Posted {timeAgo(listing.createdAt)}</p>
              <p>{listing.viewsCount.toLocaleString()} view{listing.viewsCount !== 1 ? 's' : ''}</p>
            </div>

            {/* Seller */}
            {listing.author && (
              <Link
                to={`/profile/${listing.author.username}`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors"
              >
                {listing.author.avatarUrl ? (
                  <img
                    src={listing.author.avatarUrl}
                    alt={listing.author.displayName}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {listing.author.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{listing.author.displayName}</p>
                  <p className="text-xs text-gray-500">@{listing.author.username}</p>
                </div>
              </Link>
            )}

            {/* Action buttons */}
            {isActive && !isOwner && (
              <button
                onClick={handleToggleSave}
                disabled={isSaving}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition
                  ${listing.isSaved
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <svg className={`h-4 w-4 ${listing.isSaved ? 'fill-red-500' : 'fill-none'}`}
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                {listing.isSaved ? 'Saved' : 'Save listing'}
              </button>
            )}

            {isActive && !isOwner && (
              <button
                onClick={handleMessageSeller}
                disabled={isStartingChat}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                {isStartingChat ? 'Opening…' : 'Message seller'}
              </button>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="space-y-2">
                <Link
                  to={`/listings/${listing.id}/edit`}
                  className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit listing
                </Link>
                {isActive && (
                  <button
                    onClick={() => handleSetStatus('sold')}
                    className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Mark as sold
                  </button>
                )}
                {isActive && (
                  <button
                    onClick={() => handleSetStatus('closed')}
                    className="flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Close listing
                  </button>
                )}
              </div>
            )}

            {/* Report */}
            {!isOwner && (
              <button
                onClick={() => setReportOpen(true)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Report this listing
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Report modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report listing">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Details (optional)</label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1 block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Provide any additional context…"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setReportOpen(false)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={isReporting}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isReporting ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
