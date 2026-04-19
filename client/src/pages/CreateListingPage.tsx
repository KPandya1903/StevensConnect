import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { ListingForm, type ListingFormData } from '../components/listings/ListingForm';
import { ImageUploader } from '../components/listings/ImageUploader';
import { listingsApi } from '../api/listings';

export function CreateListingPage() {
  const navigate = useNavigate();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function handleCreate(data: ListingFormData) {
    try {
      const res = await listingsApi.create(data);
      const listing = res.data.data;
      setCreatedId(listing.id);
      toast.success('Listing created!');
      if (imageUrls.length === 0) {
        navigate(`/listings/${listing.id}`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; fields?: Record<string, string> } } } };
      const fields = axiosErr?.response?.data?.error?.fields;
      if (fields) {
        toast.error('Fix the errors below: ' + Object.values(fields).join(', '));
      } else {
        toast.error(axiosErr?.response?.data?.error?.message ?? 'Failed to create listing');
      }
    }
  }

  async function handleAddImages(files: File[]) {
    if (!createdId) return;
    setIsUploading(true);
    try {
      const res = await listingsApi.uploadImages(createdId, files);
      setImageUrls(res.data.data.imageUrls);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveImage(url: string) {
    if (!createdId) return;
    const res = await listingsApi.removeImage(createdId, url);
    setImageUrls(res.data.data.imageUrls);
  }

  function handleDone() {
    if (createdId) navigate(`/listings/${createdId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Create listing</h1>

        {/* Step 1: Form */}
        {!createdId ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <ListingForm onSubmit={handleCreate} submitLabel="Create listing" />
          </div>
        ) : (
          /* Step 2: Images */
          <div className="space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Listing created! Add photos to help it stand out.
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Add photos</h2>
              <ImageUploader
                existingUrls={imageUrls}
                onAdd={handleAddImages}
                onRemoveExisting={handleRemoveImage}
                isUploading={isUploading}
              />
            </div>

            <button
              onClick={handleDone}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {imageUrls.length > 0 ? 'View listing' : 'Skip — view listing'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
