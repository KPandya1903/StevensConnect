import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { VerifiedRoute } from '../components/auth/VerifiedRoute';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { CompleteProfilePage } from '../pages/CompleteProfilePage';
import { HousingPage } from '../pages/HousingPage';
import { MarketplacePage } from '../pages/MarketplacePage';
import { ListingDetailPage } from '../pages/ListingDetailPage';
import { CreateListingPage } from '../pages/CreateListingPage';
import { EditListingPage } from '../pages/EditListingPage';
import { ConversationsPage } from '../pages/ConversationsPage';
import { ChatPage } from '../pages/ChatPage';
import { SavesPage } from '../pages/SavesPage';
import { MyProfilePage } from '../pages/MyProfilePage';
import { PublicProfilePage } from '../pages/PublicProfilePage';
import { RoommatesPage } from '../pages/RoommatesPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* ---- Public ---- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ---- Authenticated ---- */}
      <Route element={<ProtectedRoute />}>
        <Route path="/complete-profile" element={<CompleteProfilePage />} />

        {/* ---- Verified (Google users always are) ---- */}
        <Route element={<VerifiedRoute />}>
          <Route path="/feed" element={<Navigate to="/marketplace" replace />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/housing" element={<HousingPage />} />
          <Route path="/roommates" element={<RoommatesPage />} />
          <Route path="/listings/new" element={<CreateListingPage />} />
          <Route path="/listings/:id/edit" element={<EditListingPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/messages" element={<ConversationsPage />} />
          <Route path="/messages/:id" element={<ChatPage />} />
          <Route path="/profile/me" element={<MyProfilePage />} />
          <Route path="/profile/:username" element={<PublicProfilePage />} />
          <Route path="/saves" element={<SavesPage />} />
        </Route>
      </Route>

      {/* ---- Catch-all ---- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
