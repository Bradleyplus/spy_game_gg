
import React from 'react';
import { Room } from '../types';

interface WaitingRoomProps {
  room: Room;
  userId: string;
  onStart: () => void;
  onLeave: () => void;
  isLoading: boolean;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ room, userId, onStart, onLeave, isLoading }) => {
  const me = room.players.find(p => p.id === userId);
  const isHost = me?.isHost || false;
  const canStart = room.players.length >= 4 && room.players.length <= 7;

  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">
            Room ID: {room.id} ({room.players.length}/7)
          </h2>
          <p className="text-4xl font-mono font-black text-white tracking-widest">{room.id}</p>
        </div>
        <button 
          onClick={onLeave}
          className="px-4 py-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900/50 rounded-xl text-sm font-bold transition-all"
        >
          Leave
        </button>
      </div>

      <div className="glass-card rounded-3xl p-6 shadow-2xl mb-8">
        <h3 className="text-slate-500 text-xs font-bold uppercase mb-4 px-2">Players Joined</h3>
        <div className="space-y-3">
          {room.players.map((player) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                player.id === userId ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-800/40 border border-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl border-2 overflow-hidden ${
                  player.isHost ? 'border-amber-500' : 'border-slate-700'
                }`}>
                  <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                </div>
                <span className={`font-black uppercase tracking-tight text-sm ${player.id === userId ? 'text-indigo-200' : 'text-slate-200'}`}>
                  {player.name} {player.id === userId && '(Me)'}
                </span>
              </div>
              {player.isHost && (
                <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  Host
                </span>
              )}
            </div>
          ))}
          {room.players.length < 4 && (
            <div className="p-4 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 italic text-sm">
              Waiting for {4 - room.players.length} more...
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-6 space-y-3">
        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart || isLoading}
            className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
              canStart 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-4 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                FETCHING WORDS...
              </>
            ) : (
              'START GAME'
            )}
          </button>
        ) : (
          <div className="w-full py-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center animate-pulse">
            <span className="text-slate-400 font-bold text-sm tracking-widest">WAITING FOR HOST...</span>
          </div>
        )}
        
        {!canStart && isHost && (
          <p className="text-center text-xs font-semibold text-rose-500 uppercase tracking-wider">
            Need 4-7 players to begin
          </p>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
