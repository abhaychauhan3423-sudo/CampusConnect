import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';
import { fetchConversations, createOrGetConversation } from '../services/messageApi';
import { getSocket } from '../services/socket';

export default function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdParam = params.get('userId');

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
      return data;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle ?userId=xxx to start or jump to a conversation
  useEffect(() => {
    if (!userIdParam) return;

    let cancelled = false;
    createOrGetConversation(userIdParam)
      .then((conv) => {
        if (!cancelled && conv) {
          setActiveConversationId(conv._id);
          // Refresh list to include this conversation if new
          loadConversations();
          // Remove the query param from URL cleanly
          setParams({}, { replace: true });
        }
      })
      .catch((err) => {
        console.error('Could not start conversation with user:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [userIdParam, loadConversations, setParams]);

  // Setup socket listener for conversations update
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConversationUpdated = () => {
      loadConversations();
    };

    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('messages_marked_read', handleConversationUpdated);

    return () => {
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('messages_marked_read', handleConversationUpdated);
    };
  }, [loadConversations]);

  const activeConversation = conversations.find((c) => c._id === activeConversationId);

  return (
    <div className="h-[calc(100vh-8rem)] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex">
      {/* Sidebar: Conversation List */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
          activeConversationId ? 'hidden md:block' : 'block'
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => setActiveConversationId(id)}
          loading={loading}
          currentUserId={user?._id}
        />
      </div>

      {/* Main: Chat Window or Placeholder */}
      <div
        className={`flex-1 h-full ${
          activeConversationId ? 'block' : 'hidden md:flex'
        }`}
      >
        {activeConversation ? (
          <ChatWindow
            key={activeConversation._id}
            conversation={activeConversation}
            currentUserId={user?._id}
            onBack={() => setActiveConversationId(null)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50/50">
            <div className="rounded-full bg-indigo-50 p-4 text-indigo-600 mb-3">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Your Conversations</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Select a conversation from the left, or visit the{' '}
              <button
                onClick={() => navigate('/students')}
                className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-1"
              >
                <Users className="h-3.5 w-3.5" /> Students directory
              </button>{' '}
              to start a new temporary chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
