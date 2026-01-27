import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoteSettings, useCandidates, useVoteStats } from '../hooks/useVote';
import { db, getAllUsers, setUserRole } from '../firebaseApp';
import { doc, updateDoc, collection, addDoc, deleteDoc, Timestamp, getDocs, query, where, setDoc } from 'firebase/firestore';
import BottomNav from '../components/BottomNav';
import type { VoteCategory } from '../hooks/useVote'; // นำเข้า type ถ้ามี

// ✅ 1. เพิ่ม sheetId ใน Interface
interface CandidateForm {
    name: string;
    description: string;
    imageUrl: string;
    sheetId: string;
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
    const [selectedCategory, setSelectedCategory] = useState('band');
    const { candidates } = useCandidates(selectedCategory);
    const { totalVotes } = useVoteStats(selectedCategory);

    const [showAddModal, setShowAddModal] = useState(false);
    
    // ✅ 2. เพิ่มค่าเริ่มต้น sheetId เป็นค่าว่าง
    const [newCandidate, setNewCandidate] = useState<CandidateForm>({
        name: '',
        description: '',
        imageUrl: '',
        sheetId: '' 
    });

    // User Management (for Admin and SuperAdmin)
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [activeTab, setActiveTab] = useState<'vote' | 'users' | 'categories'>('vote');
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
            await updateDoc(userRef, {
                [`attendance.${day}`]: checked
            });
            
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
            await updateDoc(userRef, {
                points: newPoints
            });
            
            setUsers(users.map(u => 
                u.uid === userId 
                    ? { ...u, points: newPoints }
                    : u
            ));
            
            setEditingUserId(null);
            alert('✅ อัพเดตคะแนนสำเร็จ');
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
                alert(`✅ เปิดการโหวต ${category} แล้ว`);
            }
            
        } catch (error) {
            console.error('❌ Failed to toggle category:', error);
            alert('เกิดข้อผิดพลาด: ' + (error as Error).message);
        }
    };

    const handleAddCandidate = async () => {
        if (!newCandidate.name.trim() || !newCandidate.description.trim()) {
            alert('❌ กรุณากรอกชื่อและคำอธิบาย');
            return;
        }

        try {
            const candidatesRef = collection(db, 'candidates');
            const q = query(candidatesRef, where('category', '==', selectedCategory));
            const snapshot = await getDocs(q);
            const maxOrder = snapshot.docs.reduce((max: number, doc) => {
                const order = doc.data().order || 0;
                return order > max ? order : max;
            }, 0);

            // ✅ 3. บันทึก sheetId ลง Firebase (แปลงเป็นตัวเลข)
            await addDoc(collection(db, 'candidates'), {
                ...newCandidate,
                sheetId: newCandidate.sheetId ? Number(newCandidate.sheetId) : null,
                category: selectedCategory,
                voteCount: 0,
                order: maxOrder + 1,
                createdAt: Timestamp.now(),
                createdBy: currentUser?.uid || 'unknown'
            });

            // ✅ รีเซ็ตค่าหลังจากบันทึก
            setNewCandidate({ name: '', description: '', imageUrl: '', sheetId: '' });
            setShowAddModal(false);
            alert('✅ เพิ่มผู้สมัครสำเร็จ');
        } catch (error) {
            console.error('❌ Failed to add candidate:', error);
            alert('❌ เกิดข้อผิดพลาดในการเพิ่มผู้สมัคร: ' + (error as Error).message);
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

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="text-left p-3 font-bold text-gray-700">#</th>
                                            <th className="text-left p-3 font-bold text-gray-700">Sheet ID</th>
                                            <th className="text-left p-3 font-bold text-gray-700">ชื่อ</th>
                                            <th className="text-left p-3 font-bold text-gray-700">คำอธิบาย</th>
                                            <th className="text-center p-3 font-bold text-gray-700">โหวต</th>
                                            <th className="text-center p-3 font-bold text-gray-700">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map((candidate, index) => (
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
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-bold transition-colors"
                                                    >
                                                        🗑️ ลบ
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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
            </div>

            {/* Add Candidate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">
                            ➕ เพิ่มผู้สมัครใหม่
                        </h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    หมวดหมู่
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                >
                                    {Object.keys(voteSettings).map(cat => (
                                        <option key={cat} value={cat}>{voteSettings[cat].title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* ✅ 4. เพิ่มช่องกรอก Sheet ID */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Sheet ID (ลำดับ ID ใน Excel) *
                                </label>
                                <input
                                    type="number"
                                    value={newCandidate.sheetId}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, sheetId: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none font-mono"
                                    placeholder="เช่น 1, 2, 3..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    * ใส่เลขให้ตรงกับ Column A ใน Google Sheet เพื่อให้ตัดคะแนนถูกคน
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    ชื่อ *
                                </label>
                                <input
                                    type="text"
                                    value={newCandidate.name}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                    placeholder="ใส่ชื่อผู้สมัคร"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    คำอธิบาย *
                                </label>
                                <textarea
                                    value={newCandidate.description}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                    rows={3}
                                    placeholder="ใส่คำอธิบายผู้สมัคร"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    URL รูปภาพ (ไม่บังคับ)
                                </label>
                                <input
                                    type="text"
                                    value={newCandidate.imageUrl}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, imageUrl: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewCandidate({ name: '', description: '', imageUrl: '', sheetId: '' }); // ✅ รีเซ็ตค่า
                                }}
                                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-xl font-bold transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleAddCandidate}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all shadow-lg"
                            >
                                ✓ เพิ่มผู้สมัคร
                            </button>
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