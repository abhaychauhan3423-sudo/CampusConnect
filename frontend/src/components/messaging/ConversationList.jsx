import { useState, useMemo } from 'react';
import { Search, MessageSquare, Clock } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  currentUserId,
}) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!filterQuery.trim()) return conversations;
    const q = filterQuery.toLowerCase();
    return conversations.filter((c) => {
      const other = c.participants?.find(
        (p) => (p._id || p).toString() !== currentUserId?.toString()
      );
      if (!other) return false;
      return (
        other.name?.toLowerCase().includes(q) ||
        other.college?.toLowerCase().includes(q) ||
        other.course?.toLowerCase().includes(q)
      );
    });
  }, [conversations, filterQuery, currentUserId]);

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">Messages</h2>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400 transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No conversations</p>
            <p className="mt-1 text-xs text-slate-400">
              {filterQuery ? 'No matches found.' : 'Connect with students to start chatting.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const other = conv.participants?.find(
              (p) => (p._id || p).toString() !== currentUserId?.toString()
            );
            if (!other) return null;

            const isActive = conv._id === activeConversationId;
            const hasUnread = conv.unreadCount > 0;
            const lastMsg = conv.lastMessage;

            // Formatted preview text
            let previewText = 'No messages yet';
            if (lastMsg) {
              const isSender = (lastMsg.senderId?._id || lastMsg.senderId)?.toString() === currentUserId?.toString();
              const prefix = isSender ? 'You: ' : '';
              if (lastMsg.text) {
                previewText = `${prefix}${lastMsg.text}`;
              } else if (lastMsg.image) {
                previewText = `${prefix}📷 Photo`;
              }
            }

            return (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv._id)}
                className={`w-full flex items-center gap-3 p-3 text-left transition ${
                  isActive
                    ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative">
                  <Avatar user={other} size={44} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`truncate text-sm font-semibold ${isActive ? 'text-indigo-900' : 'text-slate-900'}`}>
                      {other.name}
                    </p>
                    {conv.updatedAt && (
                      <span className="text-[11px] text-slate-400 whitespace-nowrap ml-2">
                        {new Date(conv.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <p className="truncate text-xs text-slate-500 mb-1">
                    {other.course} · {other.college}
                  </p>

                  <div className="flex items-center justify-between">
                    <p
                      className={`truncate text-xs ${
                        hasUnread ? 'font-semibold text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {previewText}
                    </p>

                    {hasUnread && (
                      <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
