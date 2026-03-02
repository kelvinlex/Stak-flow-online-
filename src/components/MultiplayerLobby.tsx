import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, Bot, Copy, Check, Play, Shield, Swords } from 'lucide-react';
import { UserProfile } from './Profile';
import { playSound } from '../utils/audio';

interface MultiplayerLobbyProps {
  onBack: () => void;
  lang: 'en' | 'pt';
  profile: UserProfile;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onPlayBot: () => void;
  onStartMatch?: () => void;
  roomId: string | null;
  opponent: UserProfile | null;
  isWaiting: boolean;
  isHost?: boolean;
}

export function MultiplayerLobby({ 
  onBack, lang, profile, onCreateRoom, onJoinRoom, onPlayBot, onStartMatch, roomId, opponent, isWaiting, isHost 
}: MultiplayerLobbyProps) {
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] text-white flex flex-col overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
      </div>

      {/* Header */}
      <div className="p-8 flex items-center justify-between relative z-10">
        <button onClick={() => { playSound('click'); onBack(); }} onMouseEnter={() => playSound('hover')} className="text-white/70 hover:text-white hover:scale-110 transition-all bg-white/5 p-3 rounded-full backdrop-blur-md border border-white/10">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            {lang === 'pt' ? 'Arena' : 'Arena'}
          </h1>
          <div className="text-[10px] text-white/50 tracking-[0.4em] uppercase mt-1 font-bold">
            {lang === 'pt' ? 'Multijogador' : 'Multiplayer'}
          </div>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-12 max-w-5xl mx-auto w-full relative z-10">
        
        {/* Versus Area */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full">
          
          {/* Player Card */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative flex flex-col items-center gap-4 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] min-w-[240px]">
              <div className="absolute top-4 left-4 text-white/30">
                <Shield size={20} />
              </div>
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-purple-900/20 border-4 border-purple-500/50 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(168,85,247,0.3)] relative">
                {profile.avatar.startsWith('data:image') ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.avatar || '👤'
                )}
                <div className="absolute inset-0 ring-inset ring-2 ring-white/20 rounded-full" />
              </div>
              <div className="flex flex-col items-center">
                <div className="font-black text-2xl tracking-wider">{profile.name || 'Player'}</div>
                <div className="text-xs text-purple-400 font-bold tracking-widest uppercase mt-1">P1 / Host</div>
              </div>
            </div>
          </motion.div>

          {/* VS Badge */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative z-20 flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.5)] border-4 border-black relative">
              <Swords size={32} className="text-white drop-shadow-md" />
            </div>
          </motion.div>

          {/* Opponent Card */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative flex flex-col items-center gap-4 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] min-w-[240px] min-h-[280px] justify-center">
              <div className="absolute top-4 right-4 text-white/30">
                <Shield size={20} />
              </div>
              
              {opponent ? (
                <div className="flex flex-col items-center gap-6">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-900/20 border-4 border-blue-500/50 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(59,130,246,0.3)] relative"
                  >
                    {opponent.avatar.startsWith('data:image') ? (
                      <img src={opponent.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      opponent.avatar || '👤'
                    )}
                    <div className="absolute inset-0 ring-inset ring-2 ring-white/20 rounded-full" />
                  </motion.div>
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className="font-black text-2xl tracking-wider">{opponent.name || 'Opponent'}</div>
                    <div className="text-xs text-blue-400 font-bold tracking-widest uppercase mt-1">P2 / Challenger</div>
                  </motion.div>
                </div>
              ) : isWaiting ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-32 h-32 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
                    />
                    <Users size={40} className="text-white/30" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-white/70 font-bold tracking-[0.2em] uppercase">
                      {lang === 'pt' ? 'Procurando...' : 'Searching...'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 opacity-50">
                  <div className="w-32 h-32 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center">
                    <Users size={40} className="text-white/20" />
                  </div>
                  <div className="text-sm text-white/30 font-bold tracking-[0.2em] uppercase">
                    {lang === 'pt' ? 'Vazio' : 'Empty'}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Actions Area */}
        <div className="w-full max-w-md mt-4">
          <AnimatePresence mode="wait">
            {!isWaiting && !opponent ? (
              <motion.div 
                key="actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <button 
                  onClick={() => { playSound('click'); onCreateRoom(); }}
                  onMouseEnter={() => playSound('hover')}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <Play size={20} fill="currentColor" />
                  {lang === 'pt' ? 'Criar Sala' : 'Create Room'}
                </button>

                <div className="relative flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder={lang === 'pt' ? 'Código da Sala' : 'Room Code'}
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center font-mono text-xl tracking-widest uppercase focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
                  />
                  <button 
                    onClick={() => { playSound('click'); if(joinId) onJoinRoom(joinId); }}
                    onMouseEnter={() => playSound('hover')}
                    disabled={!joinId}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 rounded-xl font-bold tracking-widest uppercase transition-all flex items-center justify-center"
                  >
                    {lang === 'pt' ? 'Entrar' : 'Join'}
                  </button>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-white/30 text-xs font-bold tracking-widest uppercase">OU</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <button 
                  onClick={() => { playSound('click'); onPlayBot(); }}
                  onMouseEnter={() => playSound('hover')}
                  className="w-full py-5 bg-transparent border-2 border-white/20 text-white rounded-2xl font-bold tracking-[0.2em] uppercase transition-all hover:bg-white/5 hover:border-white/40 flex items-center justify-center gap-3"
                >
                  <Bot size={20} />
                  {lang === 'pt' ? 'Jogar contra Bot' : 'Play vs Bot'}
                </button>
              </motion.div>
            ) : roomId && !opponent ? (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                
                <h3 className="text-white/50 text-sm font-bold tracking-[0.3em] uppercase mb-4">
                  {lang === 'pt' ? 'Código da sua sala' : 'Your Room Code'}
                </h3>
                
                <div 
                  onClick={() => { playSound('click'); handleCopy(); }}
                  onMouseEnter={() => playSound('hover')}
                  className="bg-black/50 border border-white/10 rounded-2xl p-6 flex items-center justify-between cursor-pointer hover:bg-black/70 transition-colors group mb-6"
                >
                  <span className="font-mono text-4xl tracking-[0.2em] text-white font-black">{roomId}</span>
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    {copied ? <Check size={24} className="text-green-400" /> : <Copy size={24} className="text-white/70" />}
                  </div>
                </div>
                
                <p className="text-white/40 text-sm">
                  {lang === 'pt' 
                    ? 'Compartilhe este código com seu amigo para ele entrar.' 
                    : 'Share this code with your friend to join.'}
                </p>
              </motion.div>
            ) : roomId && opponent ? (
              <motion.div 
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {isHost ? (
                  <motion.button 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', bounce: 0.6 }}
                    onClick={() => { playSound('click'); onStartMatch?.(); }}
                    onMouseEnter={() => playSound('hover')}
                    className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:scale-[1.02] flex items-center justify-center gap-3 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Play size={24} fill="currentColor" className="relative z-10" />
                    <span className="relative z-10">{lang === 'pt' ? 'Iniciar Partida' : 'Start Match'}</span>
                  </motion.button>
                ) : (
                  <div className="w-full py-5 bg-white/5 border border-white/10 text-white/50 rounded-2xl font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 rounded-full border-2 border-t-white/50 border-r-transparent border-b-transparent border-l-transparent"
                    />
                    {lang === 'pt' ? 'Aguardando Host...' : 'Waiting for Host...'}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
