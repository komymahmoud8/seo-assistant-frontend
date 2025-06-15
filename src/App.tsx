import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StreamEvent {
  type: 'status' | 'text_delta' | 'tool_start' | 'tool_complete' | 'final' | 'done' | 'error';
  content?: string;
  message?: string;
  tool_name?: string;
  trace_id?: string;
}

// Get backend URL from environment or use default
const getBackendUrl = () => {
  // Use environment variable if set, otherwise use localhost for development
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const backendUrl = getBackendUrl();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const checkBackendStatus = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/status`);
      const data = await response.json();
      setIsConnected(data.status === 'ready');
    } catch (error) {
      setIsConnected(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    // Check if user is already authenticated (stored in localStorage)
    const authStatus = localStorage.getItem('seo-assistant-auth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
      // Check backend status on load only if authenticated
      checkBackendStatus();
    }
  }, [checkBackendStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: loginUsername, 
          password: loginPassword 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('seo-assistant-auth', 'authenticated');
        setLoginUsername('');
        setLoginPassword('');
        checkBackendStatus();
      } else {
        setLoginError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      setLoginError('Connection error. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('seo-assistant-auth');
    setMessages([]);
    setCurrentResponse('');
    setIsConnected(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentResponse('');

    try {
      const response = await fetch(`${backendUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData: StreamEvent = JSON.parse(line.slice(6));
              
              switch (eventData.type) {
                case 'status':
                  setCurrentResponse(`🔍 ${eventData.message}`);
                  break;
                case 'text_delta':
                  setCurrentResponse(eventData.content || '');
                  break;
                case 'tool_start':
                  setCurrentResponse(prev => `${prev}\n\n🔧 Using tool: ${eventData.tool_name}...`);
                  break;
                case 'tool_complete':
                  setCurrentResponse(prev => `${prev}\n✅ Tool completed`);
                  break;
                case 'final':
                  const assistantMessage: Message = {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: eventData.content || '',
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, assistantMessage]);
                  setCurrentResponse('');
                  break;
                case 'done':
                  setIsLoading(false);
                  break;
                case 'error':
                  const errorMessage: Message = {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: `❌ Error: ${eventData.message}`,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, errorMessage]);
                  setCurrentResponse('');
                  setIsLoading(false);
                  break;
              }
            } catch (e) {
              console.error('Error parsing event data:', e);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `❌ Connection error: ${error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      setCurrentResponse('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    try {
      await fetch(`${backendUrl}/chat/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setMessages([]);
      setCurrentResponse('');
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login-box">
            <h1>🔍 Mamba's SEO AI Agent</h1>
            <h2>🔐 Login Required</h2>
            <p>Please enter your credentials to access Mamba's SEO AI agent</p>
            
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                />
              </div>
              
              {loginError && (
                <div className="error-message">
                  ❌ {loginError}
                </div>
              )}
              
              <button type="submit" className="login-button">
                🚀 Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>🔍 Mamba's SEO AI Agent</h1>
        <div className="header-controls">
          <div className="status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="clear-button" title="Clear conversation history">
              🗑️ Clear
            </button>
          )}
          <button onClick={handleLogout} className="logout-button" title="Logout">
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to Mamba's SEO AI Agent!</h2>
              <p>Ask me anything about SEO - I have full access to DataForSEO!</p>
              <div className="examples">
                <h3>Try asking:</h3>
                <div className="example-buttons">
                  <button 
                    className="example-button" 
                    onClick={() => setInput("Get all analysis for the keyword 'Diving in Utila'")}
                  >
                    <span className="example-icon">📊</span>
                    Get all analysis for the keyword 'Diving in Utila'
                  </button>
                  <button 
                    className="example-button" 
                    onClick={() => setInput("Do a full technical SEO audit for utiladivecenter.com")}
                  >
                    <span className="example-icon">🔗</span>
                    Do a full on-page SEO audit for utiladivecenter.com
                  </button>
                  <button 
                    className="example-button" 
                    onClick={() => setInput("Find keyword ideas for Real Estate in Dubai")}
                  >
                    <span className="example-icon">💡</span>
                    Find keyword ideas for Real Estate in Dubai
                  </button>

                  <button 
                    className="example-button" 
                    onClick={() => setInput("Analyze this website and find the top non-branded keywords and my rankings: mamba.agency")}
                  >
                    <span className="example-icon">📈</span>
                    Analyze this website and find the top performing pages. url: 
                  </button>

                  <button 
                    className="example-button" 
                    onClick={() => setInput("Based on my website performance, find the top 3 pages to improve: gulflandproperty.com")}
                  >
                    <span className="example-icon">🎯</span>
                    Based on my website performance, find the top 3 pages to improve. url: 
                  </button>

                  <button 
                    className="example-button" 
                    onClick={() => setInput("Find my top 3 competitors, their strategy and what I should do: utiladivecenter.com")}
                  >
                    <span className="example-icon">🏆</span>
                    Find my top 3 competitors, their strategy and what I should do. My url: 
                  </button>

                  <button 
                    className="example-button" 
                    onClick={() => setInput("Do a full Content Analysis for my website: gulflandproperty.com")}
                  >
                    <span className="example-icon">📝</span>
                    Do a full Content Analysis for my website: 
                  </button>

                  <button 
                    className="example-button" 
                    onClick={() => setInput("Search for latest SEO trends")}
                  >
                    <span className="example-icon">🔍</span>
                    Search for latest SEO trends
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                <div className="message-text">
                  {message.type === 'assistant' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {currentResponse && (
            <div className="message assistant streaming">
              <div className="message-content">
                <div className="message-text">
                  <ReactMarkdown>{currentResponse}</ReactMarkdown>
                </div>
                <div className="typing-indicator">●●●</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about SEO..."
            disabled={isLoading || !isConnected}
            rows={3}
          />
          <button 
            onClick={sendMessage} 
            disabled={isLoading || !isConnected || !input.trim()}
            className="send-button"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
