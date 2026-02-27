import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import ToolCallDisplay from './ToolCallDisplay';
import './ChatMessage.css';

function CopyButton({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className="copy-button" onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '');
  const code = String(children).replace(/\n$/, '');

  if (!inline && (match || code.includes('\n'))) {
    const language = match ? match[1] : 'text';
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-language">{language}</span>
          <CopyButton code={code} />
        </div>
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: '0 0 8px 8px',
            fontSize: '0.875rem',
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className="inline-code" {...props}>
      {children}
    </code>
  );
}

function ChatMessage({ message }) {
  const { text, sender, timestamp, isError, toolCalls } = message;

  const renderContent = () => {
    if (sender === 'assistant') {
      return (
        <>
          {toolCalls && toolCalls.length > 0 && (
            <ToolCallDisplay toolCalls={toolCalls} />
          )}
          <ReactMarkdown
            components={{
              code: CodeBlock,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </>
      );
    }
    return <span>{text}</span>;
  };

  return (
    <div className={`message ${sender} ${isError ? 'error' : ''}`}>
      <div className="message-content">
        <div className="message-text">{renderContent()}</div>
        <div className="message-timestamp">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
