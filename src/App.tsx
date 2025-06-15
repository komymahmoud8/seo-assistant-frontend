import React, { useState, useEffect, useRef } from 'react';
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
  // In production (Railway), use relative URLs to the backend service
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || '';
  }
  // In development, use localhost
  return 'http://localhost:8000';
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const backendUrl = getBackendUrl();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  useEffect(() => {
    // Check backend status on load
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}/status`);
      const data = await response.json();
      setIsConnected(data.status === 'ready');
    } catch (error) {
      setIsConnected(false);
    }
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

  return (
    <div className="App">
      <header className="app-header">
        <h1>🔍 SEO Assistant</h1>
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
        </div>
      </header>

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to SEO Assistant!</h2>
              <p>Ask me anything about SEO analysis, keyword research, backlinks, or web search.</p>
              <div className="examples">
                <h3>Try asking:</h3>
                <ul>
                  <li>"Get search volume for 'AI agents'"</li>
                  <li>"Analyze backlinks for example.com"</li>
                  <li>"Find keyword ideas for coffee shop"</li>
                  <li>"Search for latest SEO trends"</li>
                </ul>
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
