export type ListingType = 'housing' | 'marketplace';
export type ListingStatus = 'active' | 'sold' | 'closed';
export type HousingSubtype = 'apartment' | 'roommate' | 'sublet';
export type MarketplaceCategory =
  | 'textbooks'
  | 'electronics'
  | 'furniture'
  | 'clothing'
  | 'bikes'
  | 'kitchen'
  | 'sports'
  | 'other';
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export interface Listing {
  id: string;
  userId: string;
  listingType: ListingType;
  title: string;
  description: string;
  price: number | null;
  isFree: boolean;
  status: ListingStatus;
  // Housing fields
  housingSubtype: HousingSubtype | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  availableFrom: string | null; // ISO date
  availableUntil: string | null;
  isFurnished: boolean | null;
  petsAllowed: boolean | null;
  utilitiesIncluded: boolean | null;
  // Marketplace fields
  marketplaceCategory: MarketplaceCategory | null;
  condition: ItemCondition | null;
  // Shared
  imageUrls: string[];
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  // Populated on detail view
  author?: import('./user').PublicUser;
  isSaved?: boolean;
}

export interface ListingsPage {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateListingInput {
  listingType: ListingType;
  title: string;
  description: string;
  price?: number | null;
  isFree?: boolean;
  // Housing
  housingSubtype?: HousingSubtype | null;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  isFurnished?: boolean | null;
  petsAllowed?: boolean | null;
  utilitiesIncluded?: boolean | null;
  // Marketplace
  marketplaceCategory?: MarketplaceCategory | null;
  condition?: ItemCondition | null;
  // Shared
  locationText?: string;
}
