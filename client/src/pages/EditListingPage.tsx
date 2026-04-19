import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { ListingForm, type ListingFormData } from '../components/listings/ListingForm';
import { ImageUploader } from '../components/listings/ImageUploader';
import { Spinner } from '../components/ui/Spinner';
import { listingsApi } from '../api/listings';
import type { Listing } from '@stevensconnect/shared';
import { useAuth } from '../hooks/useAuth';

export function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    listingsApi.getById(id)
      .then((res) => {
        const l = res.data.data;
        // Redirect non-owners away
        if (l.userId !== user?.id) {
          navigate(`/listings/${id}`, { replace: true });
          return;
        }
        setListing(l);
      })
      .catch(() => setError('Could not load listing.'))
      .finally(() => setIsLoading(false));
  }, [id, user, navigate]);

  async function handleUpdate(data: ListingFormData) {
    if (!listing) return;
    setIsSaving(true);
    try {
      const res = await listingsApi.update(listing.id, data);
      setListing(res.data.data);
      toast.success('Listing updated');
    } catch {
      toast.error('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddImages(files: File[]) {
    if (!listing) return;
    setIsUploading(true);
    try {
      const res = await listingsApi.uploadImages(listing.id, files);
      setListing((l) => l ? { ...l, imageUrls: res.data.data.imageUrls } : l);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveImage(url: string) {
    if (!listing) return;
    const res = await listingsApi.removeImage(listing.id, url);
    setListing((l) => l ? { ...l, imageUrls: res.data.data.imageUrls } : l);
  }

  // ---- Render states ----

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center pt-24"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
          <p className="text-gray-700">{error ?? 'Listing not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit listing</h1>
          <button
            onClick={() => navigate(`/listings/${listing.id}`)}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            View listing
          </button>
        </div>

        <div className="space-y-6">
          {/* Form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <ListingForm
              initialData={listing}
              onSubmit={handleUpdate}
              isSubmitting={isSaving}
              submitLabel="Save changes"
            />
          </div>

          {/* Images */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Photos</h2>
            <ImageUploader
              existingUrls={listing.imageUrls}
              onAdd={handleAddImages}
              onRemoveExisting={handleRemoveImage}
              isUploading={isUploading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
