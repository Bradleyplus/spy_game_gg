
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Player, 
  Room, 
  GameStatus, 
  GamePhase, 
  GameRole 
} from "./types";
import { syncService } from "./services/SyncService";
import { fetchWordPairs } from "./services/geminiService";
import WaitingRoom from "./components/WaitingRoom";
import GameRoom from "./components/GameRoom";

const PREDEFINED_AVATARS = [
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Luna",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Buster",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Milo",
];

const App: React.FC = () => {
  const [user, setUser] = useState<{ id: string, name: string, avatar: string } | null>(() => {
    const saved = localStorage.getItem('spy_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(PREDEFINED_AVATARS[0]);

  // Subscribe to room updates
  useEffect(() => {
    syncService.subscribe((updatedRoom) => {
      setRoom(updatedRoom);
    });
  }, []);

  // Host-only: Check for discussion timeout to auto-start voting
  useEffect(() => {
    if (room && room.status === GameStatus.PLAYING && room.phase === GamePhase.DISCUSSION && room.discussionEndTime) {
      const me = room.players.find(p => p.id === user?.id);
      if (me?.isHost) {
        const checkTimer = setInterval(() => {
          if (Date.now() >= (room.discussionEndTime || 0)) {
            syncService.broadcast({ ...room, phase: GamePhase.VOTING });
            clearInterval(checkTimer);
          }
        }, 1000);
        return () => clearInterval(checkTimer);
      }
    }
  }, [room?.phase, room?.discussionEndTime, user?.id]);

  const generateAIAvatar = async (name: string) => {
    if (!name.trim()) return;
    setGeneratingAvatar(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A professional, minimalist, sleek spy profile icon for a character named '${name}'. Cyberpunk noir aesthetic, flat vector style, bold lines, high contrast, circular composition, indigo and silver color palette.` }]
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          setSelectedAvatar(imageUrl);
          break;
        }
      }
    } catch (e) {
      console.error("Failed to generate AI avatar", e);
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const login = (name: string) => {
    const newUser = { 
      id: 'u_' + Math.random().toString(36).substr(2, 9), 
      name: name.trim(), 
      avatar: selectedAvatar 
    };
    localStorage.setItem('spy_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const createRoom = () => {
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
    syncService.broadcast(newRoom);
    setRoom(newRoom);
  };

  const joinRoom = (id: string) => {
    if (!user) return;
    const existingRoom = syncService.getLocalRoom(id);
    if (!existingRoom) {
      alert("Room not found!");
      return;
    }
    if (existingRoom.players.length >= 7) {
      alert("Room is full!");
      return;
    }
    const newRoom: Room = {
      ...existingRoom,
      players: [...existingRoom.players, {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        isHost: false,
        isAlive: true,
        votedFor: null,
        role: null,
        word: null
      }]
    };
    syncService.broadcast(newRoom);
    setRoom(newRoom);
  };

  const startGame = async () => {
    if (!room || !user) return;
    if (room.players.length < 3) return;

    setLoading(true);
    try {
      const pairs = await fetchWordPairs(1);
      const pair = pairs[0];
      
      const shuffled = [...room.players].sort(() => Math.random() - 0.5);
      const spyId = shuffled[0].id;
      // Blank logic only triggers for 7 players
      const blankId = shuffled.length === 7 ? shuffled[1].id : null;

      const newPlayers = room.players.map(p => {
        let role = GameRole.CIVILIAN;
        let word = pair.civilian;
        if (p.id === spyId) { role = GameRole.SPY; word = pair.spy; }
        else if (p.id === blankId) { role = GameRole.BLANK; word = "YOU ARE A BLANK!"; }
        return { ...p, role, word, isAlive: true, votedFor: null };
      });

      const updatedRoom: Room = {
        ...room,
        status: GameStatus.PLAYING,
        phase: GamePhase.DISCUSSION,
        players: newPlayers,
        currentWords: pair,
        discussionEndTime: Date.now() + 180000,
        winner: null,
        eliminatedPlayerId: null
      };

      syncService.broadcast(updatedRoom);
      setRoom(updatedRoom);
    } catch (e) {
      alert("Failed to start game.");
    } finally {
      setLoading(false);
    }
  };

  const castVote = (targetId: string) => {
    if (!room || !user) return;
    const updatedRoom: Room = {
      ...room,
      players: room.players.map(p => p.id === user.id ? { ...p, votedFor: targetId } : p)
    };
    syncService.broadcast(updatedRoom);
    setRoom(updatedRoom);
  };

  const resolveVoting = () => {
    if (!room) return;
    const votes: Record<string, number> = {};
    room.players.forEach(p => { if (p.votedFor) votes[p.votedFor] = (votes[p.votedFor] || 0) + 1; });

    let max = -1;
    let eliminatedId: string | null = null;
    let tie = false;
    Object.entries(votes).forEach(([id, count]) => {
      if (count > max) { max = count; eliminatedId = id; tie = false; }
      else if (count === max) { tie = true; }
    });

    if (tie || !eliminatedId) {
      // If tie, restart discussion with a fresh 3 mins
      const updatedRoom: Room = {
        ...room,
        phase: GamePhase.DISCUSSION,
        discussionEndTime: Date.now() + 180000,
        players: room.players.map(p => ({ ...p, votedFor: null }))
      };
      syncService.broadcast(updatedRoom);
      setRoom(updatedRoom);
      return;
    }

    const newPlayers = room.players.map(p => p.id === eliminatedId ? { ...p, isAlive: false, votedFor: null } : { ...p, votedFor: null });
    const aliveSpies = newPlayers.filter(p => p.isAlive && (p.role === GameRole.SPY || p.role === GameRole.BLANK)).length;
    const aliveCivilians = newPlayers.filter(p => p.isAlive && p.role === GameRole.CIVILIAN).length;

    let winner: 'civilians' | 'spies' | null = null;
    if (aliveSpies === 0) winner = 'civilians';
    else if (aliveCivilians <= aliveSpies) winner = 'spies';

    const updatedRoom: Room = {
      ...room,
      players: newPlayers,
      phase: winner ? GamePhase.GAME_OVER : GamePhase.ELIMINATION,
      winner,
      eliminatedPlayerId: eliminatedId,
      discussionEndTime: null
    };
    syncService.broadcast(updatedRoom);
    setRoom(updatedRoom);
  };

  const resetRoom = () => {
    if (!room) return;
    const updatedRoom: Room = {
      ...room,
      status: GameStatus.WAITING,
      phase: GamePhase.DISCUSSION,
      winner: null,
      eliminatedPlayerId: null,
      discussionEndTime: null,
      players: room.players.map(p => ({ ...p, isAlive: true, role: null, word: null, votedFor: null }))
    };
    syncService.broadcast(updatedRoom);
    setRoom(updatedRoom);
  };

  const leaveRoom = () => {
    if (room && user) {
      const updatedPlayers = room.players.filter(p => p.id !== user.id);
      if (updatedPlayers.length === 0) {
        localStorage.removeItem(`room_${room.id}`);
      } else {
        const updatedRoom = { ...room, players: updatedPlayers };
        syncService.broadcast(updatedRoom);
      }
    }
    setRoom(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 overflow-y-auto">
        <h1 className="text-5xl font-black mb-12 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-500 uppercase">Undercover</h1>
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Nickname</label>
            <input 
              id="name-input"
              type="text" 
              placeholder="Your spy alias..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Choose Identity Image</label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {PREDEFINED_AVATARS.map(url => (
                <button 
                  key={url}
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedAvatar === url ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60'}`}
                >
                  <img src={url} className="w-full h-full object-cover" alt="avatar" />
                </button>
              ))}
              <button 
                onClick={() => {
                  const nameInput = document.getElementById('name-input') as HTMLInputElement;
                  if (nameInput.value) generateAIAvatar(nameInput.value);
                  else alert("Enter a nickname first!");
                }}
                disabled={generatingAvatar}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-1 hover:border-indigo-500 transition-all ${generatingAvatar ? 'animate-pulse' : ''}`}
              >
                {selectedAvatar.startsWith('data:') ? (
                  <img src={selectedAvatar} className="w-full h-full object-cover" alt="AI Avatar" />
                ) : (
                  <div className="text-[8px] font-black text-indigo-400 uppercase text-center leading-tight">AI<br/>GEN</div>
                )}
              </button>
            </div>
            {generatingAvatar && <p className="text-[8px] text-center text-indigo-400 animate-pulse font-bold tracking-widest uppercase">Consulting AI Artist...</p>}
          </div>

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
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="w-24 h-24 rounded-3xl border-2 border-indigo-500/30 overflow-hidden mb-4 shadow-2xl">
            <img src={user.avatar} className="w-full h-full object-cover" alt="me" />
          </div>
          <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Agent Ready</h2>
          <p className="text-3xl font-black text-white">{user.name}</p>
        </div>
        <div className="w-full max-w-sm space-y-4">
          <button onClick={createRoom} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95">NEW MISSION</button>
          <div className="relative py-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div><span className="relative flex justify-center text-[10px] font-black uppercase text-slate-500 bg-slate-950 px-4 tracking-widest">or infiltrate</span></div>
          <div className="flex gap-2">
            <input 
              id="room-join-input"
              type="number" 
              placeholder="4-digit ID" 
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-center text-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
            <button 
              onClick={() => {
                const input = document.getElementById('room-join-input') as HTMLInputElement;
                if (input.value.length === 4) joinRoom(input.value);
              }} 
              className="px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black transition-all active:scale-95"
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (room.status === GameStatus.WAITING) {
    return (
      <div className="min-h-screen flex flex-col items-center p-6 bg-slate-950">
        <WaitingRoom 
          room={room} 
          userId={user.id} 
          onStart={startGame} 
          onLeave={leaveRoom} 
          isLoading={loading} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-slate-950">
      <GameRoom 
        room={room} 
        userId={user.id} 
        onReset={resetRoom} 
        onLeave={leaveRoom} 
        onCastVote={castVote} 
        onStartVoting={() => syncService.broadcast({ ...room, phase: GamePhase.VOTING })}
        onEndVoting={resolveVoting}
        onNextRound={() => syncService.broadcast({ ...room, phase: GamePhase.DISCUSSION, discussionEndTime: Date.now() + 180000 })}
      />
    </div>
  );
};

export default App;
