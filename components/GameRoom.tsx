
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

const GameRoom: React.FC<GameRoomProps> = ({ 
  room, userId, onReset, onLeave, onCastVote, onStartVoting, onEndVoting, onNextRound 
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const me = room.players.find(p => p.id === userId);
  const isHost = me?.isHost || false;

  const voteCount = useMemo(() => {
    const counts: Record<string, number> = {};
    room.players.forEach(p => { if (p.votedFor) counts[p.votedFor] = (counts[p.votedFor] || 0) + 1; });
    return counts;
  }, [room.players]);

  if (!me) return null;

  const renderDiscussion = () => (
    <div className="flex flex-col items-center">
      <div 
        onClick={() => setIsRevealed(!isRevealed)}
        className={`relative w-64 h-96 transition-all duration-700 cursor-pointer transform perspective-1000 ${isRevealed ? '[transform:rotateY(180deg)]' : ''}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute inset-0 backface-hidden glass-card rounded-[2rem] flex flex-col items-center justify-center p-8">
           <p className="text-xl font-black text-indigo-400">TAP TO REVEAL</p>
        </div>
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-indigo-600 rounded-[2rem] flex flex-col items-center justify-center p-8 text-white shadow-2xl">
          <h3 className="text-2xl font-black mb-4">{me.role?.toUpperCase()}</h3>
          <p className="text-4xl font-black">{me.word}</p>
        </div>
      </div>
      {isHost && <button onClick={onStartVoting} className="mt-12 px-12 py-5 bg-indigo-600 rounded-2xl font-black">START VOTING</button>}
    </div>
  );

  const renderVoting = () => (
    <div className="w-full max-w-md">
      <h2 className="text-center text-3xl font-black mb-8 text-indigo-400">VOTE OUT THE SPY</h2>
      <div className="space-y-4">
        {room.players.filter(p => p.isAlive).map(p => (
          <button
            key={p.id}
            disabled={!!me.votedFor || !me.isAlive}
            onClick={() => onCastVote(p.id)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
              me.votedFor === p.id ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-4">
              <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-xl" />
              <span className="font-bold text-white">{p.name} {p.isBot && '🤖'}</span>
            </div>
            {voteCount[p.id] > 0 && <span className="bg-slate-800 px-3 py-1 rounded-full text-xs text-indigo-400">{voteCount[p.id]}</span>}
          </button>
        ))}
      </div>
      {isHost && <button onClick={onEndVoting} className="w-full mt-12 py-5 bg-rose-600 rounded-2xl font-black">RESOLVE VOTES</button>}
    </div>
  );

  const renderElimination = () => {
    const eliminated = room.players.find(p => p.id === room.eliminatedPlayerId);
    return (
      <div className="text-center">
        <h2 className="text-4xl font-black text-white mb-2">{eliminated?.name}</h2>
        <p className="text-rose-500 font-bold mb-8">ELIMINATED</p>
        <p className="text-2xl font-black text-indigo-400">Role: {eliminated?.role}</p>
        {isHost && <button onClick={onNextRound} className="mt-12 px-10 py-5 bg-indigo-600 rounded-2xl font-black">CONTINUE</button>}
      </div>
    );
  };

  const renderGameOver = () => (
    <div className="text-center">
      <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">GAME OVER</h1>
      <h2 className="text-2xl font-black text-white mb-10">{room.winner?.toUpperCase()} WON!</h2>
      {isHost && <button onClick={onReset} className="px-12 py-5 bg-indigo-600 rounded-2xl font-black">NEW GAME</button>}
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-between mb-8">
        <span className="text-slate-500 font-bold">Room: {room.id}</span>
        <button onClick={onLeave} className="text-rose-500 font-bold">Abort</button>
      </div>
      {room.phase === GamePhase.DISCUSSION && renderDiscussion()}
      {room.phase === GamePhase.VOTING && renderVoting()}
      {room.phase === GamePhase.ELIMINATION && renderElimination()}
      {room.phase === GamePhase.GAME_OVER && renderGameOver()}
    </div>
  );
};

export default GameRoom;
