import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { ListingForm, type ListingFormData } from '../components/listings/ListingForm';
import { ImageUploader } from '../components/listings/ImageUploader';
import { EmojiPicker } from '../components/listings/EmojiPicker';
import { listingsApi } from '../api/listings';
import { emojiToFile } from '../utils/emojiToImage';

export function CreateListingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const defaultListingType: 'marketplace' | 'housing' | undefined =
    typeParam === 'marketplace' ? 'marketplace' : typeParam === 'housing' || typeParam === 'roommate' ? 'housing' : undefined;
  const defaultHousingSubtype: 'roommate' | 'apartment' | 'sublet' | undefined =
    typeParam === 'roommate' ? 'roommate' : undefined;
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdSubtype, setCreatedSubtype] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🏠');
  const [isUploading, setIsUploading] = useState(false);

  const isRoommate = createdSubtype === 'roommate';

  async function handleCreate(data: ListingFormData) {
    try {
      const res = await listingsApi.create(data);
      setCreatedId(res.data.data.id);
      setCreatedSubtype(data.housingSubtype ?? null);
      toast.success('Listing created!');
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

  async function handleEmojiDone() {
    if (!createdId) return;
    if (imageUrls.length === 0) {
      setIsUploading(true);
      try {
        const file = await emojiToFile(selectedEmoji);
        const res = await listingsApi.uploadImages(createdId, [file]);
        setImageUrls(res.data.data.imageUrls);
      } catch {
        toast.error('Failed to save emoji. You can still view your listing.');
      } finally {
        setIsUploading(false);
      }
    }
    navigate(`/listings/${createdId}`);
  }

  function handleDone() {
    if (createdId) navigate(`/listings/${createdId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Create listing</h1>

        {!createdId ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <ListingForm
              onSubmit={handleCreate}
              submitLabel="Create listing"
              defaultListingType={defaultListingType}
              defaultHousingSubtype={defaultHousingSubtype}
            />
          </div>
        ) : isRoommate ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Listing created! Pick an emoji that represents you.
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Choose your emoji</h2>
              <EmojiPicker selected={selectedEmoji} onChange={setSelectedEmoji} />
            </div>

            <button
              onClick={handleEmojiDone}
              disabled={isUploading}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isUploading ? 'Saving…' : 'View listing'}
            </button>
          </div>
        ) : (
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
