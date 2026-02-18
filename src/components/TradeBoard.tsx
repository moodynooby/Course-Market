import { useState } from 'react';
import type { TradePost, UserProfile } from '../types';

interface TradeBoardProps {
  trades: TradePost[];
  currentUser: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: {
    isOnlineMode: boolean;
    hasNetlify: boolean;
    mode: 'online' | 'local';
  };
  onCreateUser: (displayName: string, email?: string) => void;
  onPostTrade: (tradeData: {
    courseCode: string;
    courseName: string;
    sectionOffered: string;
    sectionWanted: string;
    action: 'offer' | 'request';
    description?: string;
  }) => void;
  onUpdateStatus: (tradeId: string, status: 'pending' | 'completed' | 'cancelled') => void;
  onDeleteTrade: (tradeId: string) => void;
  onRefresh: () => void;
  onLoadSample: () => void;
}

export function TradeBoard({
  trades,
  currentUser,
  isLoading,
  error,
  connectionStatus,
  onCreateUser,
  onPostTrade,
  onUpdateStatus,
  onDeleteTrade,
  onRefresh,
  onLoadSample,
}: TradeBoardProps) {
  const [showUserForm, setShowUserForm] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [userForm, setUserForm] = useState({ displayName: '', email: '' });
  const [tradeForm, setTradeForm] = useState({
    courseCode: '',
    courseName: '',
    sectionOffered: '',
    sectionWanted: '',
    action: 'offer' as 'offer' | 'request',
    description: '',
  });
  const [filterAction, setFilterAction] = useState<'all' | 'offer' | 'request'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'pending'>('all');

  const filteredTrades = trades.filter(trade => {
    if (filterAction !== 'all' && trade.action !== filterAction) return false;
    if (filterStatus !== 'all' && trade.status !== filterStatus) return false;
    return true;
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (userForm.displayName.trim()) {
      onCreateUser(userForm.displayName, userForm.email || undefined);
      setShowUserForm(false);
      setUserForm({ displayName: '', email: '' });
    }
  };

  const handlePostTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (tradeForm.courseCode.trim() && tradeForm.sectionOffered.trim() && tradeForm.sectionWanted.trim()) {
      onPostTrade(tradeForm);
      setShowTradeForm(false);
      setTradeForm({
        courseCode: '',
        courseName: '',
        sectionOffered: '',
        sectionWanted: '',
        action: 'offer',
        description: '',
      });
    }
  };

  const canUserManage = (trade: TradePost) => 
    currentUser && trade.userId === currentUser.id;

  return (
    <div className="trade-board">
      <div className="trade-header">
        <h2>🔄 Course Trading Board</h2>
        
        <div className="connection-status">
          <span className={`status-badge ${connectionStatus.mode}`}>
            {connectionStatus.mode === 'online' ? '🌐 Online' : '💾 Local'}
          </span>
          <button onClick={onRefresh} disabled={isLoading}>
            {isLoading ? '⟳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => {}}>Dismiss</button>
        </div>
      )}

      {!currentUser && !showUserForm && (
        <div className="user-setup">
          <p>Join the trading board to post and search for course trades.</p>
          <button onClick={() => setShowUserForm(true)}>Create Profile</button>
        </div>
      )}

      {showUserForm && (
        <div className="form-modal">
          <h3>Create Your Profile</h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                value={userForm.displayName}
                onChange={(e) => setUserForm(prev => ({ ...prev, displayName: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Email (optional)</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <button type="submit">Create Profile</button>
              <button type="button" onClick={() => setShowUserForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {currentUser && (
        <div className="user-info">
          <div className="user-details">
            <strong>{currentUser.displayName}</strong>
            {currentUser.email && <span>{currentUser.email}</span>}
          </div>
          <div className="user-actions">
            <button onClick={() => setShowTradeForm(true)}>
              📝 Post Trade
            </button>
            <button onClick={onLoadSample} disabled={isLoading}>
              📊 Load Sample
            </button>
          </div>
        </div>
      )}

      {showTradeForm && (
        <div className="form-modal">
          <h3>Post a Trade</h3>
          <form onSubmit={handlePostTrade}>
            <div className="form-row">
              <div className="form-group">
                <label>Course Code *</label>
                <input
                  type="text"
                  value={tradeForm.courseCode}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, courseCode: e.target.value }))}
                  placeholder="CS 101"
                  required
                />
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input
                  type="text"
                  value={tradeForm.courseName}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, courseName: e.target.value }))}
                  placeholder="Intro to Computer Science"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Section Offering *</label>
                <input
                  type="text"
                  value={tradeForm.sectionOffered}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, sectionOffered: e.target.value }))}
                  placeholder="001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Section Wanted *</label>
                <input
                  type="text"
                  value={tradeForm.sectionWanted}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, sectionWanted: e.target.value }))}
                  placeholder="002"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Trade Type *</label>
              <select
                value={tradeForm.action}
                onChange={(e) => setTradeForm(prev => ({ ...prev, action: e.target.value as 'offer' | 'request' }))}
              >
                <option value="offer">I can offer</option>
                <option value="request">I'm looking for</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={tradeForm.description}
                onChange={(e) => setTradeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about the trade..."
                rows={3}
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" disabled={isLoading}>Post Trade</button>
              <button type="button" onClick={() => setShowTradeForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {currentUser && (
        <>
          <div className="trade-filters">
            <div className="filter-group">
              <label>Show:</label>
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value as any)}>
                <option value="all">All Trades</option>
                <option value="offer">Offers Only</option>
                <option value="request">Requests Only</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Status:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="trades-list">
            {isLoading ? (
              <div className="loading">Loading trades...</div>
            ) : filteredTrades.length === 0 ? (
              <div className="no-trades">
                <p>No trades found matching your filters.</p>
              </div>
            ) : (
              filteredTrades.map(trade => (
                <div key={trade.id} className={`trade-item ${trade.status}`}>
                  <div className="trade-header">
                    <div className="trade-type">
                      <span className={`badge ${trade.action}`}>
                        {trade.action === 'offer' ? '💡 Offer' : '🔍 Request'}
                      </span>
                      <span className={`status ${trade.status}`}>{trade.status}</span>
                    </div>
                    <div className="trade-user">
                      by {trade.userDisplayName}
                    </div>
                  </div>
                  
                  <div className="trade-content">
                    <div className="course-info">
                      <h4>{trade.courseCode}</h4>
                      {trade.courseName && <p>{trade.courseName}</p>}
                    </div>
                    
                    <div className="trade-details">
                      <div className="trade-sections">
                        {trade.action === 'offer' ? (
                          <div className="exchange">
                            <span className="offered">
                              ✅ Offering: Section {trade.sectionOffered}
                            </span>
                            <span className="wanted">
                              ↔️ For: Section {trade.sectionWanted}
                            </span>
                          </div>
                        ) : (
                          <div className="exchange">
                            <span className="wanted">
                              🔍 Looking for: Section {trade.sectionWanted}
                            </span>
                            <span className="offered">
                              ✅ Can offer: Section {trade.sectionOffered}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {trade.description && (
                        <div className="trade-description">
                          {trade.description}
                        </div>
                      )}
                    </div>
                    
                    <div className="trade-time">
                      {new Date(trade.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {canUserManage(trade) && (
                    <div className="trade-actions">
                      {trade.status === 'open' && (
                        <button 
                          onClick={() => onUpdateStatus(trade.id, 'pending')}
                          disabled={isLoading}
                        >
                          Mark Pending
                        </button>
                      )}
                      {(trade.status === 'open' || trade.status === 'pending') && (
                        <button 
                          onClick={() => onUpdateStatus(trade.id, 'completed')}
                          disabled={isLoading}
                        >
                          Complete
                        </button>
                      )}
                      <button 
                        onClick={() => onDeleteTrade(trade.id)}
                        disabled={isLoading}
                        className="danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}