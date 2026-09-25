import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  Bot, 
  User, 
  Send, 
  BrainCircuit, 
  Sparkles, 
  History,
  Target,
  MessageCircle,
  Search
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AIChat = () => {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads');
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to load leads');
    }
  };

  const fetchConversations = async (leadId) => {
    try {
      const response = await api.get(`/ai/conversations/${leadId}`);
      setConversations(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const selectLead = (lead) => {
    setSelectedLead(lead);
    setMessages([]);
    setConversationId(null);
    fetchConversations(lead.id);
  };

  const loadConversation = async (convId) => {
    try {
      setConversationId(convId);
      const response = await api.get(`/ai/messages/${convId}`);
      setMessages(response.data);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedLead) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { sender_type: 'STUDENT', message_content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat', {
        leadId: selectedLead.id,
        message: userMessage,
        conversationId: conversationId
      });

      setMessages(prev => [...prev, { sender_type: 'AI', message_content: response.data.reply }]);
      setConversationId(response.data.conversationId);
      
      if (response.data.intent !== 'GENERAL') {
        toast(`Intent detected: ${response.data.intent}`, { icon: '🤖' });
      }
      
      fetchConversations(selectedLead.id);
    } catch (error) {
      toast.error('AI is having trouble responding...');
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <MainLayout title="AI Admission Assistant">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-[75vh]">
        
        {/* Lead Selector Sidebar */}
        <div className="xl:col-span-1 bg-white rounded-[2.5rem] border border-secondary/10 flex flex-col overflow-hidden shadow-sm">
          <div className="p-6 border-b border-secondary/5">
            <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search size={16} className="text-primary" /> Select Lead
            </h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search leads..." 
                className="w-full pl-4 pr-4 py-2 bg-secondary/5 rounded-xl text-xs font-bold border-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {leads.map(lead => (
              <button
                key={lead.id}
                onClick={() => selectLead(lead)}
                className={`w-full text-left p-4 rounded-2xl transition-all ${
                  selectedLead?.id === lead.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'hover:bg-secondary/5 text-secondary-900'
                }`}
              >
                <p className="text-sm font-black truncate">{lead.full_name}</p>
                <p className={`text-[10px] font-bold ${selectedLead?.id === lead.id ? 'text-white/60' : 'text-secondary/40'}`}>
                  {lead.course_interested}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-secondary/10 flex flex-col overflow-hidden shadow-sm relative">
          {!selectedLead ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 animate-pulse">
                <BrainCircuit size={40} />
              </div>
              <h2 className="text-xl font-black text-secondary-900 mb-2">Ready to Assist</h2>
              <p className="text-sm font-bold text-secondary/40 max-w-xs">Select a student from the left to start a real-time AI guided conversation.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-secondary/5 bg-secondary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
                    <Bot size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-secondary-900">AI Counselor</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-success uppercase tracking-widest">Active with {selectedLead.full_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-white rounded-lg border border-secondary/10 text-[10px] font-black text-secondary/40 uppercase tracking-widest">
                    Llama 3.3 70B
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 ${msg.sender_type === 'AI' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      msg.sender_type === 'AI' ? 'bg-primary/10 text-primary' : 'bg-secondary-900 text-white'
                    }`}>
                      {msg.sender_type === 'AI' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-bold leading-relaxed ${
                      msg.sender_type === 'AI' 
                      ? 'bg-secondary/5 text-secondary-900 rounded-tl-none' 
                      : 'bg-primary text-white rounded-tr-none shadow-md'
                    }`}>
                      {msg.message_content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="bg-secondary/5 p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-secondary/20 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-secondary/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-secondary/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-6 border-t border-secondary/5 bg-white">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Ask AI about admission, fees, or hostel..."
                    className="w-full pl-6 pr-16 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim()}
                    className="absolute right-2 p-3 bg-primary text-white rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-[2.5rem] border border-secondary/10 p-6 shadow-sm">
            <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target size={16} className="text-accent" /> AI Insights
            </h3>
            {selectedLead && conversations.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2">Detected Intent</p>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    conversations[0].detected_intent === 'INTERESTED' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                  }`}>
                    {conversations[0].detected_intent || 'Analyzing...'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2">Current Sentiment</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-secondary-900">
                    <Sparkles size={16} className="text-warning" /> Positive Engagement
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-secondary/30 italic">Start chatting to see AI insights.</p>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-secondary/10 p-6 flex-1 shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History size={16} className="text-primary" /> Past Sessions
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    conversationId === conv.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-secondary/5 hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-secondary-900">{new Date(conv.created_at).toLocaleDateString()}</p>
                    <MessageCircle size={12} className="text-secondary/20" />
                  </div>
                  <p className="text-xs font-bold text-secondary/60 line-clamp-1">{conv.summary || 'AI Conversation'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default AIChat;
