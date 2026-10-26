import { useEffect, useState, useMemo } from 'react';
import { Clock, Hourglass, CheckCheck, X, Maximize2 } from 'lucide-react';

function formatCountdown(ms) {
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function MessageBubble({ message, isOwn, onExpired }) {
  const [now, setNow] = useState(Date.now());
  const [showFullImage, setShowFullImage] = useState(false);

  const expiresAtMs = useMemo(() => {
    return message.expiresAt ? new Date(message.expiresAt).getTime() : null;
  }, [message.expiresAt]);

  const remainingMs = expiresAtMs ? expiresAtMs - now : null;

  useEffect(() => {
    if (!expiresAtMs) return;

    if (expiresAtMs <= Date.now()) {
      if (onExpired) onExpired(message._id);
      return;
    }

    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (expiresAtMs <= current) {
        clearInterval(interval);
        if (onExpired) onExpired(message._id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAtMs, message._id, onExpired]);

  const timeString = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // If already expired, return nothing
  if (expiresAtMs && remainingMs <= 0) {
    return null;
  }

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl p-2 sm:p-2.5 text-sm shadow-sm transition-all sm:max-w-md ${
          isOwn
            ? 'rounded-br-sm bg-indigo-600 text-white'
            : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
        }`}
      >
        {/* Photo view if message has an image */}
        {message.image && (
          <div className="relative group overflow-hidden rounded-xl mb-1.5 cursor-pointer" onClick={() => setShowFullImage(true)}>
            <img
              src={message.image}
              alt="Snapchat-style temporary snap"
              className="max-h-72 w-full object-cover rounded-xl transition group-hover:opacity-95"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
              <span className="flex items-center gap-1 text-xs bg-black/60 px-2.5 py-1 rounded-full">
                <Maximize2 className="h-3.5 w-3.5" /> View full
              </span>
            </div>
          </div>
        )}

        {/* Text content if present */}
        {message.text && (
          <p className="px-1.5 whitespace-pre-wrap break-words">{message.text}</p>
        )}

        <div
          className={`mt-1 flex items-center gap-1.5 px-1 text-[11px] ${
            isOwn ? 'text-indigo-200' : 'text-slate-400'
          }`}
        >
          <span>{timeString}</span>
          {isOwn && message.readAt && (
            <CheckCheck className="h-3.5 w-3.5 text-indigo-200" title="Read" />
          )}
        </div>
      </div>

      {/* Snapchat-style temporary message status indicator */}
      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
        {!message.readAt ? (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <Clock className="h-3 w-3" />
            <span>Disappears 24 hours after first read</span>
          </span>
        ) : (
          <span
            className={`flex items-center gap-1 font-medium ${
              remainingMs < 60000 ? 'text-red-600 animate-pulse' : 'text-slate-500'
            }`}
          >
            <Hourglass className="h-3 w-3" />
            <span>Expires in {formatCountdown(remainingMs)}</span>
          </span>
        )}
      </div>

      {/* Fullscreen Photo Modal */}
      {showFullImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition"
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={message.image}
            alt="Snap preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
