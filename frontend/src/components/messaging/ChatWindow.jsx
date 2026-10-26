import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft, Sparkles, Camera, Image as ImageIcon, X, RotateCcw, Check } from 'lucide-react';
import Avatar from '../common/Avatar';
import MessageBubble from './MessageBubble';
import { fetchMessages, markMessagesAsRead } from '../../services/messageApi';
import { getSocket } from '../../services/socket';

export default function ChatWindow({ conversation, currentUserId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Camera & Image capture states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const conversationId = conversation?._id;
  const otherParticipant = conversation?.participants?.find(
    (p) => (p._id || p).toString() !== currentUserId?.toString()
  );

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Mark unread messages as read when recipient opens or is viewing the chat
  const triggerMarkRead = useCallback(() => {
    if (!conversationId) return;
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('mark_read', { conversationId }, (res) => {
        if (res && res.success && res.messageIds && res.messageIds.length > 0) {
          setMessages((prev) =>
            prev.map((msg) =>
              res.messageIds.includes(msg._id)
                ? { ...msg, readAt: res.readAt, expiresAt: res.expiresAt }
                : msg
            )
          );
        }
      });
    } else {
      // Fallback to REST API
      markMessagesAsRead(conversationId).catch(() => {});
    }
  }, [conversationId]);

  // Load message history
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMessages(conversationId)
      .then((data) => {
        if (!cancelled) {
          setMessages(data);
          triggerMarkRead();
          setTimeout(() => scrollToBottom(false), 50);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load messages.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, triggerMarkRead]);

  // Socket room joining and event subscriptions
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_conversation', { conversationId });

    const handleNewMessage = (newMsg) => {
      if (newMsg.conversationId?.toString() === conversationId.toString()) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);

        const isRecipient =
          (newMsg.recipientId?._id || newMsg.recipientId)?.toString() ===
          currentUserId?.toString();
        if (isRecipient) {
          triggerMarkRead();
        }
      }
    };

    const handleExpiryStarted = ({ messageIds, readAt, expiresAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m._id) ? { ...m, readAt, expiresAt } : m
        )
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_expiry_started', handleExpiryStarted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_expiry_started', handleExpiryStarted);
      socket.emit('leave_conversation', { conversationId });
    };
  }, [conversationId, currentUserId, triggerMarkRead]);

  // Remove expired messages from the UI immediately
  const handleExpiredMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  }, []);

  // CAMERA & MEDIA STREAM HANDLING
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    setCameraError('');
    setCapturedImage(null);
    setShowCameraModal(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this browser or device.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser settings.'
          : 'Could not access camera. You can also pick an image file.'
      );
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setShowCameraModal(false);
    setCapturedImage(null);
    setCaption('');
    setCameraError('');
  };

  // Capture snapshot from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCameraStream();
  };

  // Handle image file selection (fallback or gallery pick)
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to canvas if larger than 1280px
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(compressed);
        setShowCameraModal(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send message (text, image, or text + image)
  const handleSendMessage = (textToSend = inputText, imageToSend = null) => {
    const trimmed = (textToSend || '').trim();
    if ((!trimmed && !imageToSend) || sending) return;

    setSending(true);
    const socket = getSocket();

    if (!socket || !socket.connected) {
      setError('Connection lost. Please wait or refresh.');
      setSending(false);
      return;
    }

    const idempotencyKey = `${currentUserId}:${conversationId}:${Date.now()}`;

    socket.emit(
      'send_message',
      {
        conversationId,
        text: trimmed,
        image: imageToSend,
        idempotencyKey,
      },
      (res) => {
        setSending(false);
        if (res && res.success) {
          setInputText('');
          if (showCameraModal) {
            closeCameraModal();
          }
          setMessages((prev) => {
            if (prev.some((m) => m._id === res.data._id)) return prev;
            return [...prev, res.data];
          });
          setTimeout(scrollToBottom, 50);
        } else {
          setError(res?.message || 'Could not deliver message.');
        }
      }
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {otherParticipant && (
            <Link
              to={`/profile/${otherParticipant._id}`}
              className="flex items-center gap-3 group"
            >
              <Avatar user={otherParticipant} size={40} />
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  {otherParticipant.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {otherParticipant.course} · {otherParticipant.college}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading messages...
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <div className="rounded-full bg-indigo-50 p-3 text-indigo-600 mb-2">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Say hello or snap a photo! Messages disappear 24 hours after being read.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn =
              (msg.senderId?._id || msg.senderId)?.toString() === currentUserId?.toString();
            return (
              <MessageBubble
                key={msg._id}
                message={msg}
                isOwn={isOwn}
                onExpired={handleExpiredMessage}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
        {/* Hidden file input for gallery upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFileChange}
          accept="image/*"
          className="hidden"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText, null);
          }}
          className="flex items-center gap-2"
        >
          {/* Camera Button */}
          <button
            type="button"
            onClick={startCamera}
            title="Snap photo with camera"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition"
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* Image Picker Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload photo from device"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a disappearing message..."
            maxLength={2000}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-1 flex justify-between px-1 text-[11px] text-slate-400">
          <span>Camera & photos disappear 24 hours after first read</span>
          {inputText.length > 100 && (
            <span>{inputText.length}/2000</span>
          )}
        </div>
      </div>

      {/* SNAPCHAT CAMERA & PHOTO PREVIEW MODAL */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-semibold">
                  {capturedImage ? 'Send Snap' : 'Snap a Photo'}
                </h3>
              </div>
              <button
                onClick={closeCameraModal}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Camera View or Captured Photo Preview */}
            <div className="relative flex min-h-[300px] sm:min-h-[380px] items-center justify-center bg-black">
              {capturedImage ? (
                <div className="relative h-full w-full flex items-center justify-center">
                  <img
                    src={capturedImage}
                    alt="Captured snap"
                    className="max-h-[380px] w-auto object-contain rounded-lg"
                  />
                </div>
              ) : cameraError ? (
                <div className="p-6 text-center text-slate-300">
                  <p className="text-sm text-red-400 mb-4">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <ImageIcon className="h-4 w-4" /> Pick from files instead
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover max-h-[380px]"
                />
              )}
            </div>

            {/* Modal Footer & Actions */}
            <div className="border-t border-slate-800 bg-slate-900 p-4">
              {capturedImage ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption... (optional)"
                    maxLength={200}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-indigo-500"
                  />

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedImage(null);
                        startCamera();
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                    >
                      <RotateCcw className="h-4 w-4" /> Retake
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage(caption, capturedImage)}
                      disabled={sending}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Send Snap
                    </button>
                  </div>
                </div>
              ) : (
                !cameraError && (
                  <div className="flex items-center justify-around py-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                    >
                      <ImageIcon className="h-4 w-4" /> Upload
                    </button>

                    {/* Snapchat-style Shutter Button */}
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-amber-400 p-1 shadow-lg transition active:scale-95 hover:bg-amber-300"
                      title="Take Photo"
                    >
                      <div className="h-full w-full rounded-full border-2 border-slate-900"></div>
                    </button>

                    <div className="w-12"></div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
