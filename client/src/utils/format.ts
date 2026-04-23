export function formatPrice(price: number | null, isFree: boolean): string {
  if (isFree || price === 0) return 'Free';
  if (price == null) return 'Contact for price';
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function timeAgo(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function labelForCategory(cat: string): string {
  const map: Record<string, string> = {
    textbooks: 'Textbooks',
    electronics: 'Electronics',
    furniture: 'Furniture',
    clothing: 'Clothing',
    bikes: 'Bikes',
    kitchen: 'Kitchen',
    sports: 'Sports',
    other: 'Other',
  };
  return map[cat] ?? cat;
}

export function labelForCondition(cond: string): string {
  const map: Record<string, string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };
  return map[cond] ?? cond;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export function getMessageStatus(msg: { id: string; deliveredAt: string | null; readAt: string | null }): MessageStatus {
  if (msg.readAt) return 'read';
  if (msg.deliveredAt) return 'delivered';
  if (msg.id) return 'sent';
  return 'sending';
}

export function labelForHousingSubtype(sub: string): string {
  const map: Record<string, string> = {
    apartment: 'Apartment',
    roommate: 'Roommate',
    sublet: 'Sublet',
  };
  return map[sub] ?? sub;
}
