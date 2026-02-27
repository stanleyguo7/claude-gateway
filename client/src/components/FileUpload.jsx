import { useState, useRef } from 'react';
import './FileUpload.css';

function FileUpload({ onFilesSelected, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div
      className={`file-upload-area ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.jsx,.tsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sh,.yml,.yaml,.toml,.pdf,.png,.jpg,.jpeg,.gif,.webp"
      />
      <span className="file-upload-icon">&#128206;</span>
      <span className="file-upload-text">Drop files or click to attach</span>
    </div>
  );
}

function FileChip({ file, onRemove }) {
  const sizeStr = file.size < 1024
    ? `${file.size}B`
    : file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)}KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)}MB`;

  return (
    <div className="file-chip">
      <span className="file-chip-name">{file.name}</span>
      <span className="file-chip-size">{sizeStr}</span>
      <button className="file-chip-remove" onClick={() => onRemove(file)}>
        &times;
      </button>
    </div>
  );
}

export { FileUpload, FileChip };
