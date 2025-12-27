
export enum GameRole {
  CIVILIAN = 'civilian',
  SPY = 'spy',
  BLANK = 'blank'
}

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing'
}

export enum GamePhase {
  DISCUSSION = 'discussion',
  VOTING = 'voting',
  ELIMINATION = 'elimination',
  GAME_OVER = 'game_over'
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  role: GameRole | null;
  word: string | null;
  isHost: boolean;
  isAlive: boolean;
  isBot: boolean; // Flag for AI players
  votedFor: string | null;
}

export interface WordPair {
  civilian: string;
  spy: string;
}

export interface Room {
  id: string;
  status: GameStatus;
  phase: GamePhase;
  players: Player[];
  currentWords: WordPair | null;
  playedWords: string[];
  eliminatedPlayerId: string | null;
  winner: 'civilians' | 'spies' | null;
  discussionEndTime: number | null;
}
