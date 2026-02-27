import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMessage from '../components/ChatMessage';

describe('ChatMessage', () => {
  const baseMessage = {
    id: 'test-1',
    text: 'Hello, world!',
    sender: 'user',
    timestamp: new Date('2025-01-01T12:00:00'),
    isError: false
  };

  it('renders user message text', () => {
    render(<ChatMessage message={baseMessage} />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders with user class', () => {
    const { container } = render(<ChatMessage message={baseMessage} />);
    expect(container.querySelector('.message.user')).toBeInTheDocument();
  });

  it('renders assistant message class', () => {
    const msg = { ...baseMessage, sender: 'assistant' };
    const { container } = render(<ChatMessage message={msg} />);
    expect(container.querySelector('.message.assistant')).toBeInTheDocument();
  });

  it('renders error class when isError is true', () => {
    const msg = { ...baseMessage, sender: 'error', isError: true };
    const { container } = render(<ChatMessage message={msg} />);
    expect(container.querySelector('.message.error')).toBeInTheDocument();
  });

  it('renders markdown for assistant messages', () => {
    const msg = {
      ...baseMessage,
      sender: 'assistant',
      text: '**bold** and `code`'
    };
    const { container } = render(<ChatMessage message={msg} />);
    expect(container.querySelector('strong')).toBeInTheDocument();
    expect(container.querySelector('.inline-code')).toBeInTheDocument();
  });

  it('renders timestamp', () => {
    render(<ChatMessage message={baseMessage} />);
    // Should contain a time string
    const timestamp = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timestamp).toBeInTheDocument();
  });

  it('shows delete button on hover when onDelete provided', () => {
    const onDelete = vi.fn();
    const { container } = render(<ChatMessage message={baseMessage} onDelete={onDelete} />);
    const deleteBtn = container.querySelector('.message-delete-btn');
    expect(deleteBtn).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    const { container } = render(<ChatMessage message={baseMessage} onDelete={onDelete} />);
    const deleteBtn = container.querySelector('.message-delete-btn');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('test-1');
  });

  it('does not show delete button when streaming', () => {
    const msg = { ...baseMessage, isStreaming: true };
    const onDelete = vi.fn();
    const { container } = render(<ChatMessage message={msg} onDelete={onDelete} />);
    const deleteBtn = container.querySelector('.message-delete-btn');
    expect(deleteBtn).toBeNull();
  });
});
