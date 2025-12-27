
import React, { useState, useMemo, useEffect } from 'react';
import { Room, GameRole, GamePhase } from '../types.ts';

interface GameRoomProps {
  room: Room;
  userId: string;
  onReset: () => void;
  onLeave: () => void;
  onCastVote: (targetId: string) => void;
  onStartVoting: () => void;
  onEndVoting: () => void;
  onNextRound: () => void;
}

const DiscussionTimer: React.FC<{ endTime: number | null }> = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!endTime) return;
    const update = () => setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 30;

  return (
    <div className="mb-8 text-center animate-in fade-in duration-500">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Time Remaining</p>
      <div className={`text-5xl font-mono font-black tracking-widest ${isUrgent ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  );
};

const GameRoom: React.FC<GameRoomProps> = ({ 
  room, userId, onReset, onLeave, onCastVote, onStartVoting, onEndVoting, onNextRound 
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const me = room.players.find(p => p.id === userId);
  const isHost = me?.isHost || false;

  const voteStats = useMemo(() => {
    const stats: Record<string, number> = {};
    room.players.forEach(p => {
      if (p.votedFor) {
        stats[p.votedFor] = (stats[p.votedFor] || 0) + 1;
      }
    });
    return stats;
  }, [room.players]);

  const eliminatedPlayer = useMemo(() => {
    return room.players.find(p => p.id === room.eliminatedPlayerId);
  }, [room.players, room.eliminatedPlayerId]);

  if (!me) return null;

  const renderDiscussion = () => (
    <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
      <DiscussionTimer endTime={room.discussionEndTime} />
      
      <div 
        onClick={() => setIsRevealed(!isRevealed)}
        className={`relative w-64 h-[26rem] transition-all duration-700 transform cursor-pointer group [preserve-style:preserve-3d] ${
          isRevealed ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 [backface-visibility:hidden] glass-card rounded-[2rem] border-4 border-indigo-500/20 shadow-2xl flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl border-4 border-white/10 overflow-hidden mb-6 shadow-xl">
             <img src={me.avatar} className="w-full h-full object-cover" alt="me" />
          </div>
          <p className="text-xl font-black text-indigo-400 tracking-widest text-center">CHECK WORD</p>
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-indigo-600 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-8 text-white">
          <h3 className="text-3xl font-black mb-8">{me.role?.toUpperCase()}</h3>
          <div className="w-full h-px bg-white/20 mb-8"></div>
          <p className="text-4xl font-black text-center">{me.word}</p>
        </div>
      </div>
      
      {isHost && (
        <button onClick={onStartVoting} className="mt-12 px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-black text-lg">GO TO VOTE</button>
      )}
    </div>
  );

  const renderVoting = () => {
    const alivePlayers = room.players.filter(p => p.isAlive);
    const hasVoted = !!me.votedFor;

    return (
      <div className="w-full max-w-md animate-in fade-in duration-500">
        <h2 className="text-center text-3xl font-black mb-8 text-indigo-400">CAST YOUR VOTE</h2>
        <div className="space-y-4">
          {alivePlayers.map(p => (
            <button
              key={p.id}
              disabled={hasVoted || !me.isAlive}
              onClick={() => onCastVote(p.id)}
              className={`w-full flex items-center justify-between p-3 rounded-3xl border-2 transition-all ${
                me.votedFor === p.id ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700" />
                <span className="font-black text-lg uppercase text-white">{p.name}</span>
              </div>
              {voteStats[p.id] > 0 && <span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-indigo-400">{voteStats[p.id]} VOTES</span>}
            </button>
          ))}
        </div>
        {isHost && <button onClick={onEndVoting} className="w-full mt-12 py-6 bg-rose-600 rounded-3xl font-black text-xl">END VOTING</button>}
      </div>
    );
  };

  const renderElimination = () => (
    <div className="flex flex-col items-center justify-center animate-in zoom-in duration-700 text-center">
      <img src={eliminatedPlayer?.avatar} className="w-32 h-32 rounded-3xl border-4 border-rose-600 mb-6 grayscale" />
      <h2 className="text-4xl font-black text-white mb-2 uppercase">{eliminatedPlayer?.name}</h2>
      <p className="text-rose-500 font-bold uppercase mb-8">Was Terminated</p>
      <p className={`text-4xl font-black uppercase ${eliminatedPlayer?.role === GameRole.SPY ? 'text-rose-500' : 'text-indigo-400'}`}>{eliminatedPlayer?.role}</p>
      {isHost && <button onClick={onNextRound} className="mt-12 px-10 py-5 bg-slate-800 rounded-2xl font-black">RESUME OPERATION</button>}
    </div>
  );

  const renderGameOver = () => (
    <div className="flex flex-col items-center text-center animate-in fade-in duration-1000">
      <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">MISSION ENDED</h1>
      <h2 className="text-2xl font-black text-white mb-10 uppercase">{room.winner === 'civilians' ? 'Loyalists Won' : 'Traitors Won'}</h2>
      {isHost ? <button onClick={onReset} className="w-full py-6 bg-indigo-600 rounded-3xl font-black text-2xl">NEXT MISSION</button> : <p className="text-slate-500 font-bold animate-pulse">Awaiting host...</p>}
    </div>
  );

  return (
    <div className="w-full max-w-md h-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-10 px-2">
        <div className="bg-indigo-600/20 px-3 py-1 rounded-full border border-indigo-500/30 text-[10px] font-black text-indigo-400">{room.id}</div>
        <button onClick={onLeave} className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Abort Mission</button>
      </div>
      <div className="flex-1 w-full flex flex-col justify-center">
        {room.phase === GamePhase.DISCUSSION && renderDiscussion()}
        {room.phase === GamePhase.VOTING && renderVoting()}
        {room.phase === GamePhase.ELIMINATION && renderElimination()}
        {room.phase === GamePhase.GAME_OVER && renderGameOver()}
      </div>
    </div>
  );
};

export default GameRoom;
