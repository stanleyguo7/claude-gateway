import { useState } from 'react';
import './ToolCallDisplay.css';

function ToolCallDisplay({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="tool-calls">
      {toolCalls.map((tool, i) => (
        <ToolCallItem key={i} tool={tool} />
      ))}
    </div>
  );
}

function ToolCallItem({ tool }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = tool.status === 'running'
    ? '\u23F3' // hourglass
    : tool.status === 'done'
      ? '\u2705' // check
      : tool.status === 'error'
        ? '\u274C' // x
        : '\u2699'; // gear

  return (
    <div className={`tool-call-item ${tool.status || 'pending'}`}>
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-status-icon">{statusIcon}</span>
        <span className="tool-name">{tool.name || 'Tool Call'}</span>
        <span className="tool-expand">{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>
      {expanded && (
        <div className="tool-call-details">
          {tool.input && (
            <div className="tool-section">
              <div className="tool-section-label">Input</div>
              <pre className="tool-json">
                {typeof tool.input === 'string'
                  ? tool.input
                  : JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}
          {tool.output && (
            <div className="tool-section">
              <div className="tool-section-label">Output</div>
              <pre className="tool-json">{tool.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCallDisplay;
