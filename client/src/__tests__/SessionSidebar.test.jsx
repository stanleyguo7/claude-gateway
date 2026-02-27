import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionSidebar from '../components/SessionSidebar';

describe('SessionSidebar', () => {
  const sessions = [
    { id: 's1', title: 'First Chat', created_at: '2025-01-01', last_activity: '2025-01-01' },
    { id: 's2', title: 'Second Chat', created_at: '2025-01-02', last_activity: '2025-01-02' },
  ];

  const defaultProps = {
    sessions,
    activeSessionId: 's1',
    onSelectSession: vi.fn(),
    onNewSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onRenameSession: vi.fn(),
    isOpen: true,
    onToggle: vi.fn(),
  };

  it('renders session titles when open', () => {
    render(<SessionSidebar {...defaultProps} />);
    expect(screen.getByText('First Chat')).toBeInTheDocument();
    expect(screen.getByText('Second Chat')).toBeInTheDocument();
  });

  it('renders new session button', () => {
    render(<SessionSidebar {...defaultProps} />);
    expect(screen.getByText('+ New')).toBeInTheDocument();
  });

  it('calls onNewSession when new button clicked', () => {
    render(<SessionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('+ New'));
    expect(defaultProps.onNewSession).toHaveBeenCalled();
  });

  it('calls onSelectSession when session clicked', () => {
    render(<SessionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Second Chat'));
    expect(defaultProps.onSelectSession).toHaveBeenCalledWith('s2');
  });

  it('marks active session', () => {
    const { container } = render(<SessionSidebar {...defaultProps} />);
    const activeItem = container.querySelector('.session-item.active');
    expect(activeItem).toBeInTheDocument();
  });

  it('shows empty state when no sessions', () => {
    render(<SessionSidebar {...defaultProps} sessions={[]} />);
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });

  it('renders toggle button', () => {
    const { container } = render(<SessionSidebar {...defaultProps} />);
    const toggle = container.querySelector('.sidebar-toggle');
    expect(toggle).toBeInTheDocument();
  });
});
