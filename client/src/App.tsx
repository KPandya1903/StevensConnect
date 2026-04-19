import { useAuthStore } from './store/authStore';
import { useConversations } from './hooks/useConversations';
import { AppRoutes } from './routes';

// Runs useConversations at the app level so the Navbar unread badge
// is always up-to-date without each page fetching its own copy.
function ChatInitializer() {
  useConversations();
  return null;
}

function ConditionalChatInit() {
  const user = useAuthStore((s) => s.user);
  if (!user?.isVerified) return null;
  return <ChatInitializer />;
}

export default function App() {
  return (
    <>
      <ConditionalChatInit />
      <AppRoutes />
    </>
  );
}
