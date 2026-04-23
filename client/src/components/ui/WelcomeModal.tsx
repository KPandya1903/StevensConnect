import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const features = [
  {
    title: 'Listings',
    description: 'Post your apartment, sublet, or spare room for others to find.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Roommates',
    description: 'Browse people looking for a place or a roommate to share with.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    color: 'bg-green-50 text-green-600',
  },
  {
    title: 'Marketplace',
    description: 'Buy and sell textbooks, furniture, and anything else from the community.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
    color: 'bg-purple-50 text-purple-600',
  },
];

export function WelcomeModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="max-w-md">
      <div className="pb-2 text-center">
        <h2 className="text-xl font-bold text-gray-900">Welcome to House-Mate</h2>
        <p className="mt-1 text-sm text-gray-500">Here's what you can do on the platform:</p>
      </div>

      <div className="mt-5 space-y-3">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${f.color}`}>
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{f.title}</p>
              <p className="mt-0.5 text-sm text-gray-500">{f.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Got it →
      </button>
    </Modal>
  );
}
