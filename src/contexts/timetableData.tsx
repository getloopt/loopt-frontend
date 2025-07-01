import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase-config";
import { useAuth } from "./AuthContext";

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
};

const TimetableContext = createContext<TimetableContextValue>({
  timetable: null,
  loading: true,
  error: null,
});

export function useTimetable() {
  return useContext(TimetableContext);
}

/* 2.  Provider */
export function TimetableProvider({ children }: { children: React.ReactNode }) {
  const { userData, user } = useAuth();      // you already have this
  const [timetable, setTimetable] = useState<TimeTableDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData || !user?.email) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "TimeTable"),
      where("department_uploaded", "==", userData.department),
      where("year_uploaded",       "==", userData.year),
      where("section_uploaded",    "==", userData.section),
      where("semester_uploaded",   "==", userData.semester),
    );

    const unsub = onSnapshot(
      q,
      snap => {
        if (snap.empty) {
          setTimetable(null);
        } else {
          setTimetable(snap.docs[0].data() as TimeTableDoc);
        }
        setLoading(false);
      },
      err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsub();        // tidy up when user logs out
  }, [userData, user]);

  const value: TimetableContextValue = { timetable, loading, error };
  return (
    <TimetableContext.Provider value={value}>
      {children}
    </TimetableContext.Provider>
  );
}
