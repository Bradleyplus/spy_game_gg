
import { Room, SyncMessage } from "../types";

/**
 * Since we don't have a real Firebase backend access here, 
 * we use BroadcastChannel to simulate real-time sync across tabs.
 * In a real production app, this would be replaced with Firebase.
 */
class SyncService {
  private channel: BroadcastChannel;
  private onUpdateCallback: ((room: Room) => void) | null = null;

  constructor() {
    this.channel = new BroadcastChannel('spy_game_channel');
    this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data.type === 'ROOM_UPDATE' && this.onUpdateCallback) {
        this.onUpdateCallback(event.data.room);
      }
    };
  }

  public subscribe(callback: (room: Room) => void) {
    this.onUpdateCallback = callback;
  }

  public broadcast(room: Room) {
    // Save to local storage to persist
    localStorage.setItem(`room_${room.id}`, JSON.stringify(room));
    this.channel.postMessage({ type: 'ROOM_UPDATE', room });
  }

  public getLocalRoom(roomId: string): Room | null {
    const data = localStorage.getItem(`room_${roomId}`);
    return data ? JSON.parse(data) : null;
  }
}

export const syncService = new SyncService();
