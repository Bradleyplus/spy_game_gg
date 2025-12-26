
import React, { useState, useMemo, useEffect } from 'react';
import { Room, GameRole, GamePhase } from '../types';

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

  // Phase: DISCUSSION
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
          <p className="text-slate-500 text-[10px] mt-2 uppercase font-bold tracking-widest opacity-50">Private Viewing</p>
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-indigo-600 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-8 text-white">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.4em] mb-4">You are</p>
          <h3 className="text-3xl font-black mb-8">{me.role?.toUpperCase()}</h3>
          <div className="w-full h-px bg-white/20 mb-8"></div>
          <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.4em] mb-2">Word</p>
          <p className="text-4xl font-black text-center">{me.word}</p>
        </div>
      </div>
      
      {isHost && (
        <button 
          onClick={onStartVoting}
          className="mt-12 px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 active:scale-95 rounded-2xl font-black text-lg shadow-xl transition-all"
        >
          GO TO VOTE
        </button>
      )}
    </div>
  );

  // Phase: VOTING
  const renderVoting = () => {
    const alivePlayers = room.players.filter(p => p.isAlive);
    const hasVoted = !!me.votedFor;

    return (
      <div className="w-full max-w-md animate-in fade-in duration-500">
        <h2 className="text-center text-3xl font-black mb-2 text-indigo-400">CAST YOUR VOTE</h2>
        <p className="text-center text-slate-500 text-sm mb-8 uppercase font-bold tracking-widest">Identify the Spy</p>
        
        <div className="space-y-4">
          {alivePlayers.map(p => (
            <button
              key={p.id}
              disabled={hasVoted || !me.isAlive}
              onClick={() => onCastVote(p.id)}
              className={`w-full group relative overflow-hidden flex items-center justify-between p-3 rounded-3xl border-2 transition-all ${
                me.votedFor === p.id 
                  ? 'bg-indigo-600 border-indigo-400' 
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
              } ${!me.isAlive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden transition-colors ${
                   me.votedFor === p.id ? 'border-indigo-400' : 'border-slate-700'
                }`}>
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <span className="font-black text-lg uppercase tracking-tight text-white">{p.name} {p.id === userId && "(You)"}</span>
              </div>
              
              <div className="flex items-center gap-4 mr-2">
                {voteStats[p.id] > 0 && (
                   <span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-indigo-400">
                     {voteStats[p.id]} VOTES
                   </span>
                )}
                {me.votedFor === p.id && (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {isHost && (
          <button 
            onClick={onEndVoting}
            className="w-full mt-12 py-6 bg-rose-600 hover:bg-rose-500 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-95"
          >
            END VOTING
          </button>
        )}
      </div>
    );
  };

  // Phase: ELIMINATION
  const renderElimination = () => (
    <div className="flex flex-col items-center justify-center animate-in zoom-in duration-700 text-center">
      <div className="w-32 h-32 rounded-3xl border-4 border-rose-600 overflow-hidden mb-6 shadow-2xl grayscale">
         <img src={eliminatedPlayer?.avatar} className="w-full h-full object-cover" alt="eliminated" />
      </div>
      <h2 className="text-4xl font-black text-white mb-2 uppercase">{eliminatedPlayer?.name}</h2>
      <p className="text-rose-500 font-bold tracking-[0.4em] uppercase mb-8">Was Terminated</p>
      
      <div className="glass-card p-8 rounded-[2.5rem] w-full max-w-xs border-2 border-rose-500/20">
        <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.4em] mb-2">Their Identity was</p>
        <p className={`text-4xl font-black uppercase ${eliminatedPlayer?.role === GameRole.SPY ? 'text-rose-500' : 'text-indigo-400'}`}>
          {eliminatedPlayer?.role}
        </p>
      </div>

      {isHost && (
        <button 
          onClick={onNextRound}
          className="mt-12 px-10 py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black transition-all border border-slate-700"
        >
          RESUME OPERATION
        </button>
      )}
    </div>
  );

  // Phase: GAME_OVER
  const renderGameOver = () => (
    <div className="flex flex-col items-center text-center animate-in fade-in duration-1000">
      <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">
        MISSION ENDED
      </h1>
      <h2 className="text-2xl font-black text-white mb-10 uppercase tracking-[0.5em]">
        {room.winner === 'civilians' ? 'Loyalists Won' : 'Traitors Won'}
      </h2>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-12">
        {room.players.map(p => (
           <div key={p.id} className="glass-card p-4 rounded-3xl flex items-center gap-4 border border-white/5">
              <div className="w-12 h-12 rounded-xl border-2 border-slate-800 overflow-hidden">
                <img src={p.avatar} className="w-full h-full object-cover" alt={p.name} />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-[10px] font-black opacity-40 uppercase truncate">{p.name}</p>
                <p className={`font-black text-xs uppercase ${p.role === GameRole.SPY ? 'text-rose-400' : p.role === GameRole.BLANK ? 'text-amber-400' : 'text-indigo-400'}`}>
                  {p.role}
                </p>
              </div>
           </div>
        ))}
      </div>

      {isHost ? (
        <button 
          onClick={onReset}
          className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 rounded-3xl font-black text-2xl shadow-2xl transition-all active:scale-95"
        >
          NEXT MISSION
        </button>
      ) : (
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest">Awaiting host's instructions...</p>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-md h-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-10 px-2">
        <div className="flex items-center gap-3">
           <div className="bg-indigo-600/20 px-3 py-1 rounded-full border border-indigo-500/30 text-[10px] font-black text-indigo-400">
              {room.id}
           </div>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
             {room.phase === GamePhase.DISCUSSION ? 'Communication' : room.phase}
           </span>
        </div>
        <button 
          onClick={onLeave}
          className="text-[10px] font-black text-slate-600 hover:text-rose-500 transition-colors uppercase tracking-widest"
        >
          Abort Mission
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col justify-center">
        {room.phase === GamePhase.DISCUSSION && renderDiscussion()}
        {room.phase === GamePhase.VOTING && renderVoting()}
        {room.phase === GamePhase.ELIMINATION && renderElimination()}
        {room.phase === GamePhase.GAME_OVER && renderGameOver()}
      </div>

      {/* Mini Player List at bottom */}
      <div className="w-full mt-12 mb-10 flex justify-center gap-4 overflow-x-auto no-scrollbar py-2">
         {room.players.map(p => (
           <div 
            key={p.id} 
            className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all ${!p.isAlive ? 'grayscale opacity-30 blur-[1px]' : ''}`}
           >
              <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden transition-all ${
                p.id === userId ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-800'
              }`}>
                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-[9px] font-black text-slate-500 truncate w-14 text-center uppercase tracking-tighter">
                {p.name}
              </span>
           </div>
         ))}
      </div>
    </div>
  );
};

export default GameRoom;
