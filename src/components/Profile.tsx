import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, Camera, Image as ImageIcon, Clock, Save, Share2, X, Shield } from 'lucide-react';
import { playSound } from '../utils/audio';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  hoursPlayed: number[]; // e.g., last 7 days
  savedPhotos: string[];
}

interface ProfileProps {
  onBack: () => void;
  lang: 'en' | 'pt';
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export function Profile({ onBack, lang, profile, onUpdateProfile }: ProfileProps) {
  const [name, setName] = useState(profile.name);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSaveName = () => {
    onUpdateProfile({ ...profile, name });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateProfile({ ...profile, avatar: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async (photoDataUrl: string) => {
    try {
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'stack-score.jpg', { type: 'image/jpeg' });
      
      if (navigator.share) {
        await navigator.share({
          title: 'Stack Game',
          text: lang === 'pt' ? 'Olha meu recorde no Stack!' : 'Check out my score on Stack!',
          files: [file]
        });
      } else {
        // Fallback: download the image
        const link = document.createElement('a');
        link.href = photoDataUrl;
        link.download = 'stack-score.jpg';
        link.click();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] text-white flex flex-col overflow-y-auto hide-scrollbar"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden fixed">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
      </div>

      {/* Header */}
      <div className="p-8 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <button onClick={() => { playSound('click'); onBack(); }} onMouseEnter={() => playSound('hover')} className="text-white/70 hover:text-white hover:scale-110 transition-all bg-white/5 p-3 rounded-full backdrop-blur-md border border-white/10">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            {lang === 'pt' ? 'Perfil' : 'Profile'}
          </h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="p-6 flex flex-col items-center gap-8 relative z-10 max-w-2xl mx-auto w-full pb-24">
        
        {/* Avatar Section */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative group mt-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <div className="w-40 h-40 rounded-full overflow-hidden bg-black/50 border-4 border-white/10 flex items-center justify-center text-5xl relative z-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl group-hover:border-white/30 transition-all">
            {profile.avatar.startsWith('data:image') ? (
              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile.avatar || <User size={64} className="text-white/30" />
            )}
            <div className="absolute inset-0 ring-inset ring-2 ring-white/20 rounded-full pointer-events-none" />
          </div>
          <button 
            onClick={() => { playSound('click'); fileInputRef.current?.click(); }}
            onMouseEnter={() => playSound('hover')}
            className="absolute bottom-2 right-2 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] z-20"
          >
            <Camera size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </motion.div>

        {/* Info Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full space-y-4"
        >
          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-between">
            <div>
              <div className="text-xs text-white/50 uppercase tracking-[0.2em] mb-1 font-bold">ID</div>
              <div className="font-mono text-xl text-purple-400 font-black tracking-wider">{profile.id}</div>
            </div>
            <Shield size={32} className="text-white/10" />
          </div>

          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-white/50 uppercase tracking-[0.2em] mb-2 font-bold">
                {lang === 'pt' ? 'Nome de Jogador' : 'Player Name'}
              </div>
              <input 
                type="text" 
                value={name}
                onChange={handleNameChange}
                onBlur={handleSaveName}
                className="w-full bg-transparent text-2xl font-black tracking-wider outline-none placeholder-white/20"
                placeholder={lang === 'pt' ? 'Seu Nome' : 'Your Name'}
              />
            </div>
            {name !== profile.name && (
              <button 
                onClick={() => { playSound('click'); handleSaveName(); }} 
                onMouseEnter={() => playSound('hover')}
                className="bg-white text-black p-4 rounded-2xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Save size={24} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Cinematic Chart */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        >
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase mb-8 flex items-center gap-3 text-white/70">
            <Clock size={20} className="text-purple-400" />
            {lang === 'pt' ? 'Tempo de Jogo (7 Dias)' : 'Playtime (7 Days)'}
          </h2>
          <div className="h-48 flex items-end justify-between gap-3">
            {profile.hoursPlayed.map((hours, index) => {
              const maxHours = 10;
              const heightPercent = Math.min((hours / maxHours) * 100, 100);
              const intensity = Math.min(hours / 5, 1);
              const r = Math.floor(255);
              const g = Math.floor(255 * (1 - intensity));
              const b = Math.floor(255 * (1 - intensity));
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full h-full flex items-end justify-center relative group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ duration: 1.5, delay: index * 0.1, type: 'spring', bounce: 0.4 }}
                      className="w-full rounded-t-lg relative overflow-hidden"
                      style={{ backgroundColor: `rgb(${r}, ${g}, ${b})`, opacity: 0.8 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </motion.div>
                    {/* Tooltip */}
                    <div className="absolute -top-10 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                      {hours.toFixed(1)}h
                    </div>
                  </div>
                  <div className="text-xs text-white/40 font-bold tracking-widest">
                    D{index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Saved Photos */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full"
        >
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase mb-6 flex items-center gap-3 text-white/70 ml-2">
            <ImageIcon size={20} className="text-blue-400" />
            {lang === 'pt' ? 'Fotos Salvas' : 'Saved Photos'}
          </h2>
          {profile.savedPhotos.length === 0 ? (
            <div className="bg-black/40 backdrop-blur-xl p-12 rounded-3xl border border-white/10 border-dashed text-center flex flex-col items-center gap-4">
              <ImageIcon size={48} className="text-white/20" />
              <div className="text-white/40 text-sm font-bold tracking-widest uppercase">
                {lang === 'pt' ? 'Nenhuma foto salva ainda.' : 'No saved photos yet.'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {profile.savedPhotos.map((photo, i) => (
                <motion.div 
                  key={i} 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-black cursor-pointer relative group shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                  onClick={() => { playSound('click'); setSelectedPhoto(photo); }}
                  onMouseEnter={() => playSound('hover')}
                >
                  <img src={photo} alt="Saved" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      <Share2 size={24} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4"
            onClick={() => { playSound('click'); setSelectedPhoto(null); }}
          >
            <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-10">
              <button 
                className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all backdrop-blur-md border border-white/10"
                onClick={() => { playSound('click'); setSelectedPhoto(null); }}
                onMouseEnter={() => playSound('hover')}
              >
                <X size={24} />
              </button>
              <button
                className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                onClick={(e) => {
                  playSound('click');
                  e.stopPropagation();
                  handleShare(selectedPhoto);
                }}
                onMouseEnter={() => playSound('hover')}
              >
                <Share2 size={20} />
                {lang === 'pt' ? 'Compartilhar' : 'Share'}
              </button>
            </div>
            
            <motion.img 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src={selectedPhoto} 
              alt="Enlarged" 
              className="max-w-full max-h-[75vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
