
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get, child, remove, off } from "firebase/database";
import { Room } from "../types.ts";

// Firebase Configuration (Replace with your actual config if needed)
// These are generic placeholders. In a production environment, use environment variables.
const firebaseConfig = {
  databaseURL: "https://undercover-game-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

class SyncService {
  private activeListeners: Record<string, any> = {};

  public async subscribe(roomId: string, callback: (room: Room) => void) {
    const roomRef = ref(db, `rooms/${roomId}`);
    
    // Cleanup previous listener if exists
    this.unsubscribe(roomId);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data as Room);
      }
    });

    this.activeListeners[roomId] = unsubscribe;
  }

  public unsubscribe(roomId: string) {
    if (this.activeListeners[roomId]) {
      const roomRef = ref(db, `rooms/${roomId}`);
      off(roomRef);
      delete this.activeListeners[roomId];
    }
  }

  public async broadcast(room: Room) {
    try {
      const roomRef = ref(db, `rooms/${room.id}`);
      await set(roomRef, room);
    } catch (error) {
      console.error("Firebase broadcast failed:", error);
    }
  }

  public async getRoom(roomId: string): Promise<Room | null> {
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `rooms/${roomId}`));
      if (snapshot.exists()) {
        return snapshot.val() as Room;
      }
      return null;
    } catch (error) {
      console.error("Firebase fetch failed:", error);
      return null;
    }
  }

  public async leaveRoom(roomId: string, userId: string) {
    try {
      const room = await this.getRoom(roomId);
      if (room) {
        const updatedPlayers = room.players.filter(p => p.id !== userId);
        if (updatedPlayers.length === 0) {
          const roomRef = ref(db, `rooms/${roomId}`);
          await remove(roomRef);
        } else {
          // If host leaves, assign new host
          const hasHost = updatedPlayers.some(p => p.isHost);
          if (!hasHost && updatedPlayers.length > 0) {
            updatedPlayers[0].isHost = true;
          }
          await this.broadcast({ ...room, players: updatedPlayers });
        }
      }
    } catch (error) {
      console.error("Firebase leave failed:", error);
    }
  }
}

export const syncService = new SyncService();
