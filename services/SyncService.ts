
import AV from 'leancloud-storage';
import { Realtime } from 'leancloud-realtime';
import { Room } from "../types.ts";

const APP_ID = 'OZ7A77wckSsShsYVtTjbop9r-MdYXbMMI';
const APP_KEY = 'SrRi1HPGUsd0sxeJZeesPsnS';
const SERVER_URL = 'https://oz7a77wc.api.lncldglobal.com';

// Initialize LeanCloud
try {
  AV.init({
    appId: APP_ID,
    appKey: APP_KEY,
    serverURL: SERVER_URL
  });
  
  const realtime = new Realtime({
    appId: APP_ID,
    appKey: APP_KEY,
    serverURL: SERVER_URL
  });
  AV.setRealtime(realtime);
} catch (e) {
  console.error("Critical: LeanCloud failed to initialize.", e);
}

class SyncService {
  private liveQuery: any = null;

  /**
   * Subscribes to room updates using LeanCloud LiveQuery.
   */
  public async subscribe(roomId: string, callback: (room: Room) => void) {
    try {
      this.unsubscribe(roomId); // Ensure clean start

      const query = new AV.Query('GameRoom');
      query.equalTo('roomCode', roomId);
      
      this.liveQuery = await query.subscribe();
      
      this.liveQuery.on('update', (obj: any) => {
        const payload = obj.get('payload');
        if (payload) {
          callback(payload);
        }
      });

      this.liveQuery.on('delete', () => {
        // @ts-ignore
        callback(null);
      });

      // Initial fetch to populate state immediately
      const initial = await this.getRoom(roomId);
      if (initial) callback(initial);
    } catch (err) {
      console.error("SyncService: Subscription error", err);
    }
  }

  /**
   * Unsubscribes from the current LiveQuery.
   */
  public unsubscribe(roomId: string) {
    if (this.liveQuery) {
      this.liveQuery.unsubscribe();
      this.liveQuery = null;
    }
  }

  /**
   * Broadcasts room state updates to LeanCloud.
   * If the room doesn't exist, it creates a new record.
   */
  public async broadcast(room: Room) {
    try {
      const query = new AV.Query('GameRoom');
      query.equalTo('roomCode', room.id);
      let obj = await query.first();

      if (!obj) {
        const GameRoom = AV.Object.extend('GameRoom');
        obj = new GameRoom();
        obj.set('roomCode', room.id);
      }

      obj.set('payload', room);
      await obj.save();
    } catch (err) {
      console.error("SyncService: Broadcast error", err);
    }
  }

  /**
   * Fetches the current room state.
   */
  public async getRoom(roomId: string): Promise<Room | null> {
    try {
      const query = new AV.Query('GameRoom');
      query.equalTo('roomCode', roomId);
      const obj = await query.first();
      
      if (obj) {
        return obj.get('payload') as Room;
      }
    } catch (err) {
      console.error("SyncService: GetRoom error", err);
    }
    return null;
  }

  /**
   * Handles player leaving a room.
   * Deletes the room if no players remain.
   */
  public async leaveRoom(roomId: string, userId: string) {
    try {
      const query = new AV.Query('GameRoom');
      query.equalTo('roomCode', roomId);
      const obj = await query.first();

      if (obj) {
        const roomData = obj.get('payload') as Room;
        const updatedPlayers = roomData.players.filter(p => p.id !== userId);

        if (updatedPlayers.length === 0) {
          await obj.destroy();
        } else {
          // If the host left, assign a new host
          const hasHost = updatedPlayers.some(p => p.isHost);
          if (!hasHost && updatedPlayers.length > 0) {
            updatedPlayers[0].isHost = true;
          }
          
          roomData.players = updatedPlayers;
          obj.set('payload', roomData);
          await obj.save();
        }
      }
    } catch (err) {
      console.error("SyncService: LeaveRoom error", err);
    }
  }
}

export const syncService = new SyncService();
