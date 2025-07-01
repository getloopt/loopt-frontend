import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit2, Plus, X, Trash2 } from 'lucide-react';
import { IoMdArrowDropdown } from "react-icons/io";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/ui/dialog"
import { Input } from "@/components/ui/ui/input"
import { Label } from "@/components/ui/ui/label"
import { Button } from "@/components/ui/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/ui/dropdown-menu"
import { type CarouselApi } from "@/components/ui/ui/carousel"
import { useAuth } from '@/contexts/AuthContext';
import { db } from '../../../firebase-config';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

// Define a type for our course data for better type checking
interface Course {
    code: string;
    title: string;
    faculty: string[];
    category: string;
    credits: string;
    facultyInitials: string;
}

const getCategoryColor = (category: string): string => {
    switch (category) {
        case 'PC':
            return 'border-blue-500/50';
        case 'PE':
            return 'border-green-500/50';
        default:
            return 'border-gray-500/50';
    }
};

const FormTimetable = () => {
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)

    // State to hold newly added courses
    const [newCourses, setNewCourses] = useState<Course[]>([])

    // Dialog form state
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        category: 'PC',
        credits: '',
        faculty: '', // comma-separated string, will be split into array
        facultyInitials: '',
    })

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [originalCode, setOriginalCode] = useState<string | null>(null);
    const [editingFacultyInput, setEditingFacultyInput] = useState<string>('');

    // Add this state to track all courses
    const [sampleCourses, setSampleCourses] = useState<Course[]>([]);
    const { user, userData } = useAuth();

    useEffect(() => {
        if (!user || !userData) return;

        const fetchCourses = async () => {
            try {
                const timetableCollectionRef = collection(db, 'TimeTable');
                const q = query(
                    timetableCollectionRef,
                    where('department_uploaded', '==', userData.department),
                    where('year_uploaded', '==', userData.year),
                    where('section_uploaded', '==', userData.section),
                    where('semester_uploaded', '==', userData.semester)
                );
                const querySnapshot = await getDocs(q);
    
                if(!querySnapshot.empty) {
                    const timetableDoc = querySnapshot.docs[0].data();
                    if (timetableDoc['course-code']) {
                        const courses = timetableDoc['course-code'].map((c: any) => ({
                            code: c.code,
                            title: c.courseTitle,
                            faculty: c.faculty.map((f: any) => f.name),
                            category: c.category,
                            credits: c.CP,
                            facultyInitials: c.faculty.map((f: any) => f.initial).join(', '),
                        }));
                        setSampleCourses(courses);
                    }
                }
            } catch (error) {
                console.error("Error fetching courses from Firestore:", error);
            }
        };

        fetchCourses();
    }, [user, userData]);

    useEffect(() => {
        if (!api) {
            return
        }

        setCurrent(api.selectedScrollSnap() + 1)

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1)
        })
    }, [api])

    const toggleCardExpand = (courseCode: string) => {
        setExpandedCards(prev => ({
            ...prev,
            [courseCode]: !prev[courseCode]
        }));
    };

    const handleCourseEdit = (code: string, courseData: Course) => {
        setOriginalCode(code);
        setEditingCourse(courseData);
        setEditingFacultyInput(courseData.faculty.join(', '));
        setEditDialogOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingCourse || !originalCode) return;

        // Create a new course object with the edited values
        const updatedCourse: Course = {
            ...editingCourse,
            code: editingCourse.code.trim(),
            title: editingCourse.title.trim(),
            category: editingCourse.category,
            credits: editingCourse.credits.trim(),
            faculty: editingFacultyInput.split(',').map(f => f.trim()).filter(Boolean),
            facultyInitials: editingCourse.facultyInitials.trim(),
        };

        // Check if the course is from sampleCourses or newCourses
        const isFromSample = sampleCourses.some(course => course.code === originalCode);

        if (isFromSample) {
            setSampleCourses(prev => {
                const updated = prev.map(course => course.code === originalCode ? updatedCourse : course);
                saveCoursesToFirestore([...updated, ...newCourses]);
                return updated;
            });
        } else {
            setNewCourses(prev => {
                const updated = prev.map(course => course.code === originalCode ? updatedCourse : course);
                saveCoursesToFirestore([...sampleCourses, ...updated]);
                return updated;
            });
        }

        setEditDialogOpen(false);
        setEditingCourse(null);
        setOriginalCode(null);
    };

    const handleAddCourse = () => {
        if (!formData.code.trim() || !formData.title.trim()) {
            alert('Please provide Course Code and Title');
            return;
        }
        const newCourse: Course = {
            code: formData.code.trim(),
            title: formData.title.trim(),
            category: formData.category,
            credits: formData.credits.trim(),
            faculty: formData.faculty.split(',').map(f => f.trim()).filter(Boolean),
            facultyInitials: formData.facultyInitials.trim(),
        };
        setNewCourses(prev => {
            const updated = [...prev, newCourse];
            saveCoursesToFirestore([...sampleCourses, ...updated]);
            return updated;
        });
        // reset form
        setFormData({ code: '', title: '', category: 'PC', credits: '', faculty: '', facultyInitials: '' });
    };

    const handleDeleteCourse = (courseCode: string) => {
        setNewCourses(prev => {
            const updated = prev.filter(course => course.code !== courseCode);
            saveCoursesToFirestore([...sampleCourses, ...updated]);
            return updated;
        });
    };

    // Update the combinedCourses calculation
    const combinedCourses: Course[] = [...sampleCourses, ...newCourses];

    /* ---------------------- 🔄 Firestore helpers ---------------------- */
    const getTimetableDocRef = async () => {
        if (!user?.email || !userData) throw new Error('User not authenticated or user data missing');
        const timetableCol = collection(db, 'TimeTable');
        const q = query(
            timetableCol,
            where('department', '==', userData.department),
            where('year', '==', userData.year),
            where('section', '==', userData.section),
            where('semester', '==', userData.semester)
        );
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].ref;
        
        const newRef = doc(timetableCol);
        await setDoc(newRef, { 
            email: user.email, 
            department: userData.department,
            year: userData.year,
            section: userData.section,
            semester: userData.semester,
            'course-code': [] 
        });
        return newRef;
    };

    const toFirestoreCourse = (c: Course) => ({
        code: c.code,
        courseTitle: c.title,
        category: c.category,
        CP: c.credits,
        faculty: c.faculty.map((name, index) => ({
            initial: c.facultyInitials.split(',')[index]?.trim() || '',
            name,
        })),
    });

    const saveCoursesToFirestore = async (allCourses: Course[]) => {
        try {
            const docRef = await getTimetableDocRef();
            await updateDoc(docRef, {
                'course-code': allCourses.map(toFirestoreCourse),
            });
        } catch (err) {
            console.error('Could not update Firestore courses:', err);
        }
    };

    return (
        <div className='flex flex-col items-start lg:translate-x-30 justify-start w-full px-4 md:px-10 lg:px-20 sm:translate-x-30'>
        
                <div className='w-full max-w-2xl mx-auto space-y-4  sm:overflow-y-auto overflow-auto scroll-smooth pb-30 sm:h-[90vh] lg:-translate-x-40 sm:-translate-x-30 '>
                    {/* Add Course Card wrapped with DialogTrigger */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className='bg-black/30 backdrop-blur-md rounded-lg shadow border border-white/10 text-white p-10 cursor-pointer hover:bg-black/40 transition w-[20rem] sm:w-[30rem]'>
                                <div className='flex flex-col items-center justify-center w-full h-[5vh] py-10 border-2 border-white/15 border-dashed '>
                                    <Plus className='w-5 h-5 mb-1 text-white/40' />
                                    <h2 className='text-lg font-semibold text-white/40'>Add New Course</h2>
                                </div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className='sm:max-w-md max-h-[90vh] bg-[#141415] text-white/80 px-10 overflow-y-auto'>
                            <DialogHeader>
                                <DialogTitle className='sm:text-xl'>Add New Course</DialogTitle>
                                <DialogDescription className='text-md'>Enter the course details below.</DialogDescription>
                            </DialogHeader>
                            <div className='flex flex-col gap-4 py-4'>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='code' className='text-md mb-0.5'>Code</Label>
                                    <Input 
                                        id='code' 
                                        value={formData.code} 
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                                        placeholder='UBM2603'
                                        className='border-white/10 border-1 p-5 text-lg placeholder:sm:text-lg font-proxima-nova'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='title' className='text-md mb-0.5'>Title</Label>
                                    <Input 
                                        id='title' 
                                        value={formData.title} 
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                        placeholder='Medical Image Processing'
                                        className='border-white/10 border-1 p-5 text-lg placeholder:sm:text-lg font-proxima-nova'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='category' className='text-md mb-0.5 '>Category</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                className="w-full justify-between p-5 sm:text-lg border-white/10 border-1 bg-[#141415] px-3 py-2 hover:bg-[#141415] hover:text-none cursor-pointer font-proxima-nova"
                                            >
                                                {formData.category === 'PC' ? 
                                                    (<div className="flex items-center gap-1">
                                                        <span>PC</span>
                                                        <span className='numeric-input'>-</span>
                                                        <span >Program Core</span>
                                                    </div>) : 
                                                    (<div className="flex items-center gap-1">
                                                        <span >PE</span>
                                                        <span className='numeric-input'>-</span>
                                                        <span>Program Elective</span>
                                                    </div>)
                                                }
                                                <IoMdArrowDropdown />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[90vw] h-[40vh] sm:w-[40vw] bg-[#141415] border-1 border-white/10">
                                            <DropdownMenuItem 
                                                className="cursor-pointer sm:text-lg text-white hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm" 
                                                onClick={() => setFormData({ ...formData, category: 'PC' })}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span>PC</span>
                                                    <span className='numeric-input'>-</span>
                                                    <span>Program Core</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                className="cursor-pointer sm:text-lg text-white hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-s"
                                                onClick={() => setFormData({ ...formData, category: 'PE' })}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span>PE</span>
                                                    <span className='numeric-input'>-</span>
                                                    <span>Program Elective</span>
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='credits' className='text-md mb-0.5'>Credits</Label>
                                    <Input 
                                        id='credits' 
                                        value={formData.credits} 
                                        onChange={(e) => setFormData({ ...formData, credits: e.target.value })} 
                                        placeholder="3 (0 + 0 + 0 + 3)"
                                        className='border-white/10 border-1 p-5 text-lg placeholder:text-lg sm:text-lg numeric-input'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='faculty' className='text-md mb-0.5'>Faculty</Label>
                                    <Input 
                                        id='faculty' 
                                        value={formData.faculty} 
                                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })} 
                                        placeholder='Dr. K. Nirmala, Dr. B. Geethanjali'
                                        className='border-white/10 border-1 p-5 text-lg sm:text-xl placeholder:text-xl font-proxima-nova'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='faculty-initials' className='text-md mb-0.5'>Faculty Initials</Label>
                                    <Input 
                                        id='faculty-initials' 
                                        value={formData.facultyInitials} 
                                        onChange={(e) => setFormData({ ...formData, facultyInitials: e.target.value })} 
                                        placeholder='KN, BG'
                                        className='border-white/10 border-1 p-5 text-lg sm:text-xl placeholder:text-xl font-proxima-nova'
                                    />
                                </div>
                            </div>
                            <DialogFooter className='flex justify-between gap-35 sticky bottom-0 bg-[#141415] py-4'>
                                <Button onClick={handleAddCourse} className='w-1/4 absolute right-5 -bottom-3 button-normal'>Add Course</Button>
                                <DialogClose asChild>
                                    <Button variant='secondary' type='button' className='w-1/4 absolute left-5 -bottom-3 button-close'>Close</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Course Dialog */}
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                        <DialogContent className='sm:max-w-md max-h-[90vh] bg-[#141415] text-white/80 px-10 overflow-y-auto'>
                            <DialogHeader>
                                <DialogTitle className='sm:text-xl'>Edit Course</DialogTitle>
                                <DialogDescription className='text-md'>Modify the course details below.</DialogDescription>
                            </DialogHeader>
                            <div className='flex flex-col gap-4 py-4'>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='edit-code' className='text-md mb-0.5'>Code</Label>
                                    <Input 
                                        id='edit-code' 
                                        value={editingCourse?.code || ''} 
                                        onChange={(e) => setEditingCourse(prev => prev ? {...prev, code: e.target.value} : null)} 
                                        placeholder={editingCourse?.code || 'UBM2603'}
                                        className='border-white/10 border-1 p-5 text-xl sm:text-xl placeholder:text-xl font-proxima-nova'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='edit-title' className='text-md mb-0.5'>Title</Label>
                                    <Input 
                                        id='edit-title' 
                                        value={editingCourse?.title || ''} 
                                        onChange={(e) => setEditingCourse(prev => prev ? {...prev, title: e.target.value} : null)} 
                                        placeholder={editingCourse?.title || 'Medical Image Processing'}
                                        className='border-white/10 border-1 p-5 text-xl sm:text-xl placeholder:text-xl font-proxima-nova'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='edit-category' className='text-md mb-0.5'>Category</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                className="w-full justify-between p-5 text-lg sm:text-sm border-white/10 border-1 bg-[#141415] px-3 py-2 hover:bg-[#141415] hover:text-none cursor-pointer font-proxima-nova"
                                            >
                                                {editingCourse?.category === 'PC' ? 
                                                    (<div className="flex items-center gap-1">
                                                        <span>PC</span>
                                                        <span className='numeric-input'>-</span>
                                                        <span>Program Core</span>
                                                    </div>) : 
                                                    (<div className="flex items-center gap-1">
                                                        <span>PE</span>
                                                        <span className='numeric-input'>-</span>
                                                        <span>Program Elective</span>
                                                    </div>)
                                                }
                                                <IoMdArrowDropdown />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[90vw] h-[15vh] sm:w-[30vw] sm:h-[15vh] bg-[#141415] border-1 border-white/10">
                                            <DropdownMenuItem 
                                                className="cursor-pointer text-lg sm:text-sm text-white hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm p-4"
                                                onClick={() => setEditingCourse(prev => prev ? {...prev, category: 'PC'} : null)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span>PC</span>
                                                    <span className='numeric-input'>-</span>
                                                    <span>Program Core</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                    className="cursor-pointer text-lg sm:text-sm text-white hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-s p-4"
                                                onClick={() => setEditingCourse(prev => prev ? {...prev, category: 'PE'} : null)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span>PE</span>
                                                    <span className='numeric-input'>-</span>
                                                    <span>Program Elective</span>
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='edit-credits' className='text-md mb-0.5'>Credits</Label>
                                    <Input 
                                        id='edit-credits' 
                                        value={editingCourse?.credits || ''} 
                                        onChange={(e) => setEditingCourse(prev => prev ? {...prev, credits: e.target.value} : null)} 
                                        placeholder={editingCourse?.credits || '3 (0 + 0 + 0 + 3)'}
                                        className='border-white/10 border-1 p-5 text-lg sm:text-xl placeholder:text-xl numeric-input'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='edit-faculty' className='text-md mb-0.5'>Faculty</Label>
                                    <Input 
                                        id='edit-faculty' 
                                        value={editingFacultyInput} 
                                        onChange={(e) => setEditingFacultyInput(e.target.value)} 
                                        placeholder='Dr. K. Nirmala, Dr. B. Geethanjali'
                                        className='border-white/10 border-1 p-5 text-lg sm:text-xl placeholder:text-xl font-proxima-nova'
                                    />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Label htmlFor='edit-faculty-initials' className='text-md mb-0.5'>Faculty Initials</Label>
                                    <Input 
                                        id='edit-faculty-initials' 
                                        value={editingCourse?.facultyInitials || ''} 
                                        onChange={(e) => setEditingCourse(prev => prev ? {...prev, facultyInitials: e.target.value} : null)} 
                                        placeholder={editingCourse?.facultyInitials || 'KN, BG'}
                                        className='border-white/10 border-1 p-5 text-lg sm:text-xl placeholder:text-xl font-proxima-nova'
                                    />
                                </div>
                            </div>
                            <DialogFooter className='flex justify-between gap-35 bottom-0 bg-[#141415] py-4'>
                                <Button onClick={handleSaveEdit} className='w-1/4 bottom-0 absolute right-5 button-normal '>Save</Button>
                                <DialogClose asChild>
                                    <Button variant='secondary' type='button' className='w-1/4 absolute bottom-0 left-5 button-close'>Cancel</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Render combined course cards */}
                    {combinedCourses.map((course) => {
                        const courseCardId = `course-${course.code}`;
                        const isCourseExpanded = expandedCards[courseCardId];
                        return (
                            <div key={course.code} className="bg-black/30 backdrop-blur-md rounded-lg shadow border border-white/10 text-white sm:w-[30rem] w-[20rem]">
                                <div className="p-4 cursor-pointer" onClick={() => toggleCardExpand(courseCardId)}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-md sm:text-lg">Course {course.code}</span>
                                                <span className="text-xs px-2 py-0.5 bg-white/20 rounded text-gray-300">{course.category}</span>
                                            </div>
                                            <div className={`p-2 rounded border ${getCategoryColor(course.category)} backdrop-blur-sm`}>
                                                <div className="font-medium text-md sm:text-lg">{course.code}</div>
                                                {!isCourseExpanded && <div className="text-sm mt-1 opacity-90">{course.title}</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/10 rounded-full transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCourse(course.code);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                className="p-1 text-gray-400 hover:cursor-pointer"
                                                onClick={() => toggleCardExpand(courseCardId)}
                                            >
                                                {isCourseExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    {isCourseExpanded && (
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <div className="space-y-2 text-sm text-gray-300">
                                                <div><strong>Title:</strong> {course.title}</div>
                                                <div>
                                                    <strong>Faculty:</strong>
                                                    <ul className="mt-1 ml-4 list-disc">
                                                        {course.faculty.map((f, idx) => <li key={idx}>{f}</li>)}
                                                    </ul>
                                                </div>
                                                <div><strong>Faculty Initials:</strong> {course.facultyInitials}</div>
                                                <div><strong>Credits:</strong> {course.credits}</div>
                                                <div><strong>Category:</strong> {course.category === 'PC' ? 'Program Core' : 'Program Elective'}</div>
                                            </div>
                                            <button className="mt-3 w-full button-normal text-white flex items-center justify-center gap-2 transition-colors" onClick={(e) => { e.stopPropagation(); handleCourseEdit(course.code, course); }}>
                                                <Edit2 className="w-4 h-4" />
                                                Edit Course Details
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
        </div>
    );
}

export default FormTimetable;