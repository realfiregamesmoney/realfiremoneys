import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
    id: string;
    playerId: string;
    playerName: string;
    playerAvatar: string;
    text: string;
    timestamp: number;
}

interface UseGameChatProps {
    matchId: string | null;
    playerId: string;
    playerName: string;
    playerAvatar: string;
    isOnline: boolean;
}

export const useGameChat = ({
    matchId,
    playerId,
    playerName,
    playerAvatar,
    isOnline,
}: UseGameChatProps) => {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (!isOnline || !matchId) return;

        const channel = supabase.channel(`chat-${matchId}`, {
            config: { broadcast: { self: false } },
        });

        channel
            .on('broadcast', { event: 'chat' }, (payload) => {
                const msg = payload.payload as ChatMessage;
                if (msg.playerId !== playerId) {
                    setMessages(prev => [...prev, msg]);
                }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [matchId, playerId, isOnline]);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!text.trim()) return;
            const msg: ChatMessage = {
                id: crypto.randomUUID(),
                playerId,
                playerName,
                playerAvatar,
                text: text.trim(),
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, msg]);

            if (channelRef.current && isOnline) {
                await channelRef.current.send({
                    type: 'broadcast',
                    event: 'chat',
                    payload: msg,
                });
            }
        },
        [playerId, playerName, playerAvatar, isOnline]
    );

    return { messages, sendMessage };
};
