import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Info,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  X,
  User as UserIcon,
  ExternalLink,
  Link as LinkIcon,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import TutorProfileModal from '../components/TutorProfileModal';
import UserProfileModal from '../components/UserProfileModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import { resolveAttachmentUrl, isImageAttachment, downloadAttachment } from '../services/attachment';
import '../styles/messages.css';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString('en-PH', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const formatDateDivider = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${time}`;
  return `${d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}, ${time}`;
};

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function extractSharedLinks(msgs = []) {
  const links = [];
  msgs.forEach((m) => {
    if (m.text) {
      const matches = m.text.match(URL_REGEX);
      if (matches) {
        matches.forEach((raw) => {
          const cleanUrl = raw.replace(/[.,!?;:)]+$/, '');
          try {
            const parsed = new URL(cleanUrl);
            links.push({
              url: cleanUrl,
              title: parsed.hostname.replace(/^www\./, ''),
              snippet: cleanUrl,
              senderName: m.sender?.name || 'Contact',
              createdAt: m.createdAt,
              isAttachment: false,
            });
          } catch {
            // ignore malformed url
          }
        });
      }
    }
    if (m.attachment?.url) {
      links.push({
        url: resolveAttachmentUrl(m.attachment.url),
        rawAttachment: m.attachment,
        title: m.attachment.originalName || 'Shared Attachment',
        snippet: m.attachment.originalName || 'File',
        senderName: m.sender?.name || 'Contact',
        createdAt: m.createdAt,
        isAttachment: true,
      });
    }
  });
  return links.reverse();
}

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = user?.role === 'teacher';

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(searchParams.get('conversationId') || '');
  const [messages, setMessages] = useState([]);
  const [activeRecipient, setActiveRecipient] = useState(null);

  const [filterText, setFilterText] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);

  // Info menu & actions state
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTutorId, setViewTutorId] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);

  // Close preview on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleDownloadAttachment = async (attachment) => {
    if (!attachment || downloadingAttachment) return;
    setDownloadingAttachment(true);
    try {
      await downloadAttachment(attachment);
    } catch {
      alert('Unable to download attachment.');
    } finally {
      setDownloadingAttachment(false);
    }
  };

  const chatScrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const infoMenuRef = useRef(null);
  const recipientIdParam = searchParams.get('recipientId');

  const sharedLinks = useMemo(() => extractSharedLinks(messages), [messages]);

  // Click outside & Escape key for Info Popover
  useEffect(() => {
    if (!infoMenuOpen) return;
    const handleClickOutside = (e) => {
      if (infoMenuRef.current && !infoMenuRef.current.contains(e.target)) {
        setInfoMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setInfoMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [infoMenuOpen]);

  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  // If a recipientId was passed in query, find or create conversation
  useEffect(() => {
    if (!recipientIdParam) return;
    let active = true;
    api.post('/messages/conversations', { recipientId: recipientIdParam })
      .then((res) => {
        if (active && res.data?._id) {
          setActiveId(res.data._id);
          setSearchParams({ conversationId: res.data._id });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [recipientIdParam, setSearchParams]);

  // Initial load of conversations
  useEffect(() => {
    let cancelled = false;
    api.get('/messages/conversations')
      .then((res) => {
        if (!cancelled) {
          const list = res.data || [];
          setConversations(list);
          if (!activeId && list.length > 0 && !recipientIdParam) {
            setActiveId(list[0]._id);
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [recipientIdParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load active conversation messages
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    api.get(`/messages/conversations/${activeId}`)
      .then((res) => {
        if (!cancelled) {
          setMessages(res.data.messages || []);
          setActiveRecipient(res.data.conversation?.otherParticipant || null);
          setIsBlockedByMe(Boolean(res.data.conversation?.isBlockedByMe));
          setIsBlockedByThem(Boolean(res.data.conversation?.isBlockedByThem));
          setConversations((prev) =>
            prev.map((c) => (c._id === activeId ? { ...c, unreadCount: 0 } : c))
          );
          setTimeout(scrollToBottom, 50);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeId, scrollToBottom]);

  // Ensure view stays scrolled to the latest message
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(scrollToBottom, 60);
      return () => clearTimeout(timer);
    }
  }, [messages.length, scrollToBottom]);

  // Live polling for responsive chat (every 3.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      api.get('/messages/conversations').then((res) => {
        setConversations(res.data || []);
      }).catch(() => {});

      if (activeId) {
        api.get(`/messages/conversations/${activeId}`).then((res) => {
          setMessages(res.data.messages || []);
          setActiveRecipient(res.data.conversation?.otherParticipant || null);
          setIsBlockedByMe(Boolean(res.data.conversation?.isBlockedByMe));
          setIsBlockedByThem(Boolean(res.data.conversation?.isBlockedByThem));
        }).catch(() => {});
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeId]);

  // Open conversation from sidebar
  const handleSelectConversation = (conv) => {
    setActiveId(conv._id);
    setActiveRecipient(conv.otherParticipant);
    setInfoMenuOpen(false);
    setLinksOpen(false);
    setSearchParams({ conversationId: conv._id });
  };

  // Profile modal action
  const handleOpenProfile = () => {
    setInfoMenuOpen(false);
    if (!activeRecipient) return;
    if (activeRecipient.role === 'teacher') {
      setViewTutorId(activeRecipient._id);
    } else {
      setViewUser(activeRecipient);
    }
  };

  // Block / Unblock action
  const handleToggleBlock = async () => {
    if (!activeId) return;
    setBlockLoading(true);
    try {
      const res = await api.post(`/messages/conversations/${activeId}/block`);
      setIsBlockedByMe(Boolean(res.data?.isBlocked));
      setShowBlockModal(false);
      setInfoMenuOpen(false);
      setToastMessage(res.data?.message || (res.data?.isBlocked ? 'Contact blocked.' : 'Contact unblocked.'));
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update block status.');
    } finally {
      setBlockLoading(false);
    }
  };

  // Delete conversation action
  const handleDeleteConversation = async () => {
    if (!activeId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/messages/conversations/${activeId}`);
      setConversations((prev) => prev.filter((c) => c._id !== activeId));
      setActiveId('');
      setActiveRecipient(null);
      setMessages([]);
      setShowDeleteModal(false);
      setInfoMenuOpen(false);
      searchParams.delete('conversationId');
      setSearchParams(searchParams);
      setToastMessage('Conversation deleted.');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete conversation.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open "New Message" modal
  const handleOpenNewModal = async () => {
    setShowNewModal(true);
    setContactsLoading(true);
    try {
      const res = await api.get('/messages/contacts');
      setContacts(res.data || []);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  // Start chat with a contact from modal
  const handleStartChatWithContact = async (contact) => {
    setShowNewModal(false);
    try {
      const res = await api.post('/messages/conversations', { recipientId: contact._id });
      setActiveId(res.data._id);
      setSearchParams({ conversationId: res.data._id });
      const convsRes = await api.get('/messages/conversations');
      setConversations(convsRes.data || []);
    } catch {
      // ignore
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if ((!trimmed && !selectedFile) || sending || !activeId) return;

    setSending(true);
    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('text', trimmed);
        formData.append('file', selectedFile);
        res = await api.post(`/messages/conversations/${activeId}`, formData);
      } else {
        res = await api.post(`/messages/conversations/${activeId}`, { text: trimmed });
      }

      setMessages((prev) => [...prev, res.data]);
      setInputText('');
      setSelectedFile(null);
      setShowEmojis(false);
      setTimeout(scrollToBottom, 50);

      const convsRes = await api.get('/messages/conversations');
      setConversations(convsRes.data || []);
    } catch {
      // error handled gracefully
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.otherParticipant?.name?.toLowerCase().includes(filterText.toLowerCase().trim())
  );

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase().trim()) ||
    c.subtitle?.toLowerCase().includes(contactSearch.toLowerCase().trim())
  );

  const emojis = ['😊', '👍', '👋', '📚', '✨', '🙏', '🙌', '💡', '✅', '❤️'];

  return (
    <DashboardLayout role={user?.role || 'student'} userName={user?.name}>
      <div className="messages-page-container">
        <div className="messages-card-layout">
          {/* ── Left Sidebar (Conversations) ─────────────────────────────── */}
          <aside className={`messages-sidebar-pane ${activeId ? 'hidden-mobile' : ''}`}>
            <header className="messages-sidebar-header">
              <h2 className="messages-sidebar-title">Messages</h2>
              <button
                type="button"
                className="messages-new-btn"
                onClick={handleOpenNewModal}
                aria-label="Start new conversation"
              >
                <Plus size={16} />
                New
              </button>
            </header>

            <div className="messages-search-wrap">
              <div className="messages-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder={isTeacher ? 'Filter students…' : 'Filter conversations…'}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  aria-label="Filter conversations"
                />
                {filterText && (
                  <button
                    type="button"
                    style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
                    onClick={() => setFilterText('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="messages-conv-list" role="list">
              {filteredConversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--layout-muted)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '13px' }}>
                    {filterText ? 'No conversations match your search.' : 'No messages yet.'}
                  </p>
                  {!filterText && (
                    <button
                      type="button"
                      className="messages-new-btn"
                      onClick={handleOpenNewModal}
                    >
                      <Plus size={14} /> Start a conversation
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other = conv.otherParticipant;
                  const isSelected = conv._id === activeId;
                  const initial = other?.name?.charAt(0).toUpperCase() || 'U';

                  return (
                    <button
                      key={conv._id}
                      type="button"
                      className={`messages-conv-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectConversation(conv)}
                      aria-pressed={isSelected}
                    >
                      <div className="messages-avatar-wrap">
                        {other?.profilePicture ? (
                          <img
                            src={profilePictureUrl(other.profilePicture)}
                            alt=""
                            className="messages-avatar-img"
                          />
                        ) : (
                          <div className="messages-avatar-fallback">{initial}</div>
                        )}
                        <span className="messages-online-dot" />
                      </div>

                      <div className="messages-conv-info">
                        <div className="messages-conv-top-row">
                          <span className="messages-conv-name">{other?.name || 'User'}</span>
                          <span className="messages-conv-time">{formatTime(conv.lastMessageAt)}</span>
                        </div>
                        <div className="messages-conv-bottom-row">
                          <span className="messages-conv-preview">
                            {conv.lastMessage || 'No messages yet'}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="messages-unread-badge">{conv.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Right Pane (Active Chat Thread) ──────────────────────────── */}
          <main className={`messages-main-pane ${!activeId ? 'hidden-mobile' : ''}`}>
            {activeId && activeRecipient ? (
              <>
                <header className="messages-chat-header">
                  <div className="messages-chat-header-user">
                    <button
                      type="button"
                      className="messages-icon-btn messages-back-btn"
                      onClick={() => setActiveId('')}
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="messages-avatar-wrap" style={{ width: '42px', height: '42px' }}>
                      {activeRecipient.profilePicture ? (
                        <img
                          src={profilePictureUrl(activeRecipient.profilePicture)}
                          alt=""
                          className="messages-avatar-img"
                        />
                      ) : (
                        <div className="messages-avatar-fallback">
                          {activeRecipient.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="messages-online-dot" />
                    </div>

                    <div className="messages-chat-header-names">
                      <h3>{activeRecipient.name}</h3>
                      <span className="messages-chat-header-status">
                        ● Active now
                      </span>
                    </div>
                  </div>

                  <div className="messages-chat-header-actions" ref={infoMenuRef}>
                    <button
                      type="button"
                      className={`messages-icon-btn ${infoMenuOpen ? 'active' : ''}`}
                      title="Recipient Information & Options"
                      aria-label="Recipient information and options"
                      onClick={() => setInfoMenuOpen((prev) => !prev)}
                    >
                      <Info size={19} />
                    </button>

                    {infoMenuOpen && (
                      <div className="messages-info-popover" role="dialog" aria-label="Conversation options">
                        <div className="messages-popover-header">
                          <div className="messages-popover-avatar-wrap">
                            {activeRecipient.profilePicture ? (
                              <img
                                src={profilePictureUrl(activeRecipient.profilePicture)}
                                alt=""
                                className="messages-popover-avatar-img"
                              />
                            ) : (
                              <div className="messages-avatar-fallback">
                                {activeRecipient.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="messages-popover-user-meta">
                            <h4>{activeRecipient.name}</h4>
                            <span className="messages-popover-role-pill">
                              {activeRecipient.role === 'teacher' ? 'Verified Tutor' : 'Student'}
                            </span>
                          </div>
                        </div>

                        <div className="messages-popover-menu">
                          {/* 1. View Profile */}
                          <button
                            type="button"
                            className="messages-popover-item"
                            onClick={handleOpenProfile}
                          >
                            <div className="messages-popover-item-left">
                              <UserIcon size={16} />
                              <span>View Profile</span>
                            </div>
                            <ChevronRight size={15} className="messages-popover-arrow" />
                          </button>

                          {/* 2. Shared Links ⬇️ */}
                          <div className="messages-links-section">
                            <button
                              type="button"
                              className={`messages-popover-item ${linksOpen ? 'expanded' : ''}`}
                              onClick={() => setLinksOpen((prev) => !prev)}
                            >
                              <div className="messages-popover-item-left">
                                <LinkIcon size={16} />
                                <span>Shared Links</span>
                                <span className="messages-links-badge">{sharedLinks.length}</span>
                              </div>
                              <ChevronDown
                                size={15}
                                className={`messages-chevron-icon ${linksOpen ? 'rotated' : ''}`}
                              />
                            </button>

                            {linksOpen && (
                              <div className="messages-links-drawer">
                                {sharedLinks.length === 0 ? (
                                  <div className="messages-links-empty">
                                    No shared links or attachments in this chat
                                  </div>
                                ) : (
                                  <div className="messages-links-list">
                                {sharedLinks.map((item, idx) => (
                                  item.isAttachment ? (
                                    <button
                                      key={idx}
                                      type="button"
                                      className="messages-link-entry"
                                      onClick={() => {
                                        if (isImageAttachment(item.rawAttachment)) {
                                          setPreviewImage({
                                            url: resolveAttachmentUrl(item.rawAttachment.url),
                                            name: item.rawAttachment.originalName || 'Image',
                                            size: item.rawAttachment.size,
                                            attachment: item.rawAttachment,
                                          });
                                        } else {
                                          handleDownloadAttachment(item.rawAttachment);
                                        }
                                      }}
                                      title={item.title}
                                    >
                                      <div className="messages-link-entry-icon">
                                        {isImageAttachment(item.rawAttachment) ? (
                                          <ImageIcon size={14} />
                                        ) : (
                                          <Download size={14} />
                                        )}
                                      </div>
                                      <div className="messages-link-entry-info">
                                        <span className="messages-link-title">{item.title}</span>
                                        <small className="messages-link-meta">
                                          {item.senderName} · {formatTime(item.createdAt)}
                                        </small>
                                      </div>
                                    </button>
                                  ) : (
                                    <a
                                      key={idx}
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="messages-link-entry"
                                      title={item.url}
                                    >
                                      <div className="messages-link-entry-icon">
                                        <ExternalLink size={14} />
                                      </div>
                                      <div className="messages-link-entry-info">
                                        <span className="messages-link-title">{item.title}</span>
                                        <small className="messages-link-meta">
                                          {item.senderName} · {formatTime(item.createdAt)}
                                        </small>
                                      </div>
                                    </a>
                                  )
                                ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="messages-popover-divider" />

                          {/* 3. Block / Unblock Contact */}
                          <button
                            type="button"
                            className="messages-popover-item warning"
                            onClick={() => {
                              if (isBlockedByMe) {
                                handleToggleBlock();
                              } else {
                                setInfoMenuOpen(false);
                                setShowBlockModal(true);
                              }
                            }}
                          >
                            <div className="messages-popover-item-left">
                              <ShieldAlert size={16} />
                              <span>{isBlockedByMe ? 'Unblock Contact' : 'Block Contact'}</span>
                            </div>
                          </button>

                          {/* 4. Delete Conversation */}
                          <button
                            type="button"
                            className="messages-popover-item danger"
                            onClick={() => {
                              setInfoMenuOpen(false);
                              setShowDeleteModal(true);
                            }}
                          >
                            <div className="messages-popover-item-left">
                              <Trash2 size={16} />
                              <span>Delete Conversation</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </header>

                <div className="messages-chat-scroll" ref={chatScrollRef}>
                  {messages.length === 0 ? (
                    <div className="messages-empty-pane" style={{ background: 'transparent' }}>
                      <MessageSquare size={36} />
                      <h3>Say hello!</h3>
                      <p>Send a message to start learning or teaching together.</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const myId = String(user?._id || user?.id || '');
                      const senderId = String(msg.sender?._id || msg.sender?.id || msg.sender || '');
                      const isMe = Boolean(myId && senderId && myId === senderId);

                      const senderName = isMe ? 'You' : (msg.sender?.name || activeRecipient?.name || 'Contact');
                      const senderAvatar = isMe
                        ? user?.profilePicture
                        : (msg.sender?.profilePicture || (senderId === String(activeRecipient?._id || activeRecipient?.id) ? activeRecipient?.profilePicture : null));
                      const senderInitial = isMe
                        ? (user?.name?.charAt(0) || 'U').toUpperCase()
                        : (senderName?.charAt(0) || 'U').toUpperCase();

                      const showDivider =
                        index === 0 ||
                        new Date(msg.createdAt) - new Date(messages[index - 1].createdAt) > 3600000;

                      return (
                        <Fragment key={msg._id || index}>
                          {showDivider && (
                            <div className="messages-date-divider">
                              <span className="messages-date-pill">
                                {formatDateDivider(msg.createdAt)}
                              </span>
                            </div>
                          )}

                          <div className={`messages-bubble-row ${isMe ? 'sent' : 'received'}`}>
                            <div className="messages-sender-indicator">
                              <span className="messages-sender-name">
                                {isMe ? 'You' : senderName}
                              </span>
                            </div>

                            <div className="messages-bubble-container">
                              {!isMe && (
                                <div className="messages-bubble-avatar">
                                  {senderAvatar ? (
                                    <img
                                      src={profilePictureUrl(senderAvatar)}
                                      alt={senderName}
                                    />
                                  ) : (
                                    <div className="messages-avatar-fallback small">{senderInitial}</div>
                                  )}
                                </div>
                              )}

                              <div className="messages-bubble">
                                {msg.text}
                                {msg.attachment && (
                                  isImageAttachment(msg.attachment) ? (
                                    <div className="messages-image-attachment-wrapper">
                                      <button
                                        type="button"
                                        className="messages-image-attachment-preview"
                                        onClick={() => setPreviewImage({
                                          url: resolveAttachmentUrl(msg.attachment.url),
                                          name: msg.attachment.originalName || 'Image',
                                          size: msg.attachment.size,
                                          attachment: msg.attachment,
                                        })}
                                        title="Click to view full image"
                                      >
                                        <img
                                          src={resolveAttachmentUrl(msg.attachment.url)}
                                          alt={msg.attachment.originalName || 'Image attachment'}
                                          loading="lazy"
                                        />
                                        <div className="messages-image-attachment-overlay">
                                          <Eye size={18} />
                                          <span>View</span>
                                        </div>
                                      </button>
                                      <div className="messages-image-attachment-caption">
                                        <span className="messages-image-name" title={msg.attachment.originalName}>
                                          {msg.attachment.originalName || 'Image'}
                                        </span>
                                        <button
                                          type="button"
                                          className="messages-attachment-download-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadAttachment(msg.attachment);
                                          }}
                                          title="Download image"
                                          aria-label="Download image"
                                        >
                                          <Download size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="messages-attachment-card interactive"
                                      onClick={() => handleDownloadAttachment(msg.attachment)}
                                      title={`Click to download ${msg.attachment.originalName || 'file'}`}
                                    >
                                      <FileText size={15} />
                                      <span className="messages-attachment-title">
                                        {msg.attachment.originalName || 'Attachment'}
                                      </span>
                                      <span className="messages-attachment-action" title="Download">
                                        <Download size={13} />
                                      </span>
                                    </button>
                                  )
                                )}
                              </div>

                              {isMe && (
                                <div className="messages-bubble-avatar sent-avatar">
                                  {senderAvatar ? (
                                    <img
                                      src={profilePictureUrl(senderAvatar)}
                                      alt="You"
                                    />
                                  ) : (
                                    <div className="messages-avatar-fallback small sent-fallback">{senderInitial}</div>
                                  )}
                                </div>
                              )}
                            </div>

                            <span className="messages-bubble-meta">
                              {new Date(msg.createdAt).toLocaleTimeString('en-PH', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </Fragment>
                      );
                    })
                  )}
                </div>

                {/* Input Bar */}
                {isBlockedByMe ? (
                  <div className="messages-blocked-banner">
                    <div className="messages-blocked-banner-content">
                      <ShieldAlert size={18} />
                      <span>You have blocked {activeRecipient?.name}.</span>
                    </div>
                    <button
                      type="button"
                      className="messages-unblock-inline-btn"
                      onClick={handleToggleBlock}
                      disabled={blockLoading}
                    >
                      {blockLoading ? 'Unblocking…' : 'Unblock'}
                    </button>
                  </div>
                ) : isBlockedByThem ? (
                  <div className="messages-blocked-banner muted">
                    <div className="messages-blocked-banner-content">
                      <AlertCircle size={18} />
                      <span>You cannot send messages to this contact.</span>
                    </div>
                  </div>
                ) : (
                  <form className="messages-input-bar" onSubmit={handleSendMessage}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                      }}
                    />

                    <button
                      type="button"
                      className="messages-icon-btn"
                      title="Attach file"
                      aria-label="Attach file"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip size={18} />
                    </button>

                    <div className="messages-input-pill-wrap">
                      {selectedFile && (
                        <span
                          style={{
                            fontSize: '11px',
                            background: 'rgba(53, 92, 66, 0.15)',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          📎 {selectedFile.name}
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </span>
                      )}

                      <input
                        type="text"
                        className="messages-input-field"
                        placeholder="Type a message…"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="Type message"
                      />

                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className="messages-icon-btn"
                          title="Emojis"
                          aria-label="Insert emoji"
                          onClick={() => setShowEmojis((open) => !open)}
                        >
                          <Smile size={18} />
                        </button>

                        {showEmojis && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '40px',
                              right: '0',
                              background: '#ffffff',
                              border: '1px solid var(--layout-border)',
                              borderRadius: '12px',
                              padding: '8px',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: '6px',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                              zIndex: 10,
                            }}
                          >
                            {emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                style={{
                                  fontSize: '18px',
                                  background: 'transparent',
                                  border: 0,
                                  cursor: 'pointer',
                                  padding: '4px',
                                }}
                                onClick={() => {
                                  setInputText((prev) => prev + emoji);
                                  setShowEmojis(false);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="messages-send-btn"
                      disabled={(!inputText.trim() && !selectedFile) || sending}
                      aria-label="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="messages-empty-pane">
                <MessageSquare size={48} />
                <h3>Your Messages</h3>
                <p>Select a conversation from the left, or start a new chat with your teachers or students.</p>
                <button
                  type="button"
                  className="messages-new-btn"
                  style={{ marginTop: '12px' }}
                  onClick={handleOpenNewModal}
                >
                  <Plus size={15} /> Start new chat
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── New Conversation Contacts Modal ───────────────────────────────── */}
      {showNewModal && (
        <div className="messages-modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="messages-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="messages-modal-header">
              <h3>Start a New Message</h3>
              <button
                type="button"
                className="messages-icon-btn"
                onClick={() => setShowNewModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div style={{ padding: '12px 20px 8px' }}>
              <div className="messages-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search contacts…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="messages-contacts-list">
              {contactsLoading ? (
                <p style={{ textAlign: 'center', padding: '24px', color: 'var(--layout-muted)' }}>
                  Loading contacts…
                </p>
              ) : filteredContacts.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px', color: 'var(--layout-muted)' }}>
                  {contactSearch ? 'No contacts found.' : 'No enrolled students or teachers found yet.'}
                </p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact._id}
                    type="button"
                    className="messages-contact-item"
                    onClick={() => handleStartChatWithContact(contact)}
                  >
                    <div className="messages-avatar-wrap" style={{ width: '40px', height: '40px' }}>
                      {contact.profilePicture ? (
                        <img
                          src={profilePictureUrl(contact.profilePicture)}
                          alt=""
                          className="messages-avatar-img"
                        />
                      ) : (
                        <div className="messages-avatar-fallback">
                          {contact.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="messages-contact-info">
                      <strong>{contact.name}</strong>
                      <small>{contact.subtitle || (contact.role === 'teacher' ? 'Teacher' : 'Student')}</small>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tutor Profile Modal (for Teacher Recipients) ────────────────── */}
      {viewTutorId && (
        <TutorProfileModal
          tutorId={viewTutorId}
          isOpen={Boolean(viewTutorId)}
          onClose={() => setViewTutorId(null)}
        />
      )}

      {/* ── User Profile Modal (for Student Recipients) ────────────────── */}
      {viewUser && (
        <UserProfileModal
          user={viewUser}
          isOpen={Boolean(viewUser)}
          onClose={() => setViewUser(null)}
        />
      )}

      {/* ── Block Contact Confirmation Modal ──────────────────────────────── */}
      {showBlockModal && (
        <div className="messages-modal-overlay" onClick={() => setShowBlockModal(false)}>
          <div className="messages-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="messages-confirm-icon warning">
              <ShieldAlert size={28} />
            </div>
            <h3>Block {activeRecipient?.name}?</h3>
            <p>
              You will no longer receive new messages from {activeRecipient?.name}. You can unblock them at any time.
            </p>
            <div className="messages-confirm-actions">
              <button
                type="button"
                className="messages-dialog-btn secondary"
                onClick={() => setShowBlockModal(false)}
                disabled={blockLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="messages-dialog-btn danger"
                onClick={handleToggleBlock}
                disabled={blockLoading}
              >
                {blockLoading ? 'Blocking…' : 'Block Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Conversation Confirmation Modal ────────────────────────── */}
      {showDeleteModal && (
        <div className="messages-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="messages-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="messages-confirm-icon danger">
              <Trash2 size={28} />
            </div>
            <h3>Delete Conversation?</h3>
            <p>
              This will remove this entire conversation history with {activeRecipient?.name} from your inbox. This action cannot be undone.
            </p>
            <div className="messages-confirm-actions">
              <button
                type="button"
                className="messages-dialog-btn secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="messages-dialog-btn danger"
                onClick={handleDeleteConversation}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting…' : 'Delete Conversation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Preview Lightbox Modal ──────────────────────────────────── */}
      {previewImage && (
        <div
          className="messages-image-modal-backdrop"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div
            className="messages-image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="messages-image-modal-header">
              <div className="messages-image-modal-info">
                <span className="messages-image-modal-title" title={previewImage.name}>
                  {previewImage.name}
                </span>
                {previewImage.size ? (
                  <span className="messages-image-modal-size">
                    {Math.max(1, Math.round(previewImage.size / 1024))} KB
                  </span>
                ) : null}
              </div>
              <div className="messages-image-modal-actions">
                <button
                  type="button"
                  className="messages-image-modal-btn download"
                  onClick={() => handleDownloadAttachment(previewImage.attachment || { url: previewImage.url, originalName: previewImage.name })}
                  title="Download image"
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="messages-image-modal-btn external"
                  title="Open full image in new tab"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  className="messages-image-modal-btn close"
                  onClick={() => setPreviewImage(null)}
                  title="Close"
                  aria-label="Close image preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="messages-image-modal-body">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="messages-image-modal-img"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Toast ─────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="messages-floating-toast" role="status">
          <CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
