import { useState, useRef } from 'react';
import { FileChip } from './FileUpload';
import './MessageInput.css';

function MessageInput({ onSend, disabled }) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((input.trim() || attachedFiles.length > 0) && !disabled) {
      onSend(input.trim(), attachedFiles);
      setInput('');
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await response.json();
      setAttachedFiles(prev => [...prev, ...data.files]);
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (file) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== file.id));
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(Array.from(e.target.files));
    e.target.value = '';
  };

  return (
    <div className="message-input-wrapper">
      {attachedFiles.length > 0 && (
        <div className="file-chips">
          {attachedFiles.map(file => (
            <FileChip key={file.id} file={file} onRemove={handleRemoveFile} />
          ))}
        </div>
      )}
      <form className="message-input" onSubmit={handleSubmit}>
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          title="Attach files"
        >
          &#128206;
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          accept=".txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.jsx,.tsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sh,.yml,.yaml,.toml,.pdf,.png,.jpg,.jpeg,.gif,.webp"
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploading ? 'Uploading files...' : 'Type your message... (Enter to send, Shift+Enter for new line)'}
          disabled={disabled || uploading}
          rows="1"
        />
        <button type="submit" disabled={(!input.trim() && attachedFiles.length === 0) || disabled || uploading}>
          Send
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
