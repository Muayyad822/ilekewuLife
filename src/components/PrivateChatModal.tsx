'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  getPrivateChatId,
  sendPrivateChatMessage,
  subscribePrivateChatMessages,
  uploadAudioFree,
  sendPeerInteractionToCloud,
} from '@/lib/firebase';
import { PrivateChatMessage } from '@/types/game';
import { sound } from '@/lib/audio';
import {
  X,
  Send,
  Mic,
  Square,
  Play,
  Pause,
  Volume2,
  Lock,
  Sparkles,
  Hand,
  Clock,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';

interface AudioBubbleProps {
  url: string;
  isMe: boolean;
}

const AudioBubble: React.FC<AudioBubbleProps> = ({ url, isMe }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn('Audio play error:', err));
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-1 px-1">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow transition ${
          isMe
            ? 'bg-white text-emerald-800 hover:bg-emerald-50'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {playing ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>

      <div className="flex flex-col gap-1 w-32 sm:w-44">
        <div className="flex items-center justify-between text-[10px] font-bold opacity-80">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> Voice Note
          </span>
          {playing && <span className="animate-pulse text-emerald-300">Playing...</span>}
        </div>
        <div className="w-full h-1.5 rounded-full bg-black/20 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-emerald-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const PrivateChatModal: React.FC = () => {
  const activePeer = useGameStore((s) => s.activeChatPeer);
  const closeChat = useGameStore((s) => s.closeChat);
  const authUser = useGameStore((s) => s.authUser);
  const player = useGameStore((s) => s.player);
  const sendSalaamToPeer = useGameStore((s) => s.sendSalaamToPeer);

  const [messages, setMessages] = useState<PrivateChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [sending, setSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const myUid = authUser?.uid || player.id;
  const peerUid = activePeer?.uid || '';
  const chatId = activePeer && myUid ? getPrivateChatId(myUid, peerUid) : '';

  // Subscribe to real-time messages in this private room
  useEffect(() => {
    if (!chatId || !activePeer) return;
    const unsub = subscribePrivateChatMessages(chatId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [chatId, activePeer]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRecording]);

  if (!activePeer) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!content || !chatId || !authUser) return;

    setSending(true);
    sound.playWalaahTap();

    try {
      await sendPrivateChatMessage({
        chatId,
        senderUid: myUid,
        senderName: player.name,
        recipientUid: activePeer.uid,
        recipientName: activePeer.name,
        text: content,
        createdAt: Date.now(),
      });

      // Dispatch alert to recipient HUD
      sendPeerInteractionToCloud({
        fromUid: myUid,
        fromName: player.name,
        toUid: activePeer.uid,
        type: 'chat_message',
        message: `💬 ${player.name}: "${content.length > 40 ? content.slice(0, 37) + '...' : content}"`,
        createdAt: Date.now(),
      });

      setInputText('');
    } catch (err) {
      console.warn('Failed to send text message:', err);
    } finally {
      setSending(false);
    }
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setUploadingAudio(true);
        try {
          const audioUrl = await uploadAudioFree(audioBlob);
          await sendPrivateChatMessage({
            chatId,
            senderUid: myUid,
            senderName: player.name,
            recipientUid: activePeer.uid,
            recipientName: activePeer.name,
            audioUrl,
            duration: recordDuration,
            createdAt: Date.now(),
          });

          // Dispatch alert to recipient HUD
          sendPeerInteractionToCloud({
            fromUid: myUid,
            fromName: player.name,
            toUid: activePeer.uid,
            type: 'chat_message',
            message: `🎙️ Voice note from ${player.name}`,
            createdAt: Date.now(),
          });
          sound.playTakbeer();
        } catch (err) {
          console.warn('Could not upload voice note:', err);
        } finally {
          setUploadingAudio(false);
          setRecordDuration(0);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);
      sound.playWalaahTap();
    } catch (err) {
      console.warn('Microphone access denied:', err);
      alert('Could not access microphone. Please check browser permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  };

  const cancelVoiceRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordDuration(0);
  };

  const handleSendQuickSalaam = () => {
    sendSalaamToPeer(activePeer);
    handleSendMessage('Assalamu Alaykum wa Rahmatullah! May Allah bless your studies and memory! 🤲✨');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border-2 border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[640px] overflow-hidden text-stone-100">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/80 to-stone-900 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-emerald-700 border-2 border-emerald-400 text-white font-extrabold flex items-center justify-center text-lg shadow">
              {activePeer.name.charAt(0).toUpperCase()}
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-stone-900 absolute -bottom-1 -right-1" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base leading-tight">
                  {activePeer.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold capitalize">
                  {activePeer.stage.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {activePeer.madrasahName} · Juz {activePeer.hifzJuz} · {activePeer.ilm}% Ilm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/20">
              <Lock className="w-3 h-3" /> Private Chat
            </span>
            <button
              onClick={closeChat}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auth check banner */}
        {!authUser && (
          <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You are browsing as a guest. Sign in to send private encrypted text and voice messages.</span>
          </div>
        )}

        {/* Message history */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-950/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-xs space-y-1">
                <p className="font-extrabold text-sm text-white">Private Madrasah Exchange</p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Start a private conversation with {activePeer.name}. Send a warm greeting, study revision question, or voice note.
                </p>
              </div>

              {authUser && (
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    onClick={handleSendQuickSalaam}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition"
                  >
                    <Hand className="w-3.5 h-3.5" /> Send Salaam & Dua
                  </button>
                  <button
                    onClick={() => handleSendMessage('Kaaro o! How is your Hifz revision going today? 📖')}
                    className="py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-white/10 cursor-pointer transition"
                  >
                    📖 Ask about Hifz
                  </button>
                  <button
                    onClick={() => handleSendMessage('Are you ready for our Nahw duel? ⚔️')}
                    className="py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-white/10 cursor-pointer transition"
                  >
                    ⚔️ Duel Challenge
                  </button>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderUid === myUid;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-md ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-stone-800 border border-white/10 text-stone-100 rounded-bl-none'
                    }`}
                  >
                    {msg.text && (
                      <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                        {msg.text}
                      </p>
                    )}
                    {msg.audioUrl && (
                      <AudioBubble url={msg.audioUrl} isMe={isMe} />
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-1 text-[10px] text-stone-400">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-400 ml-0.5" />}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick action chips (when messages exist) */}
        {authUser && messages.length > 0 && !isRecording && (
          <div className="px-4 py-2 border-t border-white/5 bg-stone-900/90 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={handleSendQuickSalaam}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Hand className="w-3 h-3" /> Salaam & Dua
            </button>
            <button
              onClick={() => handleSendMessage('Barakallahu feek! Keep up the great revision! 📿')}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-white/10 cursor-pointer transition"
            >
              📿 Send Barakah
            </button>
            <button
              onClick={() => handleSendMessage('Check your noticeboard for a game challenge! 🏆')}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-white/10 cursor-pointer transition"
            >
              🏆 Challenge
            </button>
          </div>
        )}

        {/* Recording active banner */}
        {isRecording && (
          <div className="px-4 py-3 bg-red-950/50 border-t border-red-500/30 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold text-red-200">
                Recording Voice Note... ({recordDuration}s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-stone-300 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition"
              >
                <Square className="w-3 h-3 fill-current" /> Stop & Send
              </button>
            </div>
          </div>
        )}

        {/* Uploading progress indicator */}
        {uploadingAudio && (
          <div className="px-4 py-2 bg-emerald-950/60 border-t border-emerald-500/20 flex items-center justify-center gap-2 text-xs text-emerald-300 font-bold">
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Sending voice broadcast to scholar...</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-stone-900 border-t border-white/10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              disabled={!authUser || isRecording || uploadingAudio}
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              title={isRecording ? 'Stop recording' : 'Record voice note'}
              className={`p-2.5 rounded-2xl flex items-center justify-center transition cursor-pointer shadow shrink-0 ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-stone-800 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!authUser || isRecording}
              placeholder={
                !authUser
                  ? 'Sign in to send messages...'
                  : isRecording
                  ? 'Recording voice note...'
                  : 'Type a private message...'
              }
              className="flex-1 bg-stone-800 border border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!authUser || !inputText.trim() || sending}
              className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md cursor-pointer transition shrink-0 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
