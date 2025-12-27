
import React, { useState, useEffect } from 'react';
import { 
  Room, 
  GameStatus, 
  GamePhase, 
  GameRole,
  Player
} from "./types.ts";
import { syncService } from "./services/SyncService.ts";
import { fetchWordPairs } from "./services/geminiService.ts";
import WaitingRoom from "./components/WaitingRoom.tsx";
import GameRoom from "./components/GameRoom.tsx";

const PREDEFINED_AVATARS = [
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Luna",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Buster",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Milo",
];

const BOT_NAMES = ["Agent Alpha", "Spy Bot", "Neural Link", "Cyber Eye", "Binary Shadow"];

const App: React.FC = () => {
  const [user, setUser] = useState<{ id: string, name: string, avatar: string } | null>(() => {
    try {
      const saved = localStorage.getItem('spy_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room?.id) {
      syncService.subscribe(room.id, (updatedRoom) => {
        setRoom(updatedRoom);
      });
      return () => syncService.unsubscribe(room.id);
    }
  }, [room?.id]);

  // Handle Bot Automated Voting
  useEffect(() => {
    if (room?.phase === GamePhase.VOTING && room.players.find(p => p.id === user?.id)?.isHost) {
      const botsToVote = room.players.filter(p => p.isBot && p.isAlive && !p.votedFor);
      if (botsToVote.length > 0) {
        const timer = setTimeout(() => {
          const alivePlayers = room.players.filter(p => p.isAlive);
          const updatedPlayers = [...room.players];
          
          botsToVote.forEach(bot => {
            const possibleTargets = alivePlayers.filter(p => p.id !== bot.id);
            const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
            const idx = updatedPlayers.findIndex(p => p.id === bot.id);
            if (idx !== -1) updatedPlayers[idx].votedFor = target.id;
          });

          syncService.broadcast({ ...room, players: updatedPlayers });
        }, 2000 + Math.random() * 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [room?.phase, room?.players, user?.id]);

  const login = (name: string) => {
    const newUser = { 
      id: 'u_' + Math.random().toString(36).substr(2, 9), 
      name: name.trim(), 
      avatar: PREDEFINED_AVATARS[Math.floor(Math.random() * PREDEFINED_AVATARS.length)] 
    };
    localStorage.setItem('spy_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const createRoom = async () => {
    if (!user) return;
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    const newRoom: Room = {
      id,
      status: GameStatus.WAITING,
      phase: GamePhase.DISCUSSION,
      players: [{
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        isHost: true,
        isAlive: true,
        isBot: false,
        votedFor: null,
        role: null,
        word: null
      }],
      currentWords: null,
      playedWords: [],
      eliminatedPlayerId: null,
      winner: null,
      discussionEndTime: null
    };
    await syncService.broadcast(newRoom);
    setRoom(newRoom);
  };

  const joinRoom = async (id: string) => {
    if (!user) return;
    const existingRoom = await syncService.getRoom(id);
    if (!existingRoom) {
      alert("Room not found!");
      return;
    }
    if (existingRoom.players.some(p => p.id === user.id)) {
        setRoom(existingRoom);
        return;
    }
    if (existingRoom.players.length >= 7) {
      alert("Room is full!");
      return;
    }
    const updatedRoom: Room = {
      ...existingRoom,
      players: [...existingRoom.players, {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        isHost: false,
        isAlive: true,
        isBot: false,
        votedFor: null,
        role: null,
        word: null
      }]
    };
    await syncService.broadcast(updatedRoom);
    setRoom(updatedRoom);
  };

  const addBot = async () => {
    if (!room || room.players.length >= 7) return;
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const newBot: Player = {
      id: 'bot_' + Math.random().toString(36).substr(2, 9),
      name: `${botName} (Bot)`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Math.random()}`,
      isHost: false,
      isAlive: true,
      isBot: true,
      votedFor: null,
      role: null,
      word: null
    };
    await syncService.broadcast({
      ...room,
      players: [...room.players, newBot]
    });
  };

  const startGame = async () => {
    if (!room || !user) return;
    setLoading(true);
    try {
      const pairs = await fetchWordPairs(1);
      const pair = pairs[0];
      const shuffled = [...room.players].sort(() => Math.random() - 0.5);
      
      const spyId = shuffled[0].id;
      const blankId = shuffled.length >= 6 ? shuffled[1].id : null;

      const newPlayers = room.players.map(p => {
        let role = GameRole.CIVILIAN;
        let word = pair.civilian;
        if (p.id === spyId) { role = GameRole.SPY; word = pair.spy; }
        else if (p.id === blankId) { role = GameRole.BLANK; word = "YOU ARE A BLANK!"; }
        return { ...p, role, word, isAlive: true, votedFor: null };
      });

      await syncService.broadcast({
        ...room,
        status: GameStatus.PLAYING,
        phase: GamePhase.DISCUSSION,
        players: newPlayers,
        currentWords: pair,
        discussionEndTime: Date.now() + 120000,
        winner: null,
        eliminatedPlayerId: null
      });
    } catch (e) {
      alert("Failed to start game.");
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (targetId: string) => {
    if (!room || !user) return;
    const updatedPlayers = room.players.map(p => p.id === user.id ? { ...p, votedFor: targetId } : p);
    await syncService.broadcast({ ...room, players: updatedPlayers });
  };

  const resolveVoting = async () => {
    if (!room) return;
    const votes: Record<string, number> = {};
    room.players.forEach(p => { if (p.votedFor) votes[p.votedFor] = (votes[p.votedFor] || 0) + 1; });

    let max = -1, eliminatedId: string | null = null, tie = false;
    Object.entries(votes).forEach(([id, count]) => {
      if (count > max) { max = count; eliminatedId = id; tie = false; }
      else if (count === max) { tie = true; }
    });

    if (tie || !eliminatedId) {
      await syncService.broadcast({
        ...room,
        phase: GamePhase.DISCUSSION,
        discussionEndTime: Date.now() + 120000,
        players: room.players.map(p => ({ ...p, votedFor: null }))
      });
      return;
    }

    const newPlayers = room.players.map(p => p.id === eliminatedId ? { ...p, isAlive: false, votedFor: null } : { ...p, votedFor: null });
    const aliveSpies = newPlayers.filter(p => p.isAlive && (p.role === GameRole.SPY || p.role === GameRole.BLANK)).length;
    const aliveCivilians = newPlayers.filter(p => p.isAlive && p.role === GameRole.CIVILIAN).length;

    let winner: 'civilians' | 'spies' | null = null;
    if (aliveSpies === 0) winner = 'civilians';
    else if (aliveCivilians <= aliveSpies) winner = 'spies';

    await syncService.broadcast({
      ...room,
      players: newPlayers,
      phase: winner ? GamePhase.GAME_OVER : GamePhase.ELIMINATION,
      winner,
      eliminatedPlayerId: eliminatedId,
      discussionEndTime: null
    });
  };

  const resetRoom = async () => {
    if (!room) return;
    await syncService.broadcast({
      ...room,
      status: GameStatus.WAITING,
      phase: GamePhase.DISCUSSION,
      winner: null,
      eliminatedPlayerId: null,
      players: room.players.map(p => ({ ...p, isAlive: true, role: null, word: null, votedFor: null }))
    });
  };

  const leaveRoom = async () => {
    if (room && user) {
      await syncService.leaveRoom(room.id, user.id);
    }
    setRoom(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <h1 className="text-5xl font-black mb-12 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-500 uppercase">Undercover</h1>
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-6">
          <input 
            id="name-input"
            type="text" 
            placeholder="Your spy alias..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button 
            onClick={() => {
              const val = (document.getElementById('name-input') as HTMLInputElement).value;
              if (val) login(val);
            }}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            ENTER MISSION
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Agent Identification</h2>
        <h1 className="text-3xl font-black text-white mb-8">{user.name}</h1>
        <div className="w-full max-w-sm space-y-4">
          <button onClick={createRoom} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95">NEW MISSION</button>
          <div className="flex gap-2">
            <input id="room-id-input" type="number" placeholder="4-digit ID" className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-center text-xl text-white font-mono" />
            <button onClick={() => {
                const input = document.getElementById('room-id-input') as HTMLInputElement;
                if (input.value.length === 4) joinRoom(input.value);
            }} className="px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black transition-all">JOIN</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-slate-950">
      {room.status === GameStatus.WAITING ? (
        <div className="w-full max-w-md">
          <WaitingRoom room={room} userId={user.id} onStart={startGame} onLeave={leaveRoom} isLoading={loading} />
          {room.players.find(p => p.id === user.id)?.isHost && room.players.length < 7 && (
            <button onClick={addBot} className="w-full mt-4 py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 font-bold hover:text-indigo-400 hover:border-indigo-500 transition-all">
              + ADD BOT AGENT
            </button>
          )}
        </div>
      ) : (
        <GameRoom 
          room={room} 
          userId={user.id} 
          onReset={resetRoom} 
          onLeave={leaveRoom} 
          onCastVote={castVote} 
          onStartVoting={() => syncService.broadcast({ ...room, phase: GamePhase.VOTING })}
          onEndVoting={resolveVoting}
          onNextRound={() => syncService.broadcast({ ...room, phase: GamePhase.DISCUSSION, discussionEndTime: Date.now() + 120000 })}
        />
      )}
    </div>
  );
};

export default App;
