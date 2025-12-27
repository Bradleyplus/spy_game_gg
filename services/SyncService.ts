
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, get, remove, off } from "firebase/database";
import { Room } from "../types";

const firebaseConfig = {
    apiKey: "AIzaSyDVVVUN5OqatqjSrvLwU3tLJXLKbZMW1bA",
    authDomain: "spy-game-01.firebaseapp.com",
    databaseURL: "https://spy-game-01-default-rtdb.firebaseio.com", 
    projectId: "spy-game-01",
    storageBucket: "spy-game-01.firebasestorage.app",
    messagingSenderId: "316027229274",
    appId: "1:316027229274:web:7e7a71258cc8b9c9a87463"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

class SyncService {
  private currentRoomId: string | null = null;

  /**
   * 监听房间变化
   */
  public subscribe(roomId: string, callback: (room: Room) => void) {
    this.currentRoomId = roomId;
    const roomRef = ref(db, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Firebase 存储的是对象，我们需要确保格式符合我们的 Room 接口
        // 如果数据中没有 players 数组（Firebase 存储会自动把索引转为对象），手动转换
        const playersData = data.players || {};
        const players = Array.isArray(playersData) ? playersData : Object.values(playersData);
        callback({ ...data, players });
      } else {
        // @ts-ignore
        callback(null);
      }
    });
  }

  public unsubscribe(roomId: string) {
    const roomRef = ref(db, `rooms/${roomId}`);
    off(roomRef);
  }

  /**
   * 更新房间数据到 Firebase
   */
  public async broadcast(room: Room) {
    const roomRef = ref(db, `rooms/${room.id}`);
    await set(roomRef, room);
  }

  /**
   * 获取单个房间数据（一次性）
   */
  public async getRoom(roomId: string): Promise<Room | null> {
    const snapshot = await get(ref(db, `rooms/${roomId}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const playersData = data.players || {};
      const players = Array.isArray(playersData) ? playersData : Object.values(playersData);
      return { ...data, players };
    }
    return null;
  }

  public async leaveRoom(roomId: string, userId: string) {
    const snapshot = await get(ref(db, `rooms/${roomId}/players`));
    if (snapshot.exists()) {
      const playersObj = snapshot.val();
      const players = Array.isArray(playersObj) ? playersObj : Object.values(playersObj);
      const filtered = players.filter((p: any) => p.id !== userId);
      
      if (filtered.length === 0) {
        await remove(ref(db, `rooms/${roomId}`));
      } else {
        await set(ref(db, `rooms/${roomId}/players`), filtered);
      }
    }
  }
}

export const syncService = new SyncService();
