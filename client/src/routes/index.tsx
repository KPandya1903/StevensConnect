/**
 * Route configuration
 *
 * Structure:
 *   Public routes     → accessible without login
 *   ProtectedRoute    → requires authenticated session
 *     VerifiedRoute   → additionally requires verified email
 *       App routes    → housing, marketplace, chat, profiles
 *
 * All lazy-loaded pages are wrapped in React.Suspense in App.tsx.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { VerifiedRoute } from '../components/auth/VerifiedRoute';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { FeedPage } from '../pages/FeedPage';
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
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* ---- Authenticated (any verified state) ---- */}
      <Route element={<ProtectedRoute />}>
        {/* ---- Verified email required ---- */}
        <Route element={<VerifiedRoute />}>
          <Route path="/feed"        element={<FeedPage />} />
          <Route path="/housing"     element={<HousingPage />} />
          <Route path="/roommates"   element={<RoommatesPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          {/* Order matters: /listings/new must come before /listings/:id */}
          <Route path="/listings/new"           element={<CreateListingPage />} />
          <Route path="/listings/:id/edit"      element={<EditListingPage />} />
          <Route path="/listings/:id"           element={<ListingDetailPage />} />
          <Route path="/messages"          element={<ConversationsPage />} />
          <Route path="/messages/:id"      element={<ChatPage />} />
          <Route path="/profile/me"        element={<MyProfilePage />} />
          <Route path="/profile/:username" element={<PublicProfilePage />} />
          <Route path="/saves"             element={<SavesPage />} />
        </Route>
      </Route>

      {/* ---- Catch-all ---- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
