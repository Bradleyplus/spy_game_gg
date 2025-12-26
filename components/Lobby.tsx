
import React, { useState } from 'react';

interface LobbyProps {
  onLogin: (name: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="w-full max-w-md animate-in fade-in duration-700 slide-in-from-bottom-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4 tracking-tighter">
          SPY GAME
        </h1>
        <p className="text-slate-400 font-medium">Find the impostor among your friends</p>
      </div>
      
      <form onSubmit={handleSubmit} className="glass-card p-8 rounded-3xl shadow-2xl space-y-6">
        <div>
          <label htmlFor="nickname" className="block text-sm font-semibold text-slate-400 mb-2 ml-1">
            Choose your spy alias
          </label>
          <input
            id="nickname"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Agent 007"
            className="w-full bg-slate-800/50 border border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 text-lg focus:outline-none transition-all placeholder:text-slate-600"
            required
            autoFocus
          />
        </div>
        
        <button
          type="submit"
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-900/20 transition-all active:scale-95"
        >
          Get Started
        </button>
      </form>
    </div>
  );
};

export default Lobby;
