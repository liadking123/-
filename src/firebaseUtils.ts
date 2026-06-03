import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocFromServer,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { GameState, Team, NotificationMsg } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Firebase connection as required by skill
export async function testConnection() {
  try {
    // Attempt reading a dummy connection check
    await getDocFromServer(doc(db, 'game', 'main'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}

// Global Game State functions
export async function getGameSettings(): Promise<GameState> {
  const path = 'game/main';
  try {
    const snap = await getDoc(doc(db, 'game', 'main'));
    if (snap.exists()) {
      return snap.data() as GameState;
    } else {
      // Initialize with default
      const defaultState: GameState = {
        status: 'waiting',
        countdown: 3
      };
      await setDoc(doc(db, 'game', 'main'), defaultState);
      return defaultState;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return { status: 'waiting', countdown: 3 };
  }
}

export async function updateGameStatus(status: 'waiting' | 'countdown' | 'active' | 'ended') {
  const path = 'game/main';
  try {
    const data: Partial<GameState> = { status };
    if (status === 'active') {
      data.startedAt = new Date().toISOString();
    }
    await updateDoc(doc(db, 'game', 'main'), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateGameCountdown(countdown: number) {
  const path = 'game/main';
  try {
    await updateDoc(doc(db, 'game', 'main'), { countdown });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Team actions
export async function createTeam(teamId: string, name: string, classNumber: string): Promise<Team> {
  const path = `teams/${teamId}`;
  const now = new Date().toISOString();
  const teamData: Team = {
    id: teamId,
    name: name,
    classNumber: classNumber,
    currentStation: 0, // Starts at Station 0 (first station)
    score: 0,
    isCompleted: false,
    joinedAt: now,
    lastActive: now,
  };
  try {
    await setDoc(doc(db, 'teams', teamId), teamData);
    return teamData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function updateTeamStation(teamId: string, currentStation: number, isCompleted: boolean) {
  const path = `teams/${teamId}`;
  const now = new Date().toISOString();
  const updateData: Partial<Team> = {
    currentStation,
    score: currentStation, 
    lastActive: now,
    isCompleted
  };
  if (isCompleted) {
    updateData.completedAt = now;
  }
  try {
    await updateDoc(doc(db, 'teams', teamId), updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function checkTeamStatus(teamId: string): Promise<Team | null> {
  const path = `teams/${teamId}`;
  try {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (snap.exists()) {
      return snap.data() as Team;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

// Notifications / Announcements
export async function sendNotification(teamName: string, stationIndex: number, message: string) {
  const path = 'notifications';
  try {
    const notificationId = 'notif_' + Math.random().toString(36).substring(2, 11);
    const newNotif: NotificationMsg = {
      id: notificationId,
      teamName,
      stationIndex,
      message,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notificationId), newNotif);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Reset entire game data
export async function resetGameData(): Promise<void> {
  const path = 'bulk-reset';
  try {
    // 1. Reset game state
    await setDoc(doc(db, 'game', 'main'), {
      status: 'waiting',
      countdown: 3
    });

    // 2. Clear teams
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const deleteTeamsPromises = teamsSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'teams', docSnap.id)));
    await Promise.all(deleteTeamsPromises);

    // 3. Clear notifications
    const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
    const deleteNotifsPromises = notificationsSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'notifications', docSnap.id)));
    await Promise.all(deleteNotifsPromises);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

