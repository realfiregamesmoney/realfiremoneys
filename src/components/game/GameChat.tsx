import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Smile, Zap } from 'lucide-react';
import { ChatMessage } from '@/hooks/useGameChat';
import { SFX } from '@/lib/sounds';

const QUICK_MESSAGES = [
  'Boa sorte! 🍀', 'Boa jogada! 👏', 'Bora jogar! 🎮', 'É sua vez! ⏳',
  'Joga muito bem! 🔥', 'Vamos jogar! 💪', 'Oi! 👋', 'Tudo bem? 😊',
  'Prazer jogar com você! 🤝', 'O tempo tá passando! ⏰', 'Obrigado(a)! 🙏',
  'Foi mal! 😅', 'Valeu! ✌️', 'Parabéns! 🎉', 'Bora começar? 🚀',
  'Bom trabalho! 💯', 'Erro meu! 🤦', 'Boa tentativa! 👍',
];

const EMOJIS = [
  '😀','😁','😂','🤣','😃','😄','😅','😆','😇','😈',
  '😉','😊','😋','😌','😍','😎','😏','😐','😑','😒',
  '🙂','🤗','🤔','🤐','😯','😲','😳','🥺','😢','😭',
  '😤','😠','🤯','😱','😨','😰','😥','🤤','😴','🥱',
  '🤑','🤠','😷','🤒','🤕','🤢','🤮','🥴','🥳','🤩',
  '👍','👎','👏','🙌','🤝','✌️','🤞','🤟','🤘','👌',
  '💪','🙏','👋','🤚','✋','🖐️','🖖','👊','✊','🤛',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💖',
  '⭐','🌟','✨','💫','🔥','💥','💯','🎯','🏆','🥇',
  '🎮','🎲','♟️','🃏','🎰','🎪','🎭','🎨','🎵','🎶',
];

interface GameChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  currentPlayerId: string;
  isOnline: boolean;
}

const GameChat = ({ messages, onSend, currentPlayerId, isOnline }: GameChatProps) => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [tab, setTab] = useState<'chat' | 'quick' | 'emoji'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.playerId !== currentPlayerId) {
        setUnread(prev => prev + 1);
        SFX.chatNotification();
      }
    }
  }, [messages, open, currentPlayerId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }
  }, [open, messages]);

  const handleQuickSend = (text: string) => {
    onSend(text);
  };

  if (!isOnline) return null;

  return (
    <>
      <button onClick={() => setOpen(!open)} className="game-chat-toggle">
        <MessageCircle size={18} />
        {unread > 0 && <span className="game-chat-badge">{unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="game-chat-panel"
          >
            <div className="game-chat-header">
              <span>💬 Chat</span>
              <button onClick={() => setOpen(false)}><X size={14} /></button>
            </div>

            {/* Tabs */}
            <div className="game-chat-tabs">
              <button className={`game-chat-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
                <MessageCircle size={12} /> Chat
              </button>
              <button className={`game-chat-tab ${tab === 'quick' ? 'active' : ''}`} onClick={() => setTab('quick')}>
                <Zap size={12} /> Rápidas
              </button>
              <button className={`game-chat-tab ${tab === 'emoji' ? 'active' : ''}`} onClick={() => setTab('emoji')}>
                <Smile size={12} /> Emojis
              </button>
            </div>

            {/* Chat tab - message history only, no input */}
            {tab === 'chat' && (
              <div ref={scrollRef} className="game-chat-messages">
                {messages.length === 0 && (
                  <div className="game-chat-empty">Nenhuma mensagem ainda...</div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`game-chat-msg ${msg.playerId === currentPlayerId ? 'own' : 'other'}`}>
                    <span className="game-chat-msg-avatar">{msg.playerAvatar}</span>
                    <div className="game-chat-msg-bubble">
                      <span className="game-chat-msg-name">{msg.playerName}</span>
                      <span className="game-chat-msg-text">{msg.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick messages tab */}
            {tab === 'quick' && (
              <div className="game-chat-quick-grid">
                {QUICK_MESSAGES.map((msg) => (
                  <button key={msg} className="game-chat-quick-btn" onClick={() => handleQuickSend(msg)}>
                    {msg}
                  </button>
                ))}
              </div>
            )}

            {/* Emoji tab */}
            {tab === 'emoji' && (
              <div className="game-chat-emoji-grid">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} className="game-chat-emoji-btn" onClick={() => handleQuickSend(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GameChat;
