
import AV from 'leancloud-storage';
import { Realtime } from 'leancloud-realtime';
import { Room } from "../types.ts";

const APP_ID = 'OZ7A77wckSsShsYVtTjbop9r-MdYXbMMI';
const APP_KEY = 'SrRi1HPGUsd0sxeJZeesPsnS';
const SERVER_URL = 'https://oz7a77wc.api.lncldglobal.com';

// 确保在初始化之前没有重复初始化
try {
  if (!AV.applicationId) {
    AV.init({
      appId: APP_ID,
      appKey: APP_KEY,
      serverURL: SERVER_URL
    });
    
    const realtime = new Realtime({
      appId: APP_ID,
      appKey: APP_KEY,
      // Fix: Use 'server' property instead of 'serverURL' as required by Realtime SDK configuration
      server: SERVER_URL
    });
    
    // 关键：将实时通讯 SDK 绑定到存储 SDK 以启用 LiveQuery
    // @ts-ignore - setRealtime is the standard way to hook up Realtime for LiveQuery, but may not be present in type definitions
    AV.setRealtime(realtime);
    console.log("SyncService: LeanCloud & Realtime initialized successfully.");
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
      
      // 注意：LiveQuery 需要在 LeanCloud 控制台的“服务设置”中开启
      this.liveQuery = await query.subscribe();
      console.log(`SyncService: Subscribed to room ${roomId}`);
      
      this.liveQuery.on('update', (obj: any) => {
        const payload = obj.get('payload');
        if (payload) {
          console.log("SyncService: Remote update received", payload);
          callback(payload);
        }
      });

      this.liveQuery.on('delete', () => {
        console.warn("SyncService: Room was deleted remotely.");
        // @ts-ignore
        callback(null);
      });

      // 立即获取当前最新状态
      const initial = await this.getRoom(roomId);
      if (initial) callback(initial);
    } catch (err) {
      console.error("SyncService: Subscription failed", err);
    }
  }

  public unsubscribe(roomId: string) {
    if (this.liveQuery) {
      this.liveQuery.unsubscribe();
      this.liveQuery = null;
      console.log(`SyncService: Unsubscribed from ${roomId}`);
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
      await obj.save();
      console.log("SyncService: Broadcast success");
    } catch (err) {
      console.error("SyncService: Broadcast failed", err);
    }
  }

  public async getRoom(roomId: string): Promise<Room | null> {
    try {
      const query = new AV.Query('GameRoom');
      query.equalTo('roomCode', roomId);
      const obj = await query.first();
      return obj ? obj.get('payload') : null;
    } catch (err) {
      console.error("SyncService: Fetch room failed", err);
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
        } else {
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
      console.error("SyncService: LeaveRoom failed", err);
    }
  }
}

export const syncService = new SyncService();
