import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi';

const ChatWidget = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      text: "Hi! I'm the BuyEasy support assistant. I can help you check order status, verify return eligibility, request refunds, and track deliveries.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Conversation-local context: last order ID discussed in this session.
  // Sent to backend each turn so the agent can resolve "it" / "my order".
  // Reset when the chat panel is closed and reopened.
  const [lastOrderId, setLastOrderId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset context when user closes and reopens the widget
  const handleToggle = () => {
    if (open) {
      // Closing — clear conversation context
      setLastOrderId(null);
      setMessages([
        {
          role: 'agent',
          text: "Hi! I'm the BuyEasy support assistant. I can help you check order status, verify return eligibility, request refunds, and track deliveries.",
        },
      ]);
    }
    setOpen((o) => !o);
  };

  if (!isAuthenticated) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await api.post('/agent/chat', {
        message: text,
        lastOrderId,  // send current context to backend
      });

      const { reply, lastOrderId: newOrderId } = res.data;

      // Update conversation context if backend found/used an order ID
      if (newOrderId) {
        setLastOrderId(newOrderId);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: 'Something went wrong. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        id="chat-widget-toggle"
        onClick={handleToggle}
        style={styles.fab}
        title="BuyEasy Support"
      >
        {open ? <FiX size={22} /> : <FiMessageSquare size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={styles.panel} id="chat-widget-panel">
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <span style={styles.statusDot} />
              <span style={styles.headerTitle}>🤖 BuyEasy Support</span>
            </div>
            <button style={styles.closeBtn} onClick={handleToggle}>
              <FiX size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.bubble,
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background:
                    msg.role === 'user'
                      ? '#4F46E5'
                      : msg.isError
                      ? '#fee2e2'
                      : '#f1f5f9',
                  color: msg.role === 'user' ? '#fff' : msg.isError ? '#991b1b' : '#1e293b',
                }}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div style={{ ...styles.bubble, alignSelf: 'flex-start', background: '#f1f5f9' }}>
                <span style={styles.typingDots}>
                  <span>●</span><span>●</span><span>●</span>
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={styles.inputRow}>
            <textarea
              id="chat-input"
              style={styles.textarea}
              placeholder="Ask about your order…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              id="chat-send-btn"
              style={{
                ...styles.sendBtn,
                opacity: loading || !input.trim() ? 0.5 : 1,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <FiSend size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
};

const styles = {
  fab: {
    position: 'fixed',
    bottom: '90px', // Moved up to avoid Stripe badge
    right: '24px',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
    zIndex: 9999,
    transition: 'transform 0.2s',
  },
  panel: {
    position: 'fixed',
    bottom: '150px', // Adjusted to match new fab position
    right: '24px',
    width: '360px',
    height: '500px',
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9998,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    background: '#4F46E5',
    color: '#fff',
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ade80',
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: '14px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    padding: '2px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bubble: {
    maxWidth: '82%',
    padding: '8px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  typingDots: {
    display: 'inline-flex',
    gap: '3px',
    fontSize: '10px',
    '& span': {
      animation: 'bounce 1.2s infinite',
    },
  },
  inputRow: {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #e2e8f0',
    gap: '8px',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.5',
  },
  sendBtn: {
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
};

export default ChatWidget;
