import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Globe, Users, ChevronDown, Star, Trophy } from 'lucide-react';
import { UserProfile } from './Profile';
import { supabaseService, SupabaseProfile } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabase';
import { playSound } from '../utils/audio';

interface Player {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar: string;
}

interface LeaderboardProps {
  onBack: () => void;
  lang: 'en' | 'pt';
  currentScore: number;
  highScore: number;
  userProfile: UserProfile;
}

export function Leaderboard({ onBack, lang, currentScore, highScore, userProfile }: LeaderboardProps) {
  const [tab, setTab] = useState<'friends' | 'global'>('global');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      if (isSupabaseConfigured()) {
        const topPlayers = await supabaseService.getTopPlayers();
        const formattedPlayers: Player[] = topPlayers.map((p, index) => ({
          id: p.id,
          name: p.name || `Player ${p.id.substring(0, 4)}`,
          score: p.high_score,
          rank: index + 1,
          avatar: p.avatar || '👤'
        }));
        setPlayers(formattedPlayers);
      } else {
        // Fallback to mock data if not configured
        const mockPlayers: Player[] = highScore > 0 ? [
          {
            id: 'me',
            name: `${userProfile.name || (lang === 'pt' ? 'Você' : 'You')} #${userProfile.id.substring(0, 4).toUpperCase()}`,
            score: highScore,
            rank: 1,
            avatar: userProfile.avatar || '👤'
          }
        ] : [];
        setPlayers(mockPlayers);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [highScore, userProfile.id, userProfile.name, userProfile.avatar, lang]);

  const totalPlayers = players.length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] text-white flex flex-col overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden fixed z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-yellow-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
      </div>

      {/* Header */}
      <div className="p-8 pb-4 relative z-20">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => { playSound('click'); onBack(); }} onMouseEnter={() => playSound('hover')} className="text-white/70 hover:text-white hover:scale-110 transition-all bg-white/5 p-3 rounded-full backdrop-blur-md border border-white/10">
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-black tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {lang === 'pt' ? 'Placar' : 'Rank'}
            </h1>
            <div className="text-[10px] text-yellow-400/80 tracking-[0.4em] uppercase mt-1 font-bold">
              Top Players
            </div>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl mb-8 border border-white/10">
          <button 
            onClick={() => { playSound('click'); setTab('friends'); }}
            onMouseEnter={() => playSound('hover')}
            className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${tab === 'friends' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            {lang === 'pt' ? 'Amigos' : 'Friends'}
          </button>
          <button 
            onClick={() => { playSound('click'); setTab('global'); }}
            onMouseEnter={() => playSound('hover')}
            className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${tab === 'global' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            {lang === 'pt' ? 'Global' : 'Global'}
          </button>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mb-6 px-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xl overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.4)] border-2 border-white/20">
              {userProfile.avatar.startsWith('data:image') ? (
                <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userProfile.avatar || '👤'
              )}
            </div>
            <div>
              <div className="text-sm font-black tracking-widest uppercase text-white">Top 100%</div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-white/50 mt-0.5">
                {lang === 'pt' ? `De ${totalPlayers} jogador${totalPlayers !== 1 ? 'es' : ''}` : `Out of ${totalPlayers} player${totalPlayers !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-sm font-black tracking-widest uppercase text-white">{totalPlayers}</div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-white/50 mt-0.5">
                {lang === 'pt' ? 'Jogadores' : 'Players'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Globe size={20} className="text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 bg-[#0a0a0a] rounded-t-3xl overflow-hidden flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.5)] border-t border-white/10 relative z-10">
        <div className="p-4 flex justify-between items-center border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-md flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.5)]">
              <Star size={14} className="text-black" fill="currentColor" />
            </div>
            <span className="font-bold tracking-widest uppercase text-sm">Stack</span>
          </div>
          <button className="flex items-center gap-1 text-xs font-bold tracking-widest uppercase text-white/50 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            {lang === 'pt' ? 'Todos os Tempos' : 'All Time'}
            <ChevronDown size={14} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-white/50 p-8 text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-2 border-white/20 border-t-yellow-400 rounded-full mb-4 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
              />
              <p className="font-bold tracking-widest uppercase text-xs">{lang === 'pt' ? 'Carregando...' : 'Loading...'}</p>
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/50 p-8 text-center">
              <Users size={48} className="mb-4 opacity-20" />
              <p className="font-bold tracking-widest uppercase text-xs">{lang === 'pt' ? 'Nenhum jogador encontrado. Seja o primeiro!' : 'No players found. Be the first!'}</p>
            </div>
          ) : (
            <div className="p-4 space-y-3 pb-24">
              {players.map((player, index) => {
                const isTop3 = index < 3;
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;
                
                return (
                  <motion.div 
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative overflow-hidden flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                      player.id === userProfile.id 
                        ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
                        : isFirst ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/5 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)] scale-[1.02]'
                        : isSecond ? 'bg-gradient-to-r from-gray-300/20 to-gray-400/5 border-gray-300/50'
                        : isThird ? 'bg-gradient-to-r from-amber-700/20 to-amber-800/5 border-amber-700/50'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {isFirst && (
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent pointer-events-none" />
                    )}
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`flex items-center justify-center font-black text-lg w-8 ${
                        isFirst ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)] text-2xl' :
                        isSecond ? 'text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.8)] text-xl' :
                        isThird ? 'text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)] text-xl' :
                        'text-white/30 text-sm'
                      }`}>
                        #{player.rank}
                      </div>
                      
                      <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-lg border-2 ${
                        isFirst ? 'border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 
                        isSecond ? 'border-gray-300 shadow-[0_0_15px_rgba(209,213,219,0.5)]' : 
                        isThird ? 'border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.5)]' : 
                        'border-white/10'
                      }`}>
                        {player.avatar.startsWith('data:image') ? (
                          <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          player.avatar
                        )}
                      </div>
                      
                      <div>
                        <div className={`font-black tracking-wider truncate max-w-[120px] sm:max-w-[200px] ${
                          isFirst ? 'text-yellow-400 text-lg' :
                          isSecond ? 'text-gray-200 text-base' :
                          isThird ? 'text-amber-500 text-base' :
                          'text-white/90 text-sm'
                        }`}>
                          {player.name}
                          {player.id === userProfile.id && (
                            <span className="ml-2 text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest align-middle">
                              {lang === 'pt' ? 'VOCÊ' : 'YOU'}
                            </span>
                          )}
                        </div>
                        {isTop3 && (
                          <div className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mt-0.5 flex items-center gap-1">
                            {isFirst ? <span className="text-yellow-400">Champion</span> : 
                             isSecond ? <span className="text-gray-300">Runner Up</span> : 
                             <span className="text-amber-600">Bronze</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right relative z-10">
                      <div className={`font-black tracking-widest ${
                        isFirst ? 'text-2xl text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                        isSecond ? 'text-xl text-gray-200' :
                        isThird ? 'text-xl text-amber-500' :
                        'text-lg text-white'
                      }`}>
                        {player.score}
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">
                        {lang === 'pt' ? 'Pontos' : 'Points'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
