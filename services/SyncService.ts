
import AV from 'leancloud-storage';
import { Realtime } from 'leancloud-realtime';
import { Room } from "../types.ts";

const APP_ID = 'OZ7A77wckSsShsYVtTjbop9r-MdYXbMMI';
const APP_KEY = 'SrRi1HPGUsd0sxeJZeesPsnS';
const SERVER_URL = 'https://oz7a77wc.api.lncldglobal.com';

// Handle global initialization
try {
  if (!AV.applicationId) {
    console.log("SyncService: Initializing LeanCloud SDKs...");
    
    AV.init({
      appId: APP_ID,
      appKey: APP_KEY,
      serverURL: SERVER_URL
    });
    
    const realtime = new Realtime({
      appId: APP_ID,
      appKey: APP_KEY,
      server: SERVER_URL
    });
    
    // Bind realtime to AV for LiveQuery
    // @ts-ignore
    if (typeof AV.setRealtime === 'function') {
      // @ts-ignore
      AV.setRealtime(realtime);
      console.log("SyncService: Realtime bound to Storage.");
    } else {
      console.warn("SyncService: AV.setRealtime not found, LiveQuery might not trigger.");
    }
    
    console.log("SyncService: LeanCloud Core initialized.");
  }
} catch (e) {
  console.error("Critical: LeanCloud failed to initialize.", e);
}

class SyncService {
  private liveQuery: any = null;

  public async subscribe(roomId: string, callback: (room: Room) => void) {
    try {
      this.unsubscribe(roomId);

      const query = new AV.Query('GameRoom');
      query.equalTo('roomCode', roomId);
      
      this.liveQuery = await query.subscribe();
      console.log(`SyncService: Subscribed to LiveQuery for room ${roomId}`);
      
      this.liveQuery.on('create', (obj: any) => this.handleUpdate(obj, callback));
      this.liveQuery.on('update', (obj: any) => this.handleUpdate(obj, callback));
      this.liveQuery.on('enter', (obj: any) => this.handleUpdate(obj, callback));

      this.liveQuery.on('delete', () => {
        console.warn("SyncService: Room deleted remotely.");
        // @ts-ignore
        callback(null);
      });

      // Initial fetch
      const initial = await this.getRoom(roomId);
      if (initial) callback(initial);
    } catch (err) {
      console.error("SyncService: Subscription error", err);
    }
  }

  private handleUpdate(obj: any, callback: (room: Room) => void) {
    const payload = obj.get('payload');
    if (payload) {
      console.log("SyncService: Sync update received", payload.id);
      callback(payload);
    }
  }

  public unsubscribe(roomId: string) {
    if (this.liveQuery) {
      console.log(`SyncService: Unsubscribing from ${roomId}`);
      this.liveQuery.unsubscribe().catch(() => {});
      this.liveQuery = null;
    }
  }

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
      const saved = await obj.save();
      console.log("SyncService: Broadcast successful", saved.id);
    } catch (err) {
      console.error("SyncService: Broadcast failed", err);
    }
  }

  public async getRoom(roomId: string): Promise<Room | null> {
    try {
      const query = new AV.Query('GameRoom');
      query.equalTo('roomCode', roomId);
      const obj = await query.first();
      return obj ? (obj.get('payload') as Room) : null;
    } catch (err) {
      console.error("SyncService: getRoom failed", err);
      return null;
    }
  }

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
          console.log("SyncService: Last player left, room destroyed.");
        } else {
          const hasHost = updatedPlayers.some(p => p.isHost);
          if (!hasHost && updatedPlayers.length > 0) {
            updatedPlayers[0].isHost = true;
          }
          roomData.players = updatedPlayers;
          obj.set('payload', roomData);
          await obj.save();
          console.log("SyncService: Player left, room updated.");
        }
      }
    } catch (err) {
      console.error("SyncService: leaveRoom failed", err);
    }
  }
}

export const syncService = new SyncService();
