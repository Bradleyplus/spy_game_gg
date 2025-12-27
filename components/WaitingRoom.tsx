
import React from 'react';
import { Room } from '../types.ts';

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
  const canStart = room.players.length >= 3;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white">Room {room.id}</h2>
        <button onClick={onLeave} className="text-slate-500 font-bold hover:text-rose-500">Leave</button>
      </div>

      <div className="glass-card rounded-3xl p-6 shadow-2xl mb-8">
        <h3 className="text-slate-500 text-xs font-bold uppercase mb-4 px-2">Players ({room.players.length}/7)</h3>
        <div className="space-y-3">
          {room.players.map((player) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                player.id === userId ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-800/40 border border-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700">
                  <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-slate-200">
                  {player.name} {player.id === userId && '(Me)'}
                  {player.isBot && <span className="ml-2 text-xs text-indigo-400">🤖</span>}
                </span>
              </div>
              {player.isHost && <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Host</span>}
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <button
          onClick={onStart}
          disabled={!canStart || isLoading}
          className={`w-full py-5 rounded-2xl font-black text-xl transition-all ${
            canStart ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'PREPARING...' : 'START GAME'}
        </button>
      )}
    </div>
  );
};

export default WaitingRoom;
