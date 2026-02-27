import './ChatMessage.css';

function ChatMessage({ message }) {
  const { text, sender, timestamp, isError } = message;

  return (
    <div className={`message ${sender} ${isError ? 'error' : ''}`}>
      <div className="message-content">
        <div className="message-text">{text}</div>
        <div className="message-timestamp">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
