import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoteSettings, useCandidates, useVoteStats } from '../hooks/useVote';
import { useIGPageSettings } from '../hooks/useIGPageSettings';
import { db, getAllUsers, setUserRole, uploadImage } from '../firebaseApp';
import { doc, updateDoc, collection, addDoc, deleteDoc, Timestamp, getDocs, query, where, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import BottomNav from '../components/BottomNav';
import type { VoteCategory } from '../hooks/useVote'; // นำเข้า type ถ้ามี
import { logAdminAdjustPoints, logAttendanceCheck } from '../utils/activityLogger';
import ActivityLogsViewer from '../components/ActivityLogsViewer';

// ✅ 1. เพิ่ม sheetId และ imageFile ใน Interface
interface CandidateForm {
    name: string;
    description: string;
    imageUrl: string;
    sheetId: string;
    imageFile: File | null;
}

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    points: number;
    photoURL?: string;
    attendance?: {
        day1?: boolean;
        day2?: boolean;
        day3?: boolean;
    };
}

export default function Admin() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { categories: voteSettings, loading } = useVoteSettings();
    const { settings: igPageSettings, toggleIGPage } = useIGPageSettings();
    const [selectedCategory, setSelectedCategory] = useState('band');
    const { candidates } = useCandidates(selectedCategory);
    const { totalVotes } = useVoteStats(selectedCategory);

    const [showAddModal, setShowAddModal] = useState(false);
    
    // ✅ 2. เพิ่มค่าเริ่มต้น sheetId และ imageFile
    const [newCandidate, setNewCandidate] = useState<CandidateForm>({
        name: '',
        description: '',
        imageUrl: '',
        sheetId: '',
        imageFile: null
    });
    const [uploadingImage, setUploadingImage] = useState(false);

    // User Management (for Admin and SuperAdmin)
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [activeTab, setActiveTab] = useState<'vote' | 'users' | 'categories' | 'logs'>('vote');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editPoints, setEditPoints] = useState<number>(0);

    // Category Management State
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newCategory, setNewCategory] = useState({
        id: '',
        title: '',
        description: '',
    });

    // ✅ เพิ่ม State สำหรับระบบใหม่
    const [editingPurchasePoints, setEditingPurchasePoints] = useState<{ [key: string]: number }>({});
    const [scoreDisplayMode, setScoreDisplayMode] = useState<'app30' | 'purchase70' | 'total100'>('total100');
    const [announcementVisible, setAnnouncementVisible] = useState(true);

    const isAdmin = currentUser?.role === 'admin';
    const isSuperAdmin = currentUser?.role === 'superadmin';
    const canManageUsers = isAdmin || isSuperAdmin;

    // Check if user is admin or superadmin
    useEffect(() => {
        if (!loading && !['admin', 'superadmin'].includes(currentUser?.role || '')) {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้า Admin Dashboard');
            navigate('/');
        }
    }, [currentUser, loading, navigate]);

    // Load users if admin/superadmin
    useEffect(() => {
        if (canManageUsers && activeTab === 'users') {
            loadUsers();
        }
    }, [canManageUsers, activeTab]);

    // ✅ โหลด Podium Settings
    useEffect(() => {
        const loadPodiumSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'podium');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setScoreDisplayMode(docSnap.data().displayMode || 'total100');
                }
            } catch (error) {
                console.error('Error loading podium settings:', error);
            }
        };
        loadPodiumSettings();
    }, []);

    // ✅ โหลด Announcement Settings
    useEffect(() => {
        const loadAnnouncementSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'announcement');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setAnnouncementVisible(docSnap.data().visible ?? true);
                }
            } catch (error) {
                console.error('Error loading announcement settings:', error);
            }
        };
        loadAnnouncementSettings();
    }, []);

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const allUsers = await getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Failed to load users:', error);
            alert('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        } finally {
            setLoadingUsers(false);
        }
    };

    // ฟังก์ชันส่งข้อมูลไป Google Sheet
    const syncToSheet = async (category: string) => {
        try {
            console.log(`📤 Starting sync to Sheet for ${category}...`);
            
            // 1. ดึงข้อมูลผู้สมัครทั้งหมดในหมวดนี้
            const candidatesRef = collection(db, 'candidates');
            const q = query(candidatesRef, where('category', '==', category));
            const snapshot = await getDocs(q);
            
            // 2. เตรียมข้อมูล JSON { "sheetID": voteCount }
            const payload: Record<string, number> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.sheetId) {
                    payload[data.sheetId] = data.voteCount || 0;
                }
            });

            // 3. ส่งไป Google Apps Script
            // ⚠️ ใส่ URL ของคุณตรงนี้
            const SCRIPT_URL = "https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxx/exec"; 
            
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            });

            console.log("✅ Sent to Google Sheet successfully");
            return true;
        } catch (error) {
            console.error("❌ Failed to sync sheet:", error);
            alert("ปิดโหวตสำเร็จ แต่ส่งข้อมูลไป Sheet ไม่ผ่าน กรุณากด Sync อีกครั้ง");
            return false;
        }
    };

    const handleRoleChange = async (userId: string, email: string, newRole: string) => {
        if (!confirm(`ยืนยันการเปลี่ยน Role ของ ${email} เป็น ${newRole}?`)) return;

        setLoadingUsers(true);
        try {
            const result = await setUserRole(userId, newRole as 'user' | 'staff' | 'admin');
            
            if (result.success) {
                alert(`✅ เปลี่ยน Role เป็น ${newRole} สำเร็จ`);
                await loadUsers();
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to update role:', error);
            alert('❌ ไม่สามารถเปลี่ยน Role ได้: ' + (error as Error).message);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAttendanceChange = async (userId: string, day: 'day1' | 'day2' | 'day3', checked: boolean) => {
        try {
            const userRef = doc(db, 'users', userId);
            
            // ดึงข้อมูล user ก่อน
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            
            await updateDoc(userRef, {
                [`attendance.${day}`]: checked
            });
            
            const currentPoints = userData?.points || 0;
            
            // บันทึก activity log
            await logAttendanceCheck(
                userId,
                userData?.email || '',
                userData?.displayName || 'Unknown',
                day,
                checked,
                currentUser?.uid || '',
                currentUser?.email || '',
                currentPoints,
                currentPoints // pointsAfter เท่าเดิมเพราะแค่เช็คอิน ไม่ได้เพิ่ม/ลดแต้ม
            );
            
            setUsers(users.map(u => 
                u.uid === userId 
                    ? { ...u, attendance: { ...u.attendance, [day]: checked } }
                    : u
            ));
        } catch (error) {
            console.error('Failed to update attendance:', error);
            alert('ไม่สามารถอัพเดตการเข้างานได้');
        }
    };

    const handleUpdatePoints = async (userId: string, newPoints: number) => {
        if (isNaN(newPoints) || newPoints < 0) {
            alert('กรุณาใส่คะแนนที่ถูกต้อง');
            return;
        }

        try {
            const userRef = doc(db, 'users', userId);
            
            // ดึงข้อมูล user เพื่อเก็บ points เดิม
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            const pointsBefore = userData?.points || 0;
            
            // อัพเดตแต้ม
            await updateDoc(userRef, {
                points: newPoints
            });
            
            // บันทึก activity log
            await logAdminAdjustPoints(
                userId,
                userData?.email || '',
                userData?.displayName || 'Unknown',
                pointsBefore,
                newPoints,
                currentUser?.uid || '',
                currentUser?.email || '',
                'Admin แก้ไขแต้มโดยตรง'
            );
            
            setUsers(users.map(u => 
                u.uid === userId 
                    ? { ...u, points: newPoints }
                    : u
            ));
            
            setEditingUserId(null);
            alert('✅ อัพเดตคะแนนสำเร็จ และบันทึก Activity Log แล้ว');
        } catch (error) {
            console.error('Failed to update points:', error);
            alert('ไม่สามารถอัพเดตคะแนนได้');
        }
    };

    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const syncVoteCounts = async (category: string) => {
        console.log('🔄 Syncing vote counts for category:', category);
        try {
            const candidatesRef = collection(db, 'candidates');
            const candidatesQuery = query(candidatesRef, where('category', '==', category));
            const candidatesSnapshot = await getDocs(candidatesQuery);
            const votesRef = collection(db, 'votes');
            
            for (const candidateDoc of candidatesSnapshot.docs) {
                const candidateId = candidateDoc.id;
                const votesQuery = query(votesRef, where('candidateId', '==', candidateId));
                const votesSnapshot = await getDocs(votesQuery);
                const voteCount = votesSnapshot.size;
                
                await updateDoc(doc(db, 'candidates', candidateId), {
                    voteCount: voteCount,
                    lastSyncedAt: Timestamp.now()
                });
            }
            console.log('✅ Vote count sync completed');
        } catch (error) {
            console.error('❌ Failed to sync vote counts:', error);
            throw error;
        }
    };

    const toggleCategory = async (category: string) => {
        const categorySettings = voteSettings[category];
        if (!categorySettings) return;

        console.log('🔄 Toggling category:', category);

        try {
            const docRef = doc(db, 'voteSettings', 'config');
            const newIsOpen = !categorySettings.isOpen;
            
            await updateDoc(docRef, {
                [`categories.${category}.isOpen`]: newIsOpen,
                [`categories.${category}.updatedAt`]: Timestamp.now(),
                ...(newIsOpen && { [`categories.${category}.sessionId`]: `session_${Date.now()}` })
            });
            
            // ✅ ถ้าเป็นการ "ปิดโหวต" ให้รวมคะแนนและส่งเข้า Sheet
            if (!newIsOpen) {
                console.log('📊 Closing vote - syncing vote counts...');
                
                // 1. รวมคะแนนใน Firebase ให้ชัวร์ก่อน
                await syncVoteCounts(category);
                
                // 2. ส่งคะแนนล่าสุดไป Google Sheet
                await syncToSheet(category);

                alert(`⏸️ ปิดการโหวตและส่งคะแนนไป Google Sheet เรียบร้อยแล้ว! ✅`);
            } else {
                // ✅ เปิดโหวต → เพิ่มสิทธิ์โหวตฟรี 1 ครั้งให้ทุกคน
                console.log(`🔄 เปิดการโหวต ${category} - กำลังแจกสิทธิ์โหวตฟรีให้ทุกคน...`);
                
                try {
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const batch = writeBatch(db);
                    let grantedCount = 0;

                    usersSnapshot.docs.forEach((userDoc) => {
                        const currentRights = userDoc.data().voteRights || {};
                        const currentCategoryRights = currentRights[category] || 0;
                        
                        // เพิ่มสิทธิ์โหวต 1 ครั้งในหมวดนี้
                        batch.update(userDoc.ref, {
                            [`voteRights.${category}`]: currentCategoryRights + 1
                        });
                        grantedCount++;
                    });

                    await batch.commit();
                    
                    console.log(`✅ แจกสิทธิ์โหวตสำเร็จ: ${grantedCount} คน`);
                    
                    // บันทึก Activity Log
                    await addDoc(collection(db, 'activityLogs'), {
                        type: 'grant_free_vote',
                        category: category,
                        adminId: currentUser?.uid,
                        adminEmail: currentUser?.email,
                        adminName: currentUser?.displayName || currentUser?.email,
                        affectedUsers: grantedCount,
                        timestamp: Timestamp.now(),
                        message: `เปิดการโหวต ${category} - แจกสิทธิ์โหวตฟรี 1 ครั้งให้ ${grantedCount} คน`
                    });
                    
                    alert(`✅ เปิดการโหวต ${category} และแจกสิทธิ์โหวตฟรี 1 ครั้งให้ ${grantedCount} คนแล้ว! 🎉`);
                } catch (grantError) {
                    console.error('❌ Error granting free votes:', grantError);
                    alert(`⚠️ เปิดการโหวต ${category} แล้ว แต่เกิดข้อผิดพลาดในการแจกสิทธิ์โหวตฟรี`);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to toggle category:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    // ✅ ฟังก์ชันคำนวณคะแนน
    const calculateScores = (candidate: any) => {
        const voteCount = candidate.voteCount || 0;
        const purchasePoints = candidate.purchasePoints || 0;
        
        const score30 = voteCount * 400 * 0.3;
        const score70 = purchasePoints * 0.7;
        const totalScore = score30 + score70;
        
        return { score30, score70, totalScore };
    };

    // ✅ ฟังก์ชันอัปเดตคะแนนซื้อของ
    const updatePurchasePoints = async (candidateId: string, points: number) => {
        try {
            const candidateRef = doc(db, 'candidates', candidateId);
            await updateDoc(candidateRef, {
                purchasePoints: points
            });

            // บันทึก Activity Log
            await addDoc(collection(db, 'activityLogs'), {
                type: 'update_purchase_points',
                candidateId: candidateId,
                candidateName: candidates.find(c => c.id === candidateId)?.name,
                category: selectedCategory,
                points: points,
                adminId: currentUser?.uid,
                adminEmail: currentUser?.email,
                adminName: currentUser?.displayName || currentUser?.email,
                timestamp: Timestamp.now(),
                message: `อัปเดตคะแนนซื้อของเป็น ${points.toLocaleString()}`
            });

            alert('✅ อัปเดตคะแนนซื้อของสำเร็จ!');
            
            // Clear editing state
            setEditingPurchasePoints(prev => {
                const newState = { ...prev };
                delete newState[candidateId];
                return newState;
            });
        } catch (error) {
            console.error('Error updating purchase points:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    // ✅ ฟังก์ชันเปลี่ยนโหมด Podium
    const updateDisplayMode = async (mode: 'app30' | 'purchase70' | 'total100') => {
        try {
            await setDoc(doc(db, 'settings', 'podium'), {
                displayMode: mode,
                updatedAt: Timestamp.now(),
                updatedBy: currentUser?.email
            });
            
            setScoreDisplayMode(mode);
            
            const modeNames = {
                app30: 'App (30%)',
                purchase70: 'ซื้อของ (70%)',
                total100: 'รวม (100%)'
            };
            
            alert(`✅ เปลี่ยนโหมดเป็น ${modeNames[mode]} แล้ว`);
            
            // บันทึก Activity Log
            await addDoc(collection(db, 'activityLogs'), {
                type: 'change_podium_mode',
                mode: mode,
                adminId: currentUser?.uid,
                adminEmail: currentUser?.email,
                adminName: currentUser?.displayName || currentUser?.email,
                timestamp: Timestamp.now(),
                message: `เปลี่ยนโหมดแสดงคะแนน Podium เป็น ${modeNames[mode]}`
            });
        } catch (error) {
            console.error('Error updating display mode:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    // ✅ ฟังก์ชันเปิด/ปิดประกาศ
    const toggleAnnouncement = async () => {
        try {
            await setDoc(doc(db, 'settings', 'announcement'), {
                visible: !announcementVisible,
                updatedAt: Timestamp.now(),
                updatedBy: currentUser?.email
            });
            
            setAnnouncementVisible(!announcementVisible);
            
            alert(`✅ ${!announcementVisible ? 'เปิด' : 'ปิด'}ประกาศสำคัญแล้ว`);
            
            // บันทึก Activity Log
            await addDoc(collection(db, 'activityLogs'), {
                type: 'toggle_announcement',
                visible: !announcementVisible,
                adminId: currentUser?.uid,
                adminEmail: currentUser?.email,
                adminName: currentUser?.displayName || currentUser?.email,
                timestamp: Timestamp.now(),
                message: `${!announcementVisible ? 'เปิด' : 'ปิด'}ประกาศสำคัญ`
            });
        } catch (error) {
            console.error('Error toggling announcement:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    const handleAddCandidate = async () => {
        if (!newCandidate.name.trim() || !newCandidate.description.trim()) {
            alert('❌ กรุณากรอกชื่อและคำอธิบาย');
            return;
        }

        try {
            setUploadingImage(true);

            // อัปโหลดรูปถ้ามี
            let finalImageUrl = newCandidate.imageUrl;
            if (newCandidate.imageFile) {
                console.log('🔄 กำลังอัปโหลดรูป...');
                
                // ✅ เช็คขนาดไฟล์ก่อนอัปโหลด
                const fileSizeMB = newCandidate.imageFile.size / (1024 * 1024);
                if (fileSizeMB > 5) {
                    setUploadingImage(false);
                    alert(`❌ ไฟล์รูปใหญ่เกินไป!\n\nขนาด: ${fileSizeMB.toFixed(2)} MB\nสูงสุด: 5 MB\n\nกรุณาลดขนาดไฟล์ก่อนอัปโหลด`);
                    return;
                }

                // ✅ เช็คชนิดไฟล์
                if (!newCandidate.imageFile.type.startsWith('image/')) {
                    setUploadingImage(false);
                    alert('❌ ไฟล์ต้องเป็นรูปภาพเท่านั้น! (JPG, PNG, GIF)');
                    return;
                }

                const timestamp = Date.now();
                const fileName = `${newCandidate.name.replace(/\s+/g, '_')}_${timestamp}`;
                const path = `candidates/${selectedCategory}/${fileName}`;
                
                try {
                    // ✅ ใช้ Promise.race เพื่อให้มี timeout 30 วินาที
                    const uploadPromise = uploadImage(newCandidate.imageFile, path);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('timeout')), 30000)
                    );
                    
                    finalImageUrl = await Promise.race([uploadPromise, timeoutPromise]) as string;
                    console.log('✅ อัปโหลดรูปสำเร็จ:', finalImageUrl);
                } catch (uploadError) {
                    console.error('❌ อัปโหลดรูปล้มเหลว:', uploadError);
                    setUploadingImage(false);
                    
                    // แสดง error message ที่เข้าใจง่าย
                    const errorMessage = (uploadError as Error).message;
                    
                    if (errorMessage === 'timeout') {
                        alert('❌ อัปโหลดรูปใช้เวลานานเกินไป!\n\nสาเหตุเป็นได้:\n- อินเทอร์เน็ตช้า\n- ไฟล์รูปใหญ่เกินไป\n- Firebase Storage มีปัญหา\n\nลองอีกครั้งหรือใช้รูปเล็กกว่านี้');
                    } else if (errorMessage.includes('storage/unauthorized') || errorMessage.includes('permission')) {
                        alert('❌ ไม่สามารถอัปโหลดรูปได้!\n\nสาเหตุ: Firebase Storage Rules ไม่อนุญาต\n\nแก้ไข:\n1. เช็ค Console ว่าคุณเป็น Admin/SuperAdmin หรือไม่\n2. รอ 1-2 นาทีแล้วลองใหม่\n3. Logout แล้ว Login ใหม่');
                    } else if (errorMessage.includes('storage-quota-exceeded')) {
                        alert('❌ พื้นที่ Storage เต็ม! กรุณาลบไฟล์เก่าหรืออัพเกรด plan');
                    } else if (errorMessage.includes('storage-unauthenticated')) {
                        alert('❌ ไม่ได้ล็อกอิน! กรุณาล็อกอินใหม่');
                    } else {
                        alert(`❌ อัปโหลดรูปล้มเหลว!\n\nError: ${errorMessage}\n\nลอง:\n1. รีเฟรชหน้าเว็บ\n2. ลองใช้รูปอื่น\n3. Logout แล้ว Login ใหม่`);
                    }
                    return;
                }
            }

            console.log('💾 กำลังบันทึกข้อมูลผู้สมัคร...');
            const candidatesRef = collection(db, 'candidates');
            const q = query(candidatesRef, where('category', '==', selectedCategory));
            const snapshot = await getDocs(q);
            const maxOrder = snapshot.docs.reduce((max: number, doc) => {
                const order = doc.data().order || 0;
                return order > max ? order : max;
            }, 0);

            // ✅ บันทึกข้อมูลพร้อม imageUrl ที่อัปโหลดแล้ว
            await addDoc(collection(db, 'candidates'), {
                name: newCandidate.name,
                description: newCandidate.description,
                imageUrl: finalImageUrl,
                sheetId: newCandidate.sheetId ? Number(newCandidate.sheetId) : null,
                category: selectedCategory,
                voteCount: 0,
                order: maxOrder + 1,
                isVisible: false, // ✅ Default: ไม่แสดงให้ User เห็น
                isActive: false,  // ✅ Default: ไม่นับคะแนนใน Podium
                createdAt: Timestamp.now(),
                createdBy: currentUser?.uid || 'unknown'
            });

            console.log('✅ บันทึกสำเร็จ!');
            
            // รีเซ็ตค่า
            setNewCandidate({ name: '', description: '', imageUrl: '', sheetId: '', imageFile: null });
            setShowAddModal(false);
            setUploadingImage(false);
            alert('✅ เพิ่มผู้สมัครสำเร็จ');
        } catch (error) {
            console.error('❌ Failed to add candidate:', error);
            setUploadingImage(false);
            
            const errorMessage = (error as Error).message;
            if (errorMessage.includes('permission-denied') || errorMessage.includes('insufficient permissions')) {
                alert('❌ ไม่มีสิทธิ์เพิ่มผู้สมัคร!\n\nคุณต้องเป็น Admin หรือ SuperAdmin เท่านั้น');
            } else {
                alert('❌ เกิดข้อผิดพลาด: ' + errorMessage);
            }
        }
    };

    const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ "${candidateName}"?`)) return;
        try {
            await deleteDoc(doc(db, 'candidates', candidateId));
            alert('✅ ลบผู้สมัครสำเร็จ');
        } catch (error) {
            console.error('❌ Failed to delete candidate:', error);
            alert('เกิดข้อผิดพลาดในการลบผู้สมัคร: ' + (error as Error).message);
        }
    };

    // ✅ Toggle isVisible/isActive สำหรับผู้สมัครแต่ละคน
    const toggleCandidateVisibility = async (candidateId: string, currentValue: boolean) => {
        try {
            await updateDoc(doc(db, 'candidates', candidateId), {
                isVisible: !currentValue
            });
        } catch (error) {
            console.error('❌ Failed to toggle visibility:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    const toggleCandidateActive = async (candidateId: string, currentValue: boolean) => {
        try {
            await updateDoc(doc(db, 'candidates', candidateId), {
                isActive: !currentValue
            });
        } catch (error) {
            console.error('❌ Failed to toggle active:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    // ✅ Bulk Actions - เปิด/ปิดทั้งหมด
    const bulkToggleVisibility = async (value: boolean) => {
        if (!confirm(`ต้องการ${value ? 'เปิด' : 'ปิด'}การแสดงผู้สมัครทั้งหมดในหมวด ${voteSettings[selectedCategory]?.title} หรือไม่?`)) return;
        
        try {
            const batch = writeBatch(db);
            candidates.forEach((candidate) => {
                const ref = doc(db, 'candidates', candidate.id);
                batch.update(ref, { isVisible: value });
            });
            await batch.commit();
            alert(`✅ ${value ? 'เปิด' : 'ปิด'}การแสดงผู้สมัครทั้งหมดสำเร็จ`);
        } catch (error) {
            console.error('❌ Bulk toggle failed:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    const bulkToggleActive = async (value: boolean) => {
        if (!confirm(`ต้องการ${value ? 'เปิด' : 'ปิด'}การนับคะแนนผู้สมัครทั้งหมดในหมวด ${voteSettings[selectedCategory]?.title} หรือไม่?`)) return;
        
        try {
            const batch = writeBatch(db);
            candidates.forEach((candidate) => {
                const ref = doc(db, 'candidates', candidate.id);
                batch.update(ref, { isActive: value });
            });
            await batch.commit();
            alert(`✅ ${value ? 'เปิด' : 'ปิด'}การนับคะแนนผู้สมัครทั้งหมดสำเร็จ`);
        } catch (error) {
            console.error('❌ Bulk toggle failed:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    // Category Management Functions
    const handleAddCategory = async () => {
        if (!newCategory.id || !newCategory.title) {
            alert('กรุณากรอก ID และชื่อหมวดหมู่');
            return;
        }
        try {
            const settingsRef = doc(db, 'voteSettings', 'config');
            const newCategoryData: VoteCategory = {
                id: newCategory.id,
                title: newCategory.title,
                description: newCategory.description || '',
                isOpen: false,
                openTime: null,
                closeTime: null,
                autoClose: false,
                sessionId: `session_${Date.now()}`,
            };

            await setDoc(settingsRef, {
                categories: {
                    ...voteSettings,
                    [newCategory.id]: newCategoryData
                }
            }, { merge: true });

            alert(`เพิ่มหมวดหมู่ "${newCategory.title}" สำเร็จ!`);
            setShowAddCategoryModal(false);
            setNewCategory({ id: '', title: '', description: '' });
        } catch (error) {
            console.error('Error adding category:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่');
        }
    };

    const handleUpdateCategory = async (categoryId: string, updates: Partial<VoteCategory>) => {
        try {
            const settingsRef = doc(db, 'voteSettings', 'config');
            const updatedCategory = {
                ...voteSettings[categoryId],
                ...updates,
            };

            await setDoc(settingsRef, {
                categories: {
                    ...voteSettings,
                    [categoryId]: updatedCategory
                }
            }, { merge: true });

            alert('อัพเดทหมวดหมู่สำเร็จ!');
            setEditingCategory(null);
        } catch (error) {
            console.error('Error updating category:', error);
            alert('เกิดข้อผิดพลาดในการอัพเดทหมวดหมู่');
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm(`ต้องการลบหมวดหมู่ "${voteSettings[categoryId]?.title}" หรือไม่?`)) return;
        try {
            const settingsRef = doc(db, 'voteSettings', 'config');
            const updatedCategories = { ...voteSettings };
            delete updatedCategories[categoryId];

            await setDoc(settingsRef, {
                categories: updatedCategories
            }, { merge: true });

            alert('ลบหมวดหมู่สำเร็จ!');
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('เกิดข้อผิดพลาดในการลบหมวดหมู่');
        }
    };

    if (loading || !currentUser) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            🛡️ Admin Dashboard
                        </h1>
                        <p className="text-purple-100">จัดการระบบโหวต{canManageUsers && ' และผู้ใช้'}</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                        ← กลับหน้าหลัก
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {canManageUsers && (
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('vote')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                                activeTab === 'vote'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            🎯 จัดการระบบโหวต
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                                activeTab === 'users'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            👥 จัดการผู้ใช้
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                                activeTab === 'categories'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            📋 จัดการหมวดหมู่
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                                activeTab === 'logs'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            📊 Activity Logs
                        </button>
                    </div>
                )}

                {/* User Management Panel */}
                {activeTab === 'users' && canManageUsers && (
                    <div className="bg-white rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">👥 จัดการผู้ใช้และสิทธิ์</h2>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-colors"
                            >
                                🔄 รีเฟรช
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="🔍 ค้นหาชื่อหรืออีเมล..."
                                    className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-gray-800"
                                />
                                <span className="absolute left-4 top-3.5 text-xl">🔍</span>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-2.5 bg-gray-200 hover:bg-gray-300 text-gray-600 px-3 py-1 rounded-lg text-sm font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                แสดง {filteredUsers.length} จาก {users.length} ผู้ใช้
                            </p>
                        </div>

                        {loadingUsers ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                                <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                                            <th className="text-left p-3 font-bold text-gray-700">อีเมล</th>
                                            <th className="text-left p-3 font-bold text-gray-700">ชื่อ</th>
                                            <th className="text-center p-3 font-bold text-gray-700">Role</th>
                                            <th className="text-center p-3 font-bold text-gray-700">เข้างาน</th>
                                            <th className="text-right p-3 font-bold text-gray-700">Points</th>
                                            <th className="text-center p-3 font-bold text-gray-700">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user) => (
                                            <tr key={user.uid} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 text-sm text-gray-800">{user.email}</td>
                                                <td className="p-3 text-sm text-gray-800">{user.displayName}</td>
                                                <td className="p-3 text-center">
                                                    {user.role === 'superadmin' ? (
                                                        <span className="inline-block bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                                            👑 SuperAdmin
                                                        </span>
                                                    ) : (
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user.uid, user.email, e.target.value)}
                                                            className="bg-gray-100 border-2 border-gray-300 rounded-lg px-3 py-1 font-bold text-sm focus:border-purple-500 focus:outline-none"
                                                        >
                                                            <option value="user">👤 User</option>
                                                            <option value="staff">🔧 Staff</option>
                                                            <option value="register">📋 Register</option>
                                                            {isSuperAdmin && <option value="admin">🛡️ Admin</option>}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={user.attendance?.day1 || false}
                                                                onChange={(e) => handleAttendanceChange(user.uid, 'day1', e.target.checked)}
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                            />
                                                            <span className="text-xs text-gray-600">D1</span>
                                                        </label>
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={user.attendance?.day2 || false}
                                                                onChange={(e) => handleAttendanceChange(user.uid, 'day2', e.target.checked)}
                                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                                            />
                                                            <span className="text-xs text-gray-600">D2</span>
                                                        </label>
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={user.attendance?.day3 || false}
                                                                onChange={(e) => handleAttendanceChange(user.uid, 'day3', e.target.checked)}
                                                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                            />
                                                            <span className="text-xs text-gray-600">D3</span>
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    {editingUserId === user.uid ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <input
                                                                type="number"
                                                                value={editPoints}
                                                                onChange={(e) => setEditPoints(Number(e.target.value))}
                                                                className="w-24 px-2 py-1 border-2 border-purple-500 rounded-lg text-sm font-mono text-center"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => handleUpdatePoints(user.uid, editPoints)}
                                                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-bold"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingUserId(null)}
                                                                className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono text-sm">{user.points.toLocaleString()}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {editingUserId !== user.uid && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(user.uid);
                                                                setEditPoints(user.points);
                                                            }}
                                                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold"
                                                        >
                                                            ✏️ แก้
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        {searchQuery ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ไม่พบข้อมูลผู้ใช้'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Vote Management Panel */}
                {activeTab === 'vote' && (
                    <>
                        <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎛️ ควบคุมการโหวต</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.entries(voteSettings).map(([categoryId, category]) => {
                                    const categoryInfo = {
                                        band: { emoji: '🎸', name: 'Band' },
                                        solo: { emoji: '🎤', name: 'Solo' },
                                        cover: { emoji: '💃', name: 'Cover' }
                                    }[categoryId] || { emoji: '📋', name: category.title };

                                    return (
                                        <div
                                            key={categoryId}
                                            className={`p-6 rounded-xl border-2 transition-all ${
                                                category.isOpen
                                                    ? 'bg-green-50 border-green-400'
                                                    : 'bg-gray-50 border-gray-300'
                                            }`}
                                        >
                                            <div className="text-center mb-4">
                                                <div className="text-4xl mb-2">{categoryInfo.emoji}</div>
                                                <div className="font-bold text-gray-800">{categoryInfo.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Session: {category.sessionId}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => toggleCategory(categoryId)}
                                                className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                                                    category.isOpen
                                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                                }`}
                                            >
                                                {category.isOpen ? '🔴 ปิดการโหวต' : '▶️ เปิดการโหวต'}
                                            </button>

                                            <div className={`mt-3 text-center font-bold ${
                                                category.isOpen ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                                {category.isOpen ? '✅ เปิดอยู่' : '⏸️ ปิดอยู่'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* IG Page Control - NEW */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-xl mb-6 border-2 border-indigo-200">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                📱 ควบคุมหน้า IG
                            </h2>
                            <div className="bg-white rounded-xl p-6 border-2 border-indigo-300">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-lg text-gray-800 mb-1">
                                            🎭 หน้าส่งวาร์ป Instagram
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            เปิด/ปิดให้ผู้ใช้เข้าถึงหน้า IG ได้
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={async () => {
                                            const success = await toggleIGPage(!igPageSettings.isOpen);
                                            if (success) {
                                                console.log('IG Page toggled successfully');
                                            } else {
                                                alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
                                            }
                                        }}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg min-w-[140px] ${
                                            igPageSettings.isOpen
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                    >
                                        {igPageSettings.isOpen ? '🔴 ปิดหน้า IG' : '▶️ เปิดหน้า IG'}
                                    </button>
                                </div>
                                
                                <div className={`mt-4 text-center font-bold text-lg ${
                                    igPageSettings.isOpen ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {igPageSettings.isOpen ? '✅ เปิดใช้งาน' : '⏸️ ปิดใช้งาน'}
                                </div>
                                
                                <div className="mt-4 text-xs text-gray-500 text-center bg-gray-50 rounded-lg p-3">
                                    💡 เมื่อปิด: ผู้ใช้ทั่วไปจะเข้าหน้า IG ไม่ได้ (Staff/Admin ยังเข้าได้)
                                </div>
                            </div>
                        </div>

                        {/* ✅ Podium Settings - NEW */}
                        <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                🏆 จัดการ Podium
                            </h2>
                            
                            <div>
                                <label className="block text-sm font-semibold mb-3 text-gray-700">
                                    โหมดแสดงคะแนน:
                                </label>
                                
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => updateDisplayMode('app30')}
                                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                            scoreDisplayMode === 'app30'
                                                ? 'bg-blue-500 text-white shadow-lg scale-105'
                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        }`}
                                    >
                                        📊 App (30%)
                                    </button>
                                    
                                    <button
                                        onClick={() => updateDisplayMode('purchase70')}
                                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                            scoreDisplayMode === 'purchase70'
                                                ? 'bg-purple-500 text-white shadow-lg scale-105'
                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        }`}
                                    >
                                        💰 ซื้อของ (70%)
                                    </button>
                                    
                                    <button
                                        onClick={() => updateDisplayMode('total100')}
                                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                            scoreDisplayMode === 'total100'
                                                ? 'bg-green-500 text-white shadow-lg scale-105'
                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        }`}
                                    >
                                        🏆 รวม (100%)
                                    </button>
                                </div>
                                
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        {scoreDisplayMode === 'app30' && '📊 แสดงเฉพาะคะแนนจากโหวตในแอป (Votes × 400 × 30%)'}
                                        {scoreDisplayMode === 'purchase70' && '💰 แสดงเฉพาะคะแนนจากซื้อของ (คะแนนซื้อของ × 70%)'}
                                        {scoreDisplayMode === 'total100' && '🏆 แสดงคะแนนรวมทั้งหมด (App 30% + ซื้อของ 70%)'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ✅ Announcement Settings - NEW */}
                        <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                📢 จัดการประกาศสำคัญ
                            </h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold text-gray-800 mb-1">
                                        ประกาศ (30% / 70%)
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        แสดง/ซ่อนประกาศสำคัญในหน้าผลโหวต
                                    </div>
                                </div>
                                <button
                                    onClick={toggleAnnouncement}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                        announcementVisible
                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                                    }`}
                                >
                                    {announcementVisible ? '✅ เปิดประกาศ' : '❌ ปิดประกาศ'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">👥 จัดการผู้สมัคร</h2>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all"
                                >
                                    ➕ เพิ่มผู้สมัคร
                                </button>
                            </div>

                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {Object.keys(voteSettings).map((cat) => {
                                    const info = {
                                        band: { emoji: '🎸', name: 'Band' },
                                        solo: { emoji: '🎤', name: 'Solo' },
                                        cover: { emoji: '💃', name: 'Cover' }
                                    }[cat] || { emoji: '📋', name: voteSettings[cat].title };

                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap ${
                                                selectedCategory === cat
                                                    ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            <div className="text-xl mb-1 text-center">{info.emoji}</div>
                                            <div className="text-sm text-center">{info.name}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-xl p-4 mb-4 border border-red-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-600">ผู้สมัครทั้งหมด</div>
                                        <div className="text-2xl font-bold text-gray-800">{candidates.length} คน</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">โหวตทั้งหมด</div>
                                        <div className="text-2xl font-bold text-red-600">{totalVotes} โหวต</div>
                                    </div>
                                </div>
                            </div>

                            {/* ✅ Bulk Actions - เปิด/ปิดทั้งหมด */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4 border-2 border-blue-200">
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="text-xl">⚡</span>
                                    จัดการทั้งหมด (Bulk Actions)
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-600 mb-2 font-semibold">👁️ แสดง/ซ่อนผู้สมัคร (isVisible)</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => bulkToggleVisibility(true)}
                                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-all"
                                            >
                                                ✅ เปิดทั้งหมด
                                            </button>
                                            <button
                                                onClick={() => bulkToggleVisibility(false)}
                                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-all"
                                            >
                                                ❌ ปิดทั้งหมด
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-2 font-semibold">🏆 นับคะแนนใน Podium (isActive)</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => bulkToggleActive(true)}
                                                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-all"
                                            >
                                                ✅ เปิดทั้งหมด
                                            </button>
                                            <button
                                                onClick={() => bulkToggleActive(false)}
                                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-all"
                                            >
                                                ❌ ปิดทั้งหมด
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 text-xs text-gray-600 bg-amber-50 rounded-lg p-2 border border-amber-200">
                                    💡 <strong>isVisible</strong>: User จะเห็นและโหวตได้ | <strong>isActive</strong>: นับคะแนนใน Podium
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                                            <th className="text-left p-3 font-bold text-gray-700">#</th>
                                            <th className="text-left p-3 font-bold text-gray-700">Sheet ID</th>
                                            <th className="text-left p-3 font-bold text-gray-700">ชื่อ</th>
                                            <th className="text-left p-3 font-bold text-gray-700">คำอธิบาย</th>
                                            <th className="text-center p-3 font-bold text-gray-700">โหวต</th>
                                            <th className="text-center p-3 font-bold text-blue-700">
                                                <div>📊 App (30%)</div>
                                                <div className="text-xs font-normal text-gray-500">voteCount × 400 × 30%</div>
                                            </th>
                                            <th className="text-center p-3 font-bold text-purple-700">
                                                <div>� ซื้อของ (70%)</div>
                                                <div className="text-xs font-normal text-gray-500">purchasePoints × 70%</div>
                                            </th>
                                            <th className="text-center p-3 font-bold text-green-700">
                                                <div>🏆 รวม (100%)</div>
                                                <div className="text-xs font-normal text-gray-500">คะแนนรวม</div>
                                            </th>
                                            <th className="text-center p-3 font-bold text-gray-700">
                                                <div>�👁️ แสดง</div>
                                                <div className="text-xs font-normal text-gray-500">(isVisible)</div>
                                            </th>
                                            <th className="text-center p-3 font-bold text-gray-700">
                                                <div>🏆 Podium</div>
                                                <div className="text-xs font-normal text-gray-500">(isActive)</div>
                                            </th>
                                            <th className="text-center p-3 font-bold text-gray-700">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map((candidate, index) => {
                                            const { score30, score70, totalScore } = calculateScores(candidate);
                                            
                                            return (
                                            <tr key={candidate.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 text-gray-600">#{index + 1}</td>
                                                <td className="p-3">
                                                    <span className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">
                                                        {candidate.sheetId || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-red-200 to-amber-200 flex-shrink-0">
                                                            {candidate.imageUrl ? (
                                                                <img 
                                                                    src={candidate.imageUrl} 
                                                                    alt={candidate.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                                                    {candidate.category === 'band' && '🎸'}
                                                                    {candidate.category === 'solo' && '🎤'}
                                                                    {candidate.category === 'cover' && '💃'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="font-medium text-gray-800">{candidate.name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                                                    {candidate.description}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                                                        {candidate.voteCount}
                                                    </span>
                                                </td>
                                                
                                                {/* ✅ คะแนน App 30% (ไม่ให้แก้) */}
                                                <td className="p-3 text-center">
                                                    <div className="text-blue-600 font-semibold">
                                                        {score30.toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {candidate.voteCount || 0} × 400 × 30%
                                                    </div>
                                                </td>
                                                
                                                {/* ✅ คะแนนซื้อของ 70% (แก้ได้) */}
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <input
                                                            type="number"
                                                            className="w-24 px-2 py-1 border rounded text-center"
                                                            placeholder="0"
                                                            value={editingPurchasePoints[candidate.id] ?? candidate.purchasePoints ?? 0}
                                                            onChange={(e) => 
                                                                setEditingPurchasePoints(prev => ({
                                                                    ...prev,
                                                                    [candidate.id]: parseInt(e.target.value) || 0
                                                                }))
                                                            }
                                                        />
                                                        <button
                                                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                                                            onClick={() => updatePurchasePoints(
                                                                candidate.id,
                                                                editingPurchasePoints[candidate.id] ?? candidate.purchasePoints ?? 0
                                                            )}
                                                        >
                                                            💾
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        = {score70.toLocaleString()} คะแนน
                                                    </div>
                                                </td>
                                                
                                                {/* ✅ คะแนนรวม 100% */}
                                                <td className="p-3 text-center">
                                                    <div className="text-green-600 font-bold text-lg">
                                                        {totalScore.toLocaleString()}
                                                    </div>
                                                </td>
                                                
                                                {/* ✅ Toggle isVisible */}
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => toggleCandidateVisibility(candidate.id, candidate.isVisible ?? false)}
                                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                                            candidate.isVisible 
                                                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                                                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                                                        }`}
                                                    >
                                                        {candidate.isVisible ? '✅ เปิด' : '❌ ปิด'}
                                                    </button>
                                                </td>
                                                {/* ✅ Toggle isActive */}
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => toggleCandidateActive(candidate.id, candidate.isActive ?? false)}
                                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                                            candidate.isActive 
                                                                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                                                                : 'bg-orange-300 hover:bg-orange-400 text-gray-700'
                                                        }`}
                                                    >
                                                        {candidate.isActive ? '🏆 นับ' : '⏸️ ไม่นับ'}
                                                    </button>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-bold transition-colors"
                                                    >
                                                        🗑️ ลบ
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                        })}
                                    </tbody>
                                </table>

                                {candidates.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        ยังไม่มีผู้สมัครในหมวดนี้
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Categories Management Tab */}
                {activeTab === 'categories' && (
                    <>
                        <div className="mb-6">
                            <button
                                onClick={() => setShowAddCategoryModal(true)}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                            >
                                <i className="ri-add-circle-line text-xl"></i>
                                เพิ่มหมวดหมู่ใหม่
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(voteSettings).map(([categoryId, category]) => {
                                const categoryEmoji = category.emoji || {
                                    band: '🎸',
                                    solo: '🎤',
                                    cover: '💃'
                                }[categoryId] || '📋';

                                return (
                                    <div key={categoryId} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-gray-100">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                {editingCategory === categoryId ? (
                                                    <input
                                                        type="text"
                                                        defaultValue={category.title}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== category.title) {
                                                                handleUpdateCategory(categoryId, { title: e.target.value });
                                                            }
                                                        }}
                                                        className="text-xl font-bold text-gray-800 border-2 border-purple-500 rounded-lg px-2 py-1 w-full"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                        <span className="text-3xl">{categoryEmoji}</span>
                                                        {category.title}
                                                    </h3>
                                                )}
                                                <p className="text-gray-600 text-sm mt-1">
                                                    ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{categoryId}</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setEditingCategory(editingCategory === categoryId ? null : categoryId)}
                                                className="text-gray-400 hover:text-purple-600 transition-colors"
                                            >
                                                <i className={editingCategory === categoryId ? "ri-check-line text-xl" : "ri-edit-line text-xl"}></i>
                                            </button>
                                        </div>

                                        {editingCategory === categoryId ? (
                                            <textarea
                                                defaultValue={category.description}
                                                onBlur={(e) => {
                                                    if (e.target.value !== category.description) {
                                                        handleUpdateCategory(categoryId, { description: e.target.value });
                                                    }
                                                }}
                                                className="text-gray-600 text-sm mb-4 border-2 border-purple-500 rounded-lg px-2 py-1 w-full"
                                                rows={2}
                                            />
                                        ) : (
                                            <p className="text-gray-600 text-sm mb-4">{category.description || 'ไม่มีคำอธิบาย'}</p>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDeleteCategory(categoryId)}
                                                disabled={loading}
                                                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-bold transition-all disabled:opacity-50 flex-1"
                                            >
                                                ลบหมวดหมู่
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Activity Logs Panel */}
                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-xl">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                📊 Activity Logs
                            </h2>
                            <p className="text-gray-600 mb-6">
                                ดูกิจกรรมทั้งหมดที่เกิดขึ้นในระบบ - การเช็คชื่อ, การแก้ไข Point, การแก้ไข Role, และอื่นๆ
                            </p>
                            <ActivityLogsViewer />
                        </div>
                    </div>
                )}
            </div>

            {/* Add Candidate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up border-t-4 border-amber-400">
                        {/* Header - ธีมแดงทอง */}
                        <div className="sticky top-0 bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-5 z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/90 rounded-2xl flex items-center justify-center shadow-lg">
                                        <span className="text-3xl">✨</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white drop-shadow-md">เพิ่มผู้สมัครใหม่</h3>
                                        <p className="text-white/90 text-sm font-medium">{voteSettings[selectedCategory]?.title}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!uploadingImage) {
                                            setShowAddModal(false);
                                            setNewCandidate({ name: '', description: '', imageUrl: '', sheetId: '', imageFile: null });
                                        }
                                    }}
                                    className="w-10 h-10 bg-white/90 hover:bg-white rounded-xl text-red-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                    disabled={uploadingImage}
                                >
                                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content - Scrollable Area */}
                        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-5 bg-gradient-to-br from-amber-50/30 via-white to-red-50/30">
                            {/* Category Select */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <span className="text-xl">📂</span>
                                    หมวดหมู่
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    disabled={uploadingImage}
                                    className="w-full p-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white text-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {Object.keys(voteSettings).map(cat => (
                                        <option key={cat} value={cat}>{voteSettings[cat].title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sheet ID */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <span className="text-xl">🔢</span>
                                    Sheet ID (ลำดับ ID ใน Excel) *
                                </label>
                                <input
                                    type="number"
                                    value={newCandidate.sheetId}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, sheetId: e.target.value })}
                                    disabled={uploadingImage}
                                    className="w-full p-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none font-mono text-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="เช่น 1, 2, 3..."
                                />
                                <p className="text-xs text-gray-600 mt-2 flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                    <span>💡</span>
                                    <span>ใส่เลขให้ตรงกับ Column A ใน Google Sheet เพื่อให้ซิงค์คะแนนถูกต้อง</span>
                                </p>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <span className="text-xl">👤</span>
                                    ชื่อผู้สมัคร *
                                </label>
                                <input
                                    type="text"
                                    value={newCandidate.name}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                    disabled={uploadingImage}
                                    className="w-full p-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none text-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="ใส่ชื่อผู้สมัคร"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <span className="text-xl">📝</span>
                                    คำอธิบาย *
                                </label>
                                <textarea
                                    value={newCandidate.description}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                                    disabled={uploadingImage}
                                    className="w-full p-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none resize-none text-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    rows={4}
                                    placeholder="ใส่คำอธิบายผู้สมัคร..."
                                />
                            </div>

                            {/* Image Upload */}
                            <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm">
                                <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-xl">📸</span>
                                    รูปภาพผู้สมัคร
                                </label>
                                
                                {/* Preview */}
                                {(newCandidate.imageFile || newCandidate.imageUrl) && (
                                    <div className="mb-4 relative inline-block">
                                        <img
                                            src={newCandidate.imageFile ? URL.createObjectURL(newCandidate.imageFile) : newCandidate.imageUrl}
                                            alt="Preview"
                                            className="w-40 h-40 object-cover rounded-2xl border-4 border-amber-200 shadow-lg"
                                        />
                                        <button
                                            onClick={() => setNewCandidate({ ...newCandidate, imageFile: null, imageUrl: '' })}
                                            disabled={uploadingImage}
                                            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}

                                {/* Upload Button */}
                                <label className={`block w-full py-4 px-6 rounded-2xl font-bold cursor-pointer transition-all shadow-md active:scale-[0.98] ${
                                    uploadingImage 
                                        ? 'bg-gray-300 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-amber-400 via-amber-500 to-red-500 hover:from-amber-500 hover:via-amber-600 hover:to-red-600 text-white'
                                }`}>
                                    <div className="flex items-center justify-center gap-3">
                                        {uploadingImage ? (
                                            <>
                                                <svg className="animate-spin h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-lg text-gray-600">กำลังอัปโหลด...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-lg">✨ เลือกรูปจากเครื่อง</span>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingImage}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    alert('⚠️ ไฟล์ใหญ่เกิน 5MB กรุณาเลือกไฟล์ที่เล็กกว่า');
                                                    return;
                                                }
                                                setNewCandidate({ ...newCandidate, imageFile: file, imageUrl: '' });
                                            }
                                        }}
                                    />
                                </label>
                                <p className="text-xs text-gray-600 mt-2 text-center">รองรับ JPG, PNG, GIF (สูงสุด 5MB)</p>

                                {/* Divider */}
                                <div className="relative my-5">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t-2 border-amber-100"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-4 text-sm text-gray-600 font-medium">หรือใส่ URL รูปภาพ</span>
                                    </div>
                                </div>
                                
                                {/* URL Input */}
                                <input
                                    type="text"
                                    value={newCandidate.imageUrl}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, imageUrl: e.target.value, imageFile: null })}
                                    disabled={!!newCandidate.imageFile || uploadingImage}
                                    className="w-full p-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            {/* Action Buttons - Fixed at bottom on mobile */}
                            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-2 -mx-6 px-6 mt-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            if (!uploadingImage) {
                                                setShowAddModal(false);
                                                setNewCandidate({ name: '', description: '', imageUrl: '', sheetId: '', imageFile: null });
                                            }
                                        }}
                                        disabled={uploadingImage}
                                        className="py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl font-bold text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleAddCandidate}
                                        disabled={uploadingImage}
                                        className="py-4 bg-gradient-to-r from-red-500 via-red-600 to-amber-500 hover:from-red-600 hover:via-red-700 hover:to-amber-600 text-white rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploadingImage ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>กำลังบันทึก...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                <span>✨</span>
                                                <span>เพิ่มผู้สมัคร</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showAddCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <i className="ri-add-circle-line text-green-600"></i>
                                เพิ่มหมวดหมู่ใหม่
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddCategoryModal(false);
                                    setNewCategory({ id: '', title: '', description: '' });
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <i className="ri-close-line text-2xl"></i>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    ID หมวดหมู่ (ภาษาอังกฤษ, ไม่มีช่องว่าง)
                                </label>
                                <input
                                    type="text"
                                    placeholder="เช่น president, bestdancer"
                                    value={newCategory.id}
                                    onChange={(e) => setNewCategory({ ...newCategory, id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    ชื่อหมวดหมู่ (ที่แสดงบนหน้าเว็บ)
                                </label>
                                <input
                                    type="text"
                                    placeholder="เช่น ประธาน, นักเต้นยอดเยี่ยม"
                                    value={newCategory.title}
                                    onChange={(e) => setNewCategory({ ...newCategory, title: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    คำอธิบาย (ไม่บังคับ)
                                </label>
                                <textarea
                                    placeholder="อธิบายเพิ่มเติมเกี่ยวกับหมวดหมู่นี้"
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowAddCategoryModal(false);
                                        setNewCategory({ id: '', title: '', description: '' });
                                    }}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-bold transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleAddCategory}
                                    disabled={loading || !newCategory.id || !newCategory.title}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'กำลังเพิ่ม...' : 'เพิ่มหมวดหมู่'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}