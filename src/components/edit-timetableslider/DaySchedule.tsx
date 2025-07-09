import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit2, Plus, Clock, Trash2, Icon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/ui/dialog";
import { Input } from "@/components/ui/ui/input";
import { Label } from "@/components/ui/ui/label";
import { Button } from "@/components/ui/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '../../../firebase-config';
import { toast } from 'sonner';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useTimetable } from '@/contexts/timetableData';

interface Activity {
  code: string | null;
  courseTitle: string;
  room: string;
  faculty?: { initial: string; name: string }[];
  iscode?: boolean;
}

interface Period {
  period: string;
  iscode: boolean;
  startTime: string;
  endTime: string;
  Activity: Activity[];
}

interface DayScheduleProps {
  day: string;
}

interface TimetableData {
    day: { [key: string]: Period[] };
    PeriodandTimings: { period: string, timing: string }[];
    classRoom: string;
}

const DaySchedule: React.FC<DayScheduleProps> = ({ day }) => {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [roomData, setRoomData] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    const { timetable } = useTimetable();

    useEffect(() => {
      if (!timetable) return;

      if (timetable.day && timetable.PeriodandTimings) {
        const dayData: Period[] = timetable.day[day] || [];
        setRoomData(timetable.classRoom || '');
        
        const fullPeriods: Period[] = timetable.PeriodandTimings.map((pt: any) => {
          const found = dayData.find((p: any) => p.period === pt.period);
          if (found) return found;
          
          const [start, end] = (pt.timing as string).split(' - ');
          return {
            period: pt.period,
            iscode: false,
            startTime: start.trim(), 
            endTime: end.trim(),
            Activity: [],
          } as Period;
        });

        setPeriods(fullPeriods);
      } else {
        console.error("Timetable data is incomplete.", timetable);
        setPeriods([]);
        setRoomData('');
      }
    }, [timetable, day]);


  }, [day, user]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedOption, setSelectedOption] = useState<Record<string, number>>({});

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPeriodIndex, setEditingPeriodIndex] = useState<number | null>(null);
  const [deletingPeriodIndex, setDeletingPeriodIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<Activity>({ code: null, courseTitle: '', room: '', faculty: [] });

  const toggleExpand = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleOptionChange = (periodIdx: number, optIdx: number) => {
    setSelectedOption(prev => ({ ...prev, [periodIdx]: optIdx }));
  };

  const openAddDialog = (periodIdx: number) => {
    setEditingPeriodIndex(periodIdx);
    setFormData({ code: null, courseTitle: '', room: '', faculty: [] });
    setAddDialogOpen(true);
  };

  const openEditDialog = (periodIdx: number) => {
    const p = periods[periodIdx];
    const optIdx = selectedOption[periodIdx] ?? 0;
    const act = p.Activity[optIdx];
    setEditingPeriodIndex(periodIdx);
    // Convert faculty array to a comma-separated string for display
    setFormData({ 
      ...act,
      faculty: [{ 
        initial: '', 
        name: act.faculty?.map(f => f.name).join(', ') || '' 
      }]
    });
    setEditDialogOpen(true);
  };

  const handleFacultyNameInput = (rawInput: string | undefined) => {
    if (!rawInput || !rawInput.trim()) return [];
    
    // Split by comma and process each name
    const facultyNames = rawInput.split(',').map(name => name.trim()).filter(name => name !== '');
    return facultyNames.map(name => ({
      initial: name.split(/\s+/)[0].split(/\./).filter(part => part.length > 0 && part.toLowerCase() !== 'dr').map(part => part.charAt(0).toUpperCase()).join(''),
      name: name
    }));
  };

  const handleDeleteActivity = (periodIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const period = periods[periodIdx];
    const optIdx = selectedOption[periodIdx] ?? 0;
    
    let updatedPeriods: Period[] = [];
    if (period.Activity.length > 1) {
      // remove only the selected option
      const newActivities = period.Activity.filter((_, idx) => idx !== optIdx);
      updatedPeriods = periods.map((p, idx) =>
        idx === periodIdx ? { ...p, Activity: newActivities } : p
      );

      // Reset selected option if the deleted option was the last one
      if (optIdx >= newActivities.length) {
        setSelectedOption(prev => ({
          ...prev,
          [periodIdx]: Math.max(0, newActivities.length - 1)
        }));
      }
    } else {
      // remove entire activity array
      updatedPeriods = periods.map((p, idx) =>
        idx === periodIdx ? { ...p, Activity: [] } : p
      );

      setSelectedOption(prev => {
        const newSel = { ...prev };
        delete newSel[periodIdx];
        return newSel;
      });
    }

    setPeriods(updatedPeriods);
    savePeriodsToFirestore(updatedPeriods);
  };

  const getTimetableDocRef = async () => {
    if (!user?.email) throw new Error('User not authenticated');
    const timetableCol = collection(db, 'TimeTable');
    const q = query(timetableCol, where('email', '==', user.email));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].ref;

    // If no document create an empty shell so future updates succeed
    const newRef = doc(timetableCol);
    await setDoc(newRef, {
      email: user.email,
      day: {},
    });
    return newRef;
  };

  const savePeriodsToFirestore = async (updatedPeriods: Period[]) => {
    try {
      const docRef = await getTimetableDocRef();
      await updateDoc(docRef, { [`day.${day}`]: updatedPeriods });
    } catch (err) {
      console.error('Error saving timetable back to Firestore:', err);
      toast.error("Error saving timetable back to Firestore. Please try again.");
    }

  };

  const saveNewActivity = () => {
    if (editingPeriodIndex === null) return;
    
    // Validate required fields
    if (!formData.courseTitle.trim()) {
      alert("Please provide a title for the activity");
      return;
    }
    
    const requireFaculty = periods[editingPeriodIndex].iscode && formData.code?.trim();
    if (requireFaculty && (!formData.faculty || formData.faculty.length === 0 || !formData.faculty[0].name.trim())) {
      alert("Please fill in faculty information for this course");
      return;
    }

    const newAct: Activity = {
      ...formData,
      code: formData.code?.trim() ? formData.code.trim() : null,
      faculty: formData.code?.trim() ? handleFacultyNameInput(formData.faculty?.[0]?.name) : []
    };

    const newPeriods = periods.map((p, idx) =>
      idx === editingPeriodIndex ? { ...p, Activity: [...p.Activity, newAct] } : p
    );
    setPeriods(newPeriods);
    savePeriodsToFirestore(newPeriods);
    localStorage.setItem(auth.currentUser?.uid!, JSON.stringify(newPeriods));
    setAddDialogOpen(false);
  };

  const saveEditedActivity = () => {
    if (editingPeriodIndex === null) return;
    
    // Validate required fields
    if (!formData.courseTitle.trim()) {
      alert("Please provide a title for the activity");
      return;
    }
    
    const needFaculty = periods[editingPeriodIndex].iscode && formData.code?.trim();
    if (needFaculty && (!formData.faculty || formData.faculty.length === 0 || !formData.faculty[0].name.trim())) {
      alert("Please fill in faculty information for this course");
      return;
    }

    const editedPeriods = periods.map((p, idx) => {
      if (idx !== editingPeriodIndex) return p;
      const optIdx = selectedOption[editingPeriodIndex] ?? 0;
      const newActs = p.Activity.map((a, ai) => {
        if (ai !== optIdx) return a;
        return {
          ...formData,
          code: formData.code?.trim() ? formData.code.trim() : null,
          faculty: formData.code?.trim() ? handleFacultyNameInput(formData.faculty?.[0]?.name) :[]
        };
      });
      return { ...p, Activity: newActs };
    });
    setPeriods(editedPeriods);
    savePeriodsToFirestore(editedPeriods);
    localStorage.setItem(auth.currentUser?.uid!, JSON.stringify(editedPeriods));
    setEditDialogOpen(false);
  };

  return (
    <div className="space-y-4 w-full">
      {periods.map((period, idx) => {
        const isExpanded = expanded[idx];
        const optCount = period.Activity.length;
        const optIdx = selectedOption[idx] ?? 0;
        const activity = period.Activity[optIdx];

        return (
          <div key={idx} className="sm:w-[26rem] w-[20rem]">
            <div className="bg-black/30 backdrop-blur-md rounded-lg shadow border border-white/10 text-white max-sm:translate-x-0">
              <div
                className={`p-4 cursor-pointer ${isExpanded ? '' : 'min-h-[140px]'}`}
                onClick={() => toggleExpand(idx)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                  
                    <div className="flex items-center gap-2 mb-1">
                    <span className='absolute z-50 right-10'> <Trash2 className='w-4 h-4 mr-3 mb-2 hover:text-red-500' onClick={(e) => handleDeleteActivity(idx, e)}/> </span>
                      <span className="font-semibold text-md sm:text-lg">Period {period.period}</span>
                      <span className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {period.startTime} - {period.endTime}</span>
                      
                      
                    </div>
                    {optCount > 1 && optCount > 0 && (
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-white">Option {optIdx + 1} of {optCount}</span>
                        {[...Array(optCount)].map((_, o) => (
                          <button
                            key={o}
                            onClick={(e) => { e.stopPropagation(); handleOptionChange(idx, o); }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${o === optIdx ? 'bg-[#5d4c9d]' : 'bg-white/25'} text-white`}
                          >{o + 1}</button>
                        ))}
                      </div>
                    )}
                    {activity ? (
                      <div className="p-2 rounded border border-violet-400/50 backdrop-blur-sm">
                        {activity.code!==null ? (
                          <>
                            <div className="font-medium text-md sm:text-lg numeric-input break-words">{activity.code}</div>
                            {!isExpanded && <div className="text-sm mt-1 opacity-90 break-words">{activity.courseTitle}</div>}
                          </>
                        ) : (
                          <div className="font-medium text-md sm:text-lg break-words">{activity.courseTitle}</div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="mt-2 border-2 border-dashed border-white/30 rounded-lg p-6 text-center text-white/40 hover:bg-white/5"
                        onClick={(e) => { e.stopPropagation(); openAddDialog(idx); }}
                      >
                        + Add Class
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {activity && isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                {activity && isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="space-y-2 text-sm text-gray-300">
                      <div><strong>Title:</strong> {activity.courseTitle}</div>
                      {activity.faculty && activity.faculty.length > 0 && (
                        <div><strong>Faculty:</strong> {activity.faculty.map((f) => f.name).join(', ')}</div>
                      )}
                      {activity.code!==null && (
                        <div><strong>Code:</strong> {activity.code}</div>
                      )}

                    </div>
                    

                    <div className="mt-3 flex flex-col gap-2">
                      <Button className="w-full button-normal flex items-center gap-2 justify-center" onClick={(e) => { e.stopPropagation(); openEditDialog(idx); }}>
                        <Edit2 className="w-4 h-4" /> Edit Activity Details
                      </Button>
                      <Button className="w-full button-normal flex items-center gap-2 justify-center" onClick={(e) => { e.stopPropagation(); openAddDialog(idx); }}>
                        <Plus className="w-4 h-4" /> Add Activity Option
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Activity Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] bg-[#141415] text-white/80 px-10 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sm:text-xl">Add Activity</DialogTitle>
            <DialogDescription className="text-md">Enter the activity details below.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code" className="text-md mb-0.5 numeric-input">Code</Label>
              <Input id="code" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value as string | null })} placeholder="UBM2604" className="border-white/10 border-1 p-5 text-lg placeholder:text-lg font-proxima-nova placeholder:numeric-input numeric-input" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="text-md mb-0.5 numeric-input">Title</Label>
              <Input id="title" value={formData.courseTitle} onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })} placeholder="Course Title" className="border-white/10 border-1 p-5 text-lg placeholder:text-lg font-proxima-nova placeholder:numeric-input numeric-input" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="faculty" className="text-md mb-0.5 numeric-input">Faculty (optional)</Label>
              <Input 
                id="faculty" 
                value={formData.faculty?.[0]?.name || ''} 
                onChange={(e) => setFormData({
                  ...formData,
                  faculty: [{ initial: '', name: e.target.value }]
                })}
                placeholder="Faculty names separated by commas" 
                className="border-white/10 border-1 p-5 text-lg placeholder:text-lg font-proxima-nova placeholder:numeric-input" 
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-35 sticky bottom-0 bg-[#141415] py-4">
            <Button onClick={saveNewActivity} className="w-1/4 absolute right-5 button-normal bottom-0">Add</Button>
            <DialogClose asChild>
              <Button variant="secondary" type="button" className="w-1/4 absolute left-5 button-close bottom-0">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] bg-[#141415] text-white/80 px-10 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sm:text-xl">Edit Activity</DialogTitle>
            <DialogDescription className="text-md">Modify the activity details below.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ecode" className="text-md mb-0.5">Code</Label>
              <Input id="ecode" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value as string | null })} placeholder="UBM2604" className="border-white/10 border-1 p-5 text-lg placeholder:text-lg  numeric-input" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="etitle" className="text-md mb-0.5">Title</Label>
              <Input id="etitle" value={formData.courseTitle} onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })} placeholder="Course Title" className="border-white/10 border-1 p-5 text-lg placeholder:text-lg font-proxima-nova numeric-input" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="faculty" className="text-md mb-0.5 numeric-input">Faculty (optional)</Label>
              <Input 
                id="faculty" 
                value={formData.faculty?.[0]?.name || ''} 
                onChange={(e) => setFormData({
                  ...formData,
                  faculty: [{ initial: '', name: e.target.value }]
                })}
                placeholder="Dr.K.Gowri, Dr.R.Suresh" 
                className="border-white/10 border-1 p-5 text-lg placeholder:text-lg font-proxima-nova" 
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-35 sticky bottom-0 bg-[#141415] py-4">
            <Button onClick={saveEditedActivity} className="w-1/4 absolute right-5 button-normal bottom-0 ">Save</Button>
            <DialogClose asChild>
              <Button variant="secondary" type="button" className="w-1/4 absolute left-5 button-close bottom-0">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DaySchedule; 