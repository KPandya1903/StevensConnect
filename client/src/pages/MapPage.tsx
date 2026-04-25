import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navbar } from '../components/layout/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { ListingMapPin } from '../components/map/ListingMapPin';
import { listingsApi } from '../api/listings';
import type { Listing } from '@stevensconnect/shared';

// Custom map pin icon
function makeIcon(type: 'housing' | 'marketplace') {
  const color = type === 'housing' ? '#7c3aed' : '#059669';
  const emoji = type === 'housing' ? '🏠' : '🛍️';
  return L.divIcon({
    html: `<div style="
      background:${color};color:white;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      width:34px;height:34px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 10px rgba(0,0,0,.25);border:2.5px solid white;
    "><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -38],
    className: '',
  });
}

type FilterType = 'all' | 'housing' | 'marketplace';

export function MapPage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    listingsApi.getAll({ limit: 200 })
      .then(res => setAllListings(
        (res.data.data.listings ?? []).filter((l: Listing) => l.lat != null && l.lng != null)
      ))
      .finally(() => setIsLoading(false));
  }, []);

  const visible = allListings.filter(l => {
    if (filter === 'housing') return l.listingType === 'housing';
    if (filter === 'marketplace') return l.listingType === 'marketplace';
    return true;
  });

  // Stevens Institute of Technology default center
  const center: [number, number] = [40.7451, -74.0248];

  const chips: { label: string; value: FilterType }[] = [
    { label: 'All listings', value: 'all' },
    { label: 'Housing', value: 'housing' },
    { label: 'Marketplace', value: 'marketplace' },
  ];

  return (
    <div className="flex h-dvh flex-col">
      <Navbar />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="relative flex-1">
          {/* Filter chips */}
          <div className="absolute left-0 right-0 top-3 z-[999] flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex gap-2 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm">
              {chips.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => setFilter(chip.value)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    filter === chip.value
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pin count badge */}
          <div className="absolute bottom-5 left-4 z-[999] pointer-events-none">
            <div className="flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm text-sm font-medium text-gray-700">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              {visible.length} listing{visible.length !== 1 ? 's' : ''} on map
            </div>
          </div>

          <MapContainer
            center={center}
            zoom={14}
            className="h-full w-full"
            scrollWheelZoom
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
            />
            {visible.map(listing => (
              <Marker
                key={listing.id}
                position={[listing.lat!, listing.lng!]}
                icon={makeIcon(listing.listingType)}
              >
                <Popup minWidth={208} maxWidth={208} className="listing-popup">
                  <ListingMapPin listing={listing} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
