import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, onSnapshot,getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase-config";
import { useAuth } from "./AuthContext";
import { useNetworkStatus } from "../hooks/use-network-status";

/* 1.  Define the shape */
type TimeTableDoc = {
  day: Record<string, any>;
  PeriodandTimings: { period: string; timing: string }[];
  classRoom: string;
  hasVerified?: boolean;
};

type TimetableContextValue = {
  timetable: TimeTableDoc | null;
  loading: boolean;
  error: string | null;
  lastSynced: Date | null;
  refreshTimetable: () => Promise<void>;
};

const TimetableContext = createContext<TimetableContextValue>({
  timetable: null,
  loading: true,
  error: null,

  lastSynced: null,
  refreshTimetable: async () => {},
});

export function useTimetable() {
  return useContext(TimetableContext);
}

/* 2.  Provider */
export function TimetableProvider({ children }: { children: React.ReactNode }) {
  const { userData, user } = useAuth();
  const [timetable, setTimetable] = useState<TimeTableDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    console.log('🔍 Timetable useEffect triggered:', { 
      userData, 
      userEmail: user?.email,
      hasUserData: !!userData,
      hasUser: !!user,
      currentPath: window?.location?.pathname 
    });

    if (!userData || !user?.email) {
      console.log('❌ Missing userData or user email, stopping timetable load');
      console.log('User object:', user);
      console.log('UserData object:', userData);
      setLoading(false);
      return;
    }

    if(!isOnline){
      if (typeof window !== 'undefined' && auth.currentUser?.uid) {
        const cachedData = localStorage.getItem(auth.currentUser.uid);
        if(cachedData){
          console.log('🔄 Offline - loading cached timetable data');
          setTimetable(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }
     setLoading(false);
     return;
    }

    // Check if userData has all required fields
    if ((isOnline) && !userData.department || !userData.year || !userData.section || !userData.semester ) {
      console.log('❌ Missing required userData fields:', {
        department: userData.department,
        year: userData.year,
        section: userData.section,
        semester: userData.semester,
        fullUserData: userData
      });
      setLoading(false);
      setError('Incomplete user profile. Please update your profile.');
      return;
    }

    console.log('✅ All required userData fields present, starting timetable fetch');

    setLoading(true);
    setError(null);


    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('Timetable loading timeout - checking cache');
        setLoading(false);
        setError('Loading timeout - check your connection');
        
        // Try to load from cache on timeout
        if (typeof window !== 'undefined' && auth.currentUser?.uid) {
          try {
            const cachedData = localStorage.getItem(auth.currentUser.uid);
        
            if (cachedData) {
              const parsedData = JSON.parse(cachedData);
              setTimetable(parsedData);
              console.log('🔄 Timeout - using cached timetable data');
              setError('Using cached data due to slow connection');
            }
          } catch (cacheError) {
            console.error('Error loading cached timetable on timeout:', cacheError);
          }
        }
      }
    }, 10000); // 10 second timeout

    const q = query(
      collection(db, "TimeTable"),
      where("department_uploaded", "==", userData.department),
      where("year_uploaded", "==", userData.year),
      where("section_uploaded", "==", userData.section),
      where("semester_uploaded", "==", userData.semester),
    );

    unsubscribe = onSnapshot(
      q,
      snap => {
        if (!mounted) return;
        
        // Clear timeout since we got a response
        clearTimeout(timeoutId);
        
        if (snap.empty) {
          setTimetable(null);
          setError('No timetable found for your section. Please contact your administrator.');
        } else {
          const timetableData = snap.docs[0].data() as TimeTableDoc;
          setTimetable(timetableData);
          
          // Cache timetable data for offline use
          if (typeof window !== 'undefined' && auth.currentUser?.uid) {
            localStorage.setItem(auth.currentUser.uid, JSON.stringify(timetableData));
            setLastSynced(new Date());
            console.log('✅ Timetable cached for offline access');
          }
        }
        setLoading(false);
      },
      err => {
        if (!mounted) return;
        console.error('Firestore error:', err);
        setError(err.message);
        // Try to load from local storage when network fails
        if (typeof window !== 'undefined' && auth.currentUser?.uid && !isOnline) {
          try {
            const cachedData = localStorage.getItem(auth.currentUser.uid);
            if (cachedData) {
              const parsedData = JSON.parse(cachedData);
              setTimetable(parsedData);
              console.log('🔄 Firebase failed, using cached timetable data');
              setError('Connection issue - using cached timetable');
            }
          } catch (cacheError) {
            console.error('Error loading cached timetable:', cacheError);
            setError('Error loading cached timetable');
          }
        }
        
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userData, user, isOnline]);

  const refreshTimetable = async () => {
    if (!userData) return;
    setLoading(true);
    setError(null);
    
    try {
      // Re-fetch data
      const q = query(
        collection(db, "TimeTable"),
        where("department_uploaded", "==", userData.department),
        where("year_uploaded", "==", userData.year),
        where("section_uploaded", "==", userData.section),
        where("semester_uploaded", "==", userData.semester),
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const timetableData = snapshot.docs[0].data() as TimeTableDoc;
        setTimetable(timetableData);
        setLastSynced(new Date());
        
        // Update cache
        if (typeof window !== 'undefined') {
          localStorage.setItem(auth.currentUser?.uid!, JSON.stringify(timetableData));
        }
        
        console.log('✅ Timetable refreshed successfully');
      }
    } catch (err) {
      console.error('Error refreshing timetable:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh timetable';
      setError(errorMessage);
      
      // If refresh fails and we're offline, show cached data message
      if (typeof window !== 'undefined' && !isOnline) {
        setError('Offline - showing cached data');
      }
    } finally {
      setLoading(false);
    }
  };

  const value: TimetableContextValue = { 
    timetable, 
    loading, 
    error,
    
    lastSynced,
    refreshTimetable
  };
  
  return (
    <TimetableContext.Provider value={value}>
      {children}
    </TimetableContext.Provider>
  );
}