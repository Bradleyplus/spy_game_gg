
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get, remove, off, Database } from "firebase/database";
import { Room } from "../types.ts";

// 确认配置对象语法完全正确
const firebaseConfig = {
    apiKey: "AIzaSyDVVVUN5OqatqjSrvLwU3tLJXLKbZMW1bA",
    authDomain: "spy-game-01.firebaseapp.com",
    databaseURL: "https://spy-game-01-default-rtdb.firebaseio.com", 
    projectId: "spy-game-01",
    storageBucket: "spy-game-01.firebasestorage.app",
    messagingSenderId: "316027229274",
    appId: "1:316027229274:web:7e7a71258cc8b9c9a87463"
};

let db: Database | null = null;
try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
} catch (e) {
    console.error("Critical: Firebase failed to initialize. Check your network or config.", e);
}

class SyncService {
  public subscribe(roomId: string, callback: (room: Room) => void) {
    if (!db) {
        console.warn("SyncService: Connection failed, subscription skipped.");
        return;
    }
    const roomRef = ref(db, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
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
    if (!db) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    off(roomRef);
  }

  public async broadcast(room: Room) {
    if (!db) {
        console.error("SyncService: Database not available for broadcast.");
        return;
    }
    const roomRef = ref(db, `rooms/${room.id}`);
    await set(roomRef, room);
  }

  public async getRoom(roomId: string): Promise<Room | null> {
    if (!db) return null;
    try {
        const snapshot = await get(ref(db, `rooms/${roomId}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const playersData = data.players || {};
          const players = Array.isArray(playersData) ? playersData : Object.values(playersData);
          return { ...data, players };
        }
    } catch (err) {
        console.error("SyncService: Error fetching room", err);
    }
    return null;
  }

  public async leaveRoom(roomId: string, userId: string) {
    if (!db) return;
    try {
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
    } catch (err) {
        console.error("SyncService: Error during leaveRoom", err);
    }
  }
}

export const syncService = new SyncService();
