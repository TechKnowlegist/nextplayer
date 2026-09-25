import ChatFeed from '../components/ChatFeed';

export default function Chat() {
  return (
    <main className="np-page np-chat-page">
      <h1>Chat</h1>
      <p className="np-chat-page-sub">One open room for the whole arcade — talk about anything.</p>
      <ChatFeed channel="chat:global" title="Global Chat" placeholder="Say something to everyone..." />
    </main>
  );
}
