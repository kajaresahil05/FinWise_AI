import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import SidebarLayout from '../components/SidebarLayout';
import { 
  Sparkles, 
  Send, 
  Plus, 
  Trash2, 
  Bot, 
  User as UserIcon,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const AICoachPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all chat threads on load
  const fetchConversations = async () => {
    try {
      const response = await api.get('/ai/conversations');
      setConversations(response.data);
    } catch (err: any) {
      console.error('Failed to fetch chat history:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when active chat thread changes
  useEffect(() => {
    if (activeConversationId) {
      const fetchMessages = async () => {
        try {
          setHistoryLoading(true);
          setError(null);
          const response = await api.get(`/ai/conversations/${activeConversationId}/messages`);
          setMessages(response.data);
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to load message log.');
        } finally {
          setHistoryLoading(false);
        }
      };
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Scroll chat area to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setError(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation thread permanently?')) return;
    
    try {
      await api.delete(`/ai/conversations/${id}`);
      setConversations(conversations.filter(c => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err: any) {
      alert('Failed to delete chat thread.');
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Append temporary user message to UI immediately for responsive feel
    const tempUserMsg: Message = {
      id: Date.now(),
      conversation_id: activeConversationId || 0,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const payload: any = { message: textToSend };
      if (activeConversationId) {
        payload.conversation_id = activeConversationId;
      }

      const response = await api.post('/ai/chat', payload);
      
      // If a new chat was created, save the ID and refetch list
      if (!activeConversationId) {
        setActiveConversationId(response.data.conversation_id);
        fetchConversations();
      } else {
        // Fetch message logs to align timestamps and ids correctly
        const logRes = await api.get(`/ai/conversations/${activeConversationId}/messages`);
        setMessages(logRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate financial suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // Helper function to format basic bold and bullet lists without external modules
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      let cleanLine = line;
      if (isBullet) {
        cleanLine = line.trim().replace(/^[-*]\s+/, '');
      }

      const parts = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-bold text-white">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 my-0.5">
            {parts}
          </li>
        );
      }

      return (
        <p key={idx} className="text-slate-300 min-h-[1.2rem] my-1 leading-relaxed text-xs sm:text-sm">
          {parts}
        </p>
      );
    });
  };

  const SUGGESTED_PROMPTS = [
    {
      title: "Improve Savings",
      desc: "How can I save ₹5,000 this month?",
      icon: TrendingUp,
      prompt: "How can I save ₹5,000 this month using my active budgets?"
    },
    {
      title: "Analyze Overspending",
      desc: "Where am I overspending?",
      icon: AlertCircle,
      prompt: "Where am I overspending? Show me exceeded budgets or category spikes."
    },
    {
      title: "Affordability Check",
      desc: "Can I buy a phone worth ₹50,000?",
      icon: ShieldCheck,
      prompt: "Can I afford to buy a phone worth ₹50000 based on my monthly income and savings?"
    },
    {
      title: "Explain SIPs",
      desc: "What is an index fund and SIP?",
      icon: HelpCircle,
      prompt: "Explain SIP and Index Funds in simple beginner-friendly language."
    }
  ];

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
        
        {/* Chat History Sidebar */}
        <div className="w-full md:w-80 flex flex-col glass-card border border-white/5 rounded-2xl overflow-hidden shrink-0">
          <div className="p-4 border-b border-white/5 flex gap-2">
            <button
              onClick={handleNewChat}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">Past Conversations</h4>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No chats recorded.</div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                    activeConversationId === c.id 
                      ? 'bg-brand-500/10 border-brand-500/20 text-white' 
                      : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <MessageSquare className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="text-xs font-medium truncate">{c.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Thread"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Main Window */}
        <div className="flex-1 flex flex-col glass-card border border-white/5 rounded-2xl overflow-hidden relative">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3.5 bg-white/2">
            <div className="p-2 bg-brand-500/10 rounded-xl">
              <Bot className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">FinWise AI Financial Coach</h3>
              <p className="text-[10px] text-slate-500 font-medium">Context-Aware AI Guidance</p>
            </div>
            <span className="ml-auto text-[10px] text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2.5 py-0.5 rounded-full font-bold">
              Active Advisor
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {historyLoading ? (
              <div className="h-full flex flex-col justify-center items-center gap-3.5">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-slate-400 text-xs font-medium">Retrieving chat log...</span>
              </div>
            ) : messages.length === 0 ? (
              /* Welcome Page */
              <div className="h-full flex flex-col justify-center items-center py-10 max-w-xl mx-auto space-y-8">
                <div className="text-center space-y-3">
                  <div className="inline-flex p-4 bg-brand-500/10 rounded-3xl border border-brand-500/20 text-brand-400 mb-2">
                    <Sparkles className="w-8 h-8 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">Ask your AI Financial Coach</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Get answers about your budget metrics, goal counts, and financial summaries. 
                    Ask questions using natural voice templates or quick suggestions.
                  </p>
                </div>

                {/* Suggestions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="glass-card p-4 rounded-xl border border-white/5 hover:border-brand-500/20 hover:bg-brand-500/5 cursor-pointer text-left transition-all"
                    >
                      <div className="flex items-center gap-2 text-brand-400 mb-1">
                        <item.icon className="w-4 h-4" />
                        <span className="text-xs font-bold">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Bubbles */
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role !== 'user' && (
                      <div className="p-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg text-brand-400 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-none'
                          : 'glass-panel border border-white/10 text-slate-300 rounded-tl-none'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="space-y-1">
                          {renderFormattedText(msg.content)}
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-start gap-3.5 justify-start">
                    <div className="p-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg text-brand-400 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="glass-panel border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Form input */}
          <div className="p-4 border-t border-white/5 bg-white/1">
            <form onSubmit={handleSubmit} className="flex gap-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask coaching questions (e.g. Can I afford ₹5000 index fund SIP?)..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl glass-input text-white text-xs sm:text-sm focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold p-3 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </SidebarLayout>
  );
};

export default AICoachPage;
