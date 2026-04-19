import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { ListingForm, type ListingFormData } from '../components/listings/ListingForm';
import { ImageUploader } from '../components/listings/ImageUploader';
import { VideoUploader } from '../components/listings/VideoUploader';
import { listingsApi } from '../api/listings';
import type { ListingType } from '@stevensconnect/shared';

export function CreateListingPage() {
  const navigate = useNavigate();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdType, setCreatedType] = useState<ListingType | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  async function handleCreate(data: ListingFormData) {
    try {
      const res = await listingsApi.create(data);
      const listing = res.data.data;
      setCreatedId(listing.id);
      setCreatedType(listing.listingType);
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

  async function handleAddVideo(file: File) {
    if (!createdId) return;
    setIsUploadingVideo(true);
    try {
      const res = await listingsApi.uploadVideo(createdId, file);
      setVideoUrl(res.data.data.videoUrl);
      toast.success('Video uploaded!');
    } catch {
      toast.error('Failed to upload video.');
    } finally {
      setIsUploadingVideo(false);
    }
  }

  async function handleRemoveVideo() {
    if (!createdId) return;
    try {
      await listingsApi.removeVideo(createdId);
      setVideoUrl(null);
    } catch {
      toast.error('Failed to remove video.');
    }
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

            {createdType === 'housing' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Walkthrough video (optional)</h2>
                <VideoUploader
                  existingUrl={videoUrl}
                  onAdd={handleAddVideo}
                  onRemove={handleRemoveVideo}
                  isUploading={isUploadingVideo}
                />
              </div>
            )}

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
