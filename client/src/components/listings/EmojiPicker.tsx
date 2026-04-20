import { useState } from 'react';

const ROOMMATE_EMOJIS = [
  '🏠', '🏡', '🛋️', '🛏️', '🪴', '☕', '📚', '🎮',
  '🎵', '🐶', '🐱', '🌙', '⚽', '🏋️', '🍕', '😊',
  '🧘', '💻', '🎨', '🌿', '🔑', '🛁', '🪟', '✨',
];

interface EmojiPickerProps {
  selected: string | null;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ selected, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-100 text-7xl shadow-inner">
          {selected ?? '🏠'}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          {open ? 'Close' : 'Choose emoji'}
        </button>
      </div>

      {/* Grid */}
      {open && (
        <div className="grid grid-cols-8 gap-1 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {ROOMMATE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false); }}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition hover:bg-blue-50
                ${selected === emoji ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
