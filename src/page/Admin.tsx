import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoteSettings, useCandidates, useVoteStats } from '../hooks/useVote';
import { db } from '../firebaseApp';
import { doc, updateDoc, collection, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';

interface CandidateForm {
    name: string;
    description: string;
    imageUrl: string;
}

export default function Admin() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { categories: voteSettings, loading } = useVoteSettings();
    const [selectedCategory, setSelectedCategory] = useState('karaoke');
    const { candidates } = useCandidates(selectedCategory);
    const { totalVotes } = useVoteStats(selectedCategory);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newCandidate, setNewCandidate] = useState<CandidateForm>({
        name: '',
        description: '',
        imageUrl: ''
    });

    // Check if user is staff
    useEffect(() => {
        if (!loading && currentUser?.role !== 'staff') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            navigate('/');
        }
    }, [currentUser, loading, navigate]);

    const toggleCategory = async (category: string) => {
        const categorySettings = voteSettings[category];
        if (!categorySettings) return;

        try {
            const docRef = doc(db, 'voteSettings', 'config');
            const newIsOpen = !categorySettings.isOpen;
            
            await updateDoc(docRef, {
                [`categories.${category}.isOpen`]: newIsOpen,
                [`categories.${category}.updatedAt`]: Timestamp.now(),
                // If opening, create new session
                ...(newIsOpen && { [`categories.${category}.sessionId`]: `session_${Date.now()}` })
            });
        } catch (error) {
            console.error('Failed to toggle category:', error);
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
        }
    };

    const handleAddCandidate = async () => {
        if (!newCandidate.name.trim() || !newCandidate.description.trim()) {
            alert('กรุณากรอกชื่อและคำอธิบาย');
            return;
        }

        try {
            await addDoc(collection(db, 'candidates'), {
                ...newCandidate,
                category: selectedCategory,
                voteCount: 0,
                createdAt: Timestamp.now()
            });

            setNewCandidate({ name: '', description: '', imageUrl: '' });
            setShowAddModal(false);
            alert('เพิ่มผู้สมัครสำเร็จ');
        } catch (error) {
            console.error('Failed to add candidate:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มผู้สมัคร');
        }
    };

    const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ "${candidateName}"?`)) return;

        try {
            await deleteDoc(doc(db, 'candidates', candidateId));
            alert('ลบผู้สมัครสำเร็จ');
        } catch (error) {
            console.error('Failed to delete candidate:', error);
            alert('เกิดข้อผิดพลาดในการลบผู้สมัคร');
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
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            🛡️ Admin Dashboard
                        </h1>
                        <p className="text-purple-100">จัดการระบบโหวต</p>
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
                {/* Vote Control Panel */}
                <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">🎛️ ควบคุมการโหวต</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(voteSettings).map(([categoryId, category]) => {
                            const categoryInfo = {
                                karaoke: { emoji: '🎤', name: 'Karaoke Contest' },
                                food: { emoji: '🍜', name: 'Best Food' },
                                cosplay: { emoji: '👘', name: 'Cosplay Contest' }
                            }[categoryId as 'karaoke' | 'food' | 'cosplay'] || { emoji: '📋', name: categoryId };

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

                {/* Candidate Management */}
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

                    {/* Category Selector */}
                    <div className="flex gap-2 mb-4">
                        {['karaoke', 'food', 'cosplay'].map((cat) => {
                            const info = {
                                karaoke: { emoji: '🎤', name: 'Karaoke' },
                                food: { emoji: '🍜', name: 'Food' },
                                cosplay: { emoji: '👘', name: 'Cosplay' }
                            }[cat];

                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                        selectedCategory === cat
                                            ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <div className="text-2xl mb-1">{info?.emoji}</div>
                                    <div className="text-sm">{info?.name}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Stats Summary */}
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

                    {/* Candidates Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="text-left p-3 font-bold text-gray-700">#</th>
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
                                                            {candidate.category === 'karaoke' && '🎤'}
                                                            {candidate.category === 'food' && '🍜'}
                                                            {candidate.category === 'cosplay' && '👘'}
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
                                    <option value="karaoke">🎤 Karaoke</option>
                                    <option value="food">🍜 Food</option>
                                    <option value="cosplay">👘 Cosplay</option>
                                </select>
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
                                    setNewCandidate({ name: '', description: '', imageUrl: '' });
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
        </div>
    );
}
