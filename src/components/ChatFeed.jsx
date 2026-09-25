import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { listMessages, postMessage, displayNameFor } from '../engine/arcadeApi';

const POLL_MS = 5000;

// A message feed for one `channel` — either 'chat:global' (the site-wide
// chat) or `leaderboard:<gameId>` (that game's leaderboard comments), see
// ArcadeMessage in Tasker/Nextlayer3D's amplify/data/resource.ts. Polls
// rather than subscribing over a websocket — comments/chat here don't need
// sub-second latency, and polling is a lot less to get wrong.
export default function ChatFeed({ channel, title = 'Comments', placeholder = 'Say something...' }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const items = await listMessages(channel);
        if (!cancelled) {
          setMessages(items);
          setFailed(false);
        }
      } catch (err) {
        console.log('Nextplayer — chat load failed:', err);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channel]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user || sending) return;
    setSending(true);
    try {
      const created = await postMessage(channel, trimmed, displayNameFor(user.email), user.email);
      setText('');
      if (created) {
        setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
      }
    } catch (err) {
      console.log('Nextplayer — post message failed:', err);
    }
    setSending(false);
  }

  return (
    <div className="np-chat">
      <h3>{title}</h3>
      <div className="np-chat-messages" ref={listRef}>
        {loading && <p className="np-chat-empty">Loading...</p>}
        {!loading && failed && <p className="np-chat-empty">Couldn't load the chat right now.</p>}
        {!loading && !failed && messages.length === 0 && (
          <p className="np-chat-empty">No messages yet — say hi!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="np-chat-message">
            <span className="np-chat-author">{m.authorName}</span>
            <span className="np-chat-text">{m.text}</span>
          </div>
        ))}
      </div>
      {user ? (
        <form className="np-chat-form" onSubmit={handleSubmit}>
          <input
            className="np-chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            maxLength={280}
          />
          <button className="np-btn np-btn-primary" type="submit" disabled={sending || !text.trim()}>
            Send
          </button>
        </form>
      ) : (
        <p className="np-chat-signin">
          <Link to="/account">Sign in</Link> to post.
        </p>
      )}
    </div>
  );
}
