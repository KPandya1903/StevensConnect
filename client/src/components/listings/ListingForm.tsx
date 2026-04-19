import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Listing } from '@stevensconnect/shared';

// ---- Validation schema (mirrors server createListingSchema) ----

const listingFormSchema = z
  .object({
    listingType: z.enum(['housing', 'marketplace']),
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
    price: z.coerce.number().min(0, 'Price must be ≥ 0').optional().nullable(),
    isFree: z.boolean().optional(),
    locationText: z.string().max(200).optional(),

    // Housing
    housingSubtype: z.enum(['apartment', 'roommate', 'sublet']).optional(),
    bedrooms: z.coerce.number().int().min(0).max(20).optional().nullable(),
    bathrooms: z.coerce.number().min(0).max(20).optional().nullable(),
    availableFrom: z.string().optional(),
    availableUntil: z.string().optional(),
    isFurnished: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
    utilitiesIncluded: z.boolean().optional(),

    // Marketplace
    marketplaceCategory: z
      .enum(['textbooks', 'electronics', 'furniture', 'clothing', 'bikes', 'kitchen', 'sports', 'other'])
      .optional(),
    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.listingType === 'marketplace' && !data.marketplaceCategory) {
      ctx.addIssue({ code: 'custom', path: ['marketplaceCategory'], message: 'Category is required' });
    }
    if (data.listingType === 'housing' && !data.housingSubtype) {
      ctx.addIssue({ code: 'custom', path: ['housingSubtype'], message: 'Subtype is required' });
    }
    if (!data.isFree && (data.price == null || data.price === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Enter a price or mark as free' });
    }
  });

export type ListingFormData = z.infer<typeof listingFormSchema>;

interface ListingFormProps {
  /** When provided, form is in edit mode and fields are pre-filled */
  initialData?: Listing;
  onSubmit: (data: ListingFormData) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

// ---- Small field helpers ----

function Field({ label, error, children, required }: {
  label: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputCls =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50';

const selectCls =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" {...props} />
      {label}
    </label>
  );
}

// ---- Main component ----

export function ListingForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Create Listing',
}: ListingFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: initialData
      ? {
          listingType: initialData.listingType,
          title: initialData.title,
          description: initialData.description,
          price: initialData.price ?? undefined,
          isFree: initialData.isFree,
          locationText: initialData.locationText ?? '',
          housingSubtype: initialData.housingSubtype ?? undefined,
          bedrooms: initialData.bedrooms ?? undefined,
          bathrooms: initialData.bathrooms ?? undefined,
          availableFrom: initialData.availableFrom ?? '',
          availableUntil: initialData.availableUntil ?? '',
          isFurnished: initialData.isFurnished ?? false,
          petsAllowed: initialData.petsAllowed ?? false,
          utilitiesIncluded: initialData.utilitiesIncluded ?? false,
          marketplaceCategory: initialData.marketplaceCategory ?? undefined,
          condition: initialData.condition ?? undefined,
        }
      : {
          listingType: 'marketplace',
          isFree: false,
        },
  });

  const listingType = watch('listingType');
  const isFree = watch('isFree');

  // When type changes, clear type-specific fields to avoid stale data
  useEffect(() => {
    if (listingType === 'marketplace') {
      setValue('housingSubtype', undefined);
      setValue('bedrooms', undefined);
      setValue('bathrooms', undefined);
    } else {
      setValue('marketplaceCategory', undefined);
      setValue('condition', undefined);
    }
  }, [listingType, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Type selector — disabled in edit mode */}
      <Field label="Listing type" error={errors.listingType?.message} required>
        <div className="flex gap-3">
          {(['marketplace', 'housing'] as const).map((type) => (
            <label key={type} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition
              data-[selected=true]:border-blue-500 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700
              border-gray-300 text-gray-700 hover:border-gray-400"
              data-selected={listingType === type}
            >
              <input
                {...register('listingType')}
                type="radio"
                value={type}
                disabled={!!initialData}
                className="sr-only"
              />
              {type === 'marketplace' ? 'Marketplace' : 'Housing'}
            </label>
          ))}
        </div>
      </Field>

      {/* Title */}
      <Field label="Title" error={errors.title?.message} required>
        <input {...register('title')} className={inputCls} placeholder="e.g. Intro to CS Textbook — like new" />
      </Field>

      {/* Description */}
      <Field label="Description" error={errors.description?.message} required>
        <textarea
          {...register('description')}
          rows={4}
          className={inputCls + ' resize-y'}
          placeholder="Describe your listing in detail. More info = faster sale."
        />
      </Field>

      {/* ---- Marketplace-specific fields ---- */}
      {listingType === 'marketplace' && (
        <>
          <Field label="Category" error={errors.marketplaceCategory?.message} required>
            <select {...register('marketplaceCategory')} className={selectCls}>
              <option value="">Select a category…</option>
              <option value="textbooks">Textbooks</option>
              <option value="electronics">Electronics</option>
              <option value="furniture">Furniture</option>
              <option value="clothing">Clothing</option>
              <option value="bikes">Bikes</option>
              <option value="kitchen">Kitchen</option>
              <option value="sports">Sports</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Condition" error={errors.condition?.message}>
            <select {...register('condition')} className={selectCls}>
              <option value="">Select condition…</option>
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </Field>
        </>
      )}

      {/* ---- Housing-specific fields ---- */}
      {listingType === 'housing' && (
        <>
          <Field label="Housing type" error={errors.housingSubtype?.message} required>
            <select {...register('housingSubtype')} className={selectCls}>
              <option value="">Select type…</option>
              <option value="apartment">Apartment</option>
              <option value="roommate">Looking for roommate</option>
              <option value="sublet">Sublet</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Bedrooms" error={errors.bedrooms?.message}>
              <input {...register('bedrooms')} type="number" min={0} max={20} className={inputCls} placeholder="0 = Studio" />
            </Field>
            <Field label="Bathrooms" error={errors.bathrooms?.message}>
              <input {...register('bathrooms')} type="number" min={0} max={20} step={0.5} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Available from" error={errors.availableFrom?.message}>
              <input {...register('availableFrom')} type="date" className={inputCls} />
            </Field>
            <Field label="Available until" error={errors.availableUntil?.message}>
              <input {...register('availableUntil')} type="date" className={inputCls} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4">
            <Controller
              name="isFurnished"
              control={control}
              render={({ field }) => (
                <Checkbox label="Furnished" checked={!!field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              name="petsAllowed"
              control={control}
              render={({ field }) => (
                <Checkbox label="Pets allowed" checked={!!field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              name="utilitiesIncluded"
              control={control}
              render={({ field }) => (
                <Checkbox label="Utilities included" checked={!!field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </>
      )}

      {/* ---- Price ---- */}
      <div className="space-y-2">
        <Controller
          name="isFree"
          control={control}
          render={({ field }) => (
            <Checkbox label="This item is free" checked={!!field.value} onChange={field.onChange} />
          )}
        />
        {!isFree && (
          <Field label="Price ($)" error={errors.price?.message} required>
            <input
              {...register('price')}
              type="number"
              min={0}
              step={0.01}
              className={inputCls}
              placeholder="0.00"
            />
          </Field>
        )}
      </div>

      {/* Location */}
      <Field label="Location" error={errors.locationText?.message}>
        <input
          {...register('locationText')}
          className={inputCls}
          placeholder="e.g. Hoboken, NJ"
        />
      </Field>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
