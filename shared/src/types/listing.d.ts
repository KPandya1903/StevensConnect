export type ListingType = 'housing' | 'marketplace';
export type ListingStatus = 'active' | 'sold' | 'closed';
export type HousingSubtype = 'apartment' | 'roommate' | 'sublet';
export type MarketplaceCategory = 'textbooks' | 'electronics' | 'furniture' | 'clothing' | 'bikes' | 'kitchen' | 'sports' | 'other';
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
    housingSubtype: HousingSubtype | null;
    address: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    availableFrom: string | null;
    availableUntil: string | null;
    isFurnished: boolean | null;
    petsAllowed: boolean | null;
    utilitiesIncluded: boolean | null;
    marketplaceCategory: MarketplaceCategory | null;
    condition: ItemCondition | null;
    imageUrls: string[];
    locationText: string | null;
    viewsCount: number;
    createdAt: string;
    updatedAt: string;
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
    housingSubtype?: HousingSubtype | null;
    address?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    availableFrom?: string | null;
    availableUntil?: string | null;
    isFurnished?: boolean | null;
    petsAllowed?: boolean | null;
    utilitiesIncluded?: boolean | null;
    marketplaceCategory?: MarketplaceCategory | null;
    condition?: ItemCondition | null;
    locationText?: string;
}
