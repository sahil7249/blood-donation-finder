import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "../api.js";

// ─── Route Metadata for Navigation Pills ────────────────────────────────────
const ROUTE_INFO = {
  "/find-donors": { label: "Find Donors", icon: "🔍" },
  "/become-donor": { label: "Become a Donor", icon: "🩸" },
  "/blood-banks": { label: "Blood Banks", icon: "🏥" },
  "/emergency": { label: "Emergency Requests", icon: "🚨" },
  "/auth": { label: "Sign In / Register", icon: "👤" },
  "/": { label: "Home", icon: "🏠" },
};

// ─── Markdown + Link Parser ──────────────────────────────────────────────────
function parseInline(text, onNavigate) {
  // Regex to match:
  // 1. Markdown link: [label](url)
  // 2. Bold text: **bold**
  // 3. Raw route paths: /(find-donors|become-donor|blood-banks|emergency|auth)
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|(\/(?:find-donors|become-donor|blood-banks|emergency|auth))\b)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      // Markdown link [label](url)
      const label = match[2];
      const url = match[3].trim();
      const isInternal = url.startsWith("/");

      if (isInternal && onNavigate) {
        parts.push(
          <button
            key={`link-${match.index}`}
            className="chat-route-pill"
            onClick={() => onNavigate(url)}
            title={`Go to ${label}`}
          >
            <span>{ROUTE_INFO[url]?.icon || "👉"}</span>
            <span>{label}</span>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
              <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
        );
      } else {
        parts.push(
          <a
            key={`ext-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-external-link"
          >
            {label}
          </a>
        );
      }
    } else if (match[4]) {
      // Bold text **bold**
      parts.push(<strong key={`bold-${match.index}`}>{match[4]}</strong>);
    } else if (match[5]) {
      // Raw internal route like /find-donors
      const route = match[5];
      const info = ROUTE_INFO[route];
      if (onNavigate) {
        parts.push(
          <button
            key={`route-${match.index}`}
            className="chat-route-pill"
            onClick={() => onNavigate(route)}
            title={`Go to ${info?.label || route}`}
          >
            <span>{info?.icon || "👉"}</span>
            <span>{info?.label || route}</span>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
              <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
        );
      } else {
        parts.push(route);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

function renderFormattedMessage(text, onNavigate) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="chat-list">
          {listItems.map((li, i) => (
            <li key={i}>{parseInline(li, onNavigate)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const bullet = line.match(/^[\*\-\•]\s+(.+)/);
    const numbered = line.match(/^\d+\.\s+(.+)/);
    if (bullet || numbered) {
      listItems.push((bullet || numbered)[1]);
    } else {
      flushList();
      if (line.trim()) {
        elements.push(
          <p key={idx} className="chat-paragraph">
            {parseInline(line, onNavigate)}
          </p>
        );
      }
    }
  });
  flushList();
  return elements;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

// ─── Suggestion categories ────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  { text: "Show O+ donors in Pune", icon: "🔍" },
  { text: "Show active emergency requests", icon: "🚨" },
  { text: "List blood banks in Mumbai", icon: "🏥" },
  { text: "Who can receive O- blood?", icon: "🩸" },
  { text: "Am I eligible to donate blood?", icon: "📋" },
  { text: "What are the platform stats?", icon: "📊" },
];

const STORAGE_KEY = "lifelink_chat_history_v1";

// ─── Main Chatbot Component ───────────────────────────────────────────────────
export default function Chatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [listening, setListening] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.lang = "en-IN";

      recognizer.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setListening(false);
      };

      recognizer.onerror = () => setListening(false);
      recognizer.onend = () => setListening(false);

      recognitionRef.current = recognizer;
    }
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save chat history to localStorage", e);
    }
  }, [messages]);

  // Scroll to latest message
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    // On mobile, minimize chat window so user sees the page
    if (window.innerWidth <= 600) {
      setOpen(false);
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  const historyForAPI = () =>
    messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, text: m.text }));

  const submit = async (textToSubmit) => {
    const text = (textToSubmit ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.chat(text, historyForAPI());
      const reply = data?.reply || "I'm here to help with LifeLink. Please ask anything about blood donors or emergency requests.";
      const botMsg = { role: "model", text: reply, timestamp: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      const errorMsg = {
        role: "model",
        text: `⚠️ ${err.message || "Could not connect to LifeLink Assistant. Please try again."}`,
        isError: true,
        failedQuery: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      {/* ── Floating Toggle FAB ── */}
      <button
        id="chatbot-toggle"
        className={`chatbot-fab ${open ? "fab-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle LifeLink Assistant"
        title="LifeLink AI Assistant"
      >
        <span className="fab-icon">{open ? <IconClose /> : <IconChat />}</span>
        {!open && unread > 0 && <span className="fab-badge">{unread}</span>}
        {!open && <span className="fab-label">Ask AI 🩸</span>}
      </button>

      {/* ── Chat Window ── */}
      <div
        className={`chatbot-window ${open ? "chatbot-window--open" : ""}`}
        role="dialog"
        aria-label="LifeLink AI Assistant"
      >
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-avatar">
              <svg viewBox="0 0 24 24" fill="#fff" width="18" height="18">
                <path d="M12 2C12 2 4.5 11.2 4.5 16.2C4.5 20.2 7.9 22.8 12 22.8C16.1 22.8 19.5 20.2 19.5 16.2C19.5 11.2 12 2 12 2Z" />
              </svg>
            </div>
            <div>
              <div className="chat-header-name">LifeLink AI Assistant</div>
              <div className="chat-header-status">
                <span className="chat-online-dot" />
                Live Blood Network & Support
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            {messages.length > 0 && (
              <button
                className="chat-action-btn"
                onClick={clearChat}
                title="Clear conversation"
                aria-label="Clear chat"
              >
                <IconTrash />
              </button>
            )}
            <button
              className="chat-close-btn"
              onClick={() => setOpen(false)}
              title="Close chat"
              aria-label="Close chat"
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="chat-messages" id="chat-messages-area">
          {/* Welcome Screen */}
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-badge">
                <span className="chat-pulse-ring" />
                <span className="chat-welcome-icon">🩸</span>
              </div>
              <h4>Welcome to LifeLink Assistant</h4>
              <p>
                I can search available donors, check real-time blood bank inventory, explain donor eligibility, and check compatibility rules.
              </p>

              <div className="chat-suggestions-title">Try asking:</div>
              <div className="chat-suggestions">
                {QUICK_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => submit(s.text)}
                  >
                    <span className="suggestion-icon">{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-bubble-wrap ${
                msg.role === "user" ? "bubble-user" : "bubble-bot"
              } ${msg.isError ? "bubble-has-error" : ""}`}
            >
              {msg.role === "model" && (
                <div className="bubble-avatar" title="LifeLink AI">
                  <svg viewBox="0 0 24 24" fill="var(--crimson)" width="13" height="13">
                    <path d="M12 2C12 2 4.5 11.2 4.5 16.2C4.5 20.2 7.9 22.8 12 22.8C16.1 22.8 19.5 20.2 19.5 16.2C19.5 11.2 12 2 12 2Z" />
                  </svg>
                </div>
              )}

              <div className="chat-bubble-container">
                <div
                  className={`chat-bubble ${
                    msg.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"
                  }`}
                >
                  {msg.role === "model" ? (
                    renderFormattedMessage(msg.text, handleNavigate)
                  ) : (
                    <p className="chat-paragraph">{msg.text}</p>
                  )}

                  {msg.isError && msg.failedQuery && (
                    <button
                      className="chat-retry-btn"
                      onClick={() => submit(msg.failedQuery)}
                    >
                      🔄 Retry
                    </button>
                  )}
                </div>

                {/* Message Utility Bar (for bot replies) */}
                {msg.role === "model" && !msg.isError && (
                  <div className="chat-bubble-meta">
                    <button
                      className="chat-copy-btn"
                      onClick={() => copyMessage(msg.text, i)}
                      title="Copy response"
                    >
                      {copiedIdx === i ? <IconCheck /> : <IconCopy />}
                      <span>{copiedIdx === i ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="chat-bubble-wrap bubble-bot">
              <div className="bubble-avatar">
                <svg viewBox="0 0 24 24" fill="var(--crimson)" width="13" height="13">
                  <path d="M12 2C12 2 4.5 11.2 4.5 16.2C4.5 20.2 7.9 22.8 12 22.8C16.1 22.8 19.5 20.2 19.5 16.2C19.5 11.2 12 2 12 2Z" />
                </svg>
              </div>
              <div className="chat-bubble chat-bubble-bot typing-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Suggestion Pills Bar (available anytime) */}
        {messages.length > 0 && (
          <div className="chat-quick-actions">
            <button
              className="quick-action-pill"
              onClick={() => submit("Show active emergency blood requests")}
            >
              🚨 Emergencies
            </button>
            <button
              className="quick-action-pill"
              onClick={() => submit("Find available blood donors in Pune")}
            >
              🔍 Donors
            </button>
            <button
              className="quick-action-pill"
              onClick={() => submit("What are the criteria to donate blood?")}
            >
              📋 Eligibility
            </button>
            <button
              className="quick-action-pill"
              onClick={() => submit("Which blood banks have O+ units in stock?")}
            >
              🏥 O+ Inventory
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="chat-input-bar">
          <textarea
            ref={inputRef}
            id="chatbot-input"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={listening ? "Listening to your voice..." : "Ask about donors, banks, blood groups…"}
            rows={1}
            disabled={loading}
          />

          <button
            type="button"
            className={`chat-voice-btn ${listening ? "voice-listening" : ""}`}
            onClick={toggleVoiceInput}
            title={listening ? "Stop listening" : "Speak your question"}
            aria-label="Voice input"
          >
            <IconMic />
          </button>

          <button
            id="chatbot-send"
            className="chat-send-btn"
            onClick={() => submit()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            title="Send"
          >
            <IconSend />
          </button>
        </div>

        {/* Footer info note */}
        <div className="chat-footer-note">
          <span>AI-assisted platform search</span>
          <span className="chat-footer-sep">·</span>
          <span>Emergency Helpline: <strong>104 / 112</strong></span>
        </div>
      </div>
    </>
  );
}
