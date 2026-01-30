import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseApp';
import { useAuth } from '../hooks/useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  points?: number;
  createdAt: any;
  showOnce: boolean;
  isGlobal: boolean;
}

export default function BonusNotification() {
  const { currentUser } = useAuth();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    checkForNotification();
  }, [currentUser]);

  const checkForNotification = async () => {
    if (!currentUser) return;

    try {
      // เช็คว่าเคยเห็น notification นี้แล้วหรือยัง
      const seenDoc = await getDocs(query(collection(db, 'users', currentUser.uid, 'seenNotifications')));
      
      // ถ้าเคยเห็นแล้ว ไม่ต้องโชว์
      const hasSeen = seenDoc.docs.some(doc => doc.id === 'bonus_points');
      if (hasSeen) return;

      // ดึง global notification
      const notifQuery = query(
        collection(db, 'notifications'),
        where('isGlobal', '==', true),
        where('showOnce', '==', true)
      );

      const notifSnapshot = await getDocs(notifQuery);
      
      if (!notifSnapshot.empty) {
        const notifDoc = notifSnapshot.docs[0];
        const notifData = notifDoc.data();
        
        setNotification({
          id: notifDoc.id,
          type: notifData.type,
          title: notifData.title,
          message: notifData.message,
          points: notifData.points,
          createdAt: notifData.createdAt,
          showOnce: notifData.showOnce,
          isGlobal: notifData.isGlobal
        });
        setShowModal(true);
      }

    } catch (error) {
      console.error('Error checking notification:', error);
    }
  };

  const handleClose = async () => {
    if (!currentUser || !notification) return;

    try {
      // บันทึกว่าเคยเห็นแล้ว
      await setDoc(doc(db, 'users', currentUser.uid, 'seenNotifications', 'bonus_points'), {
        notificationId: notification.id,
        seenAt: new Date(),
        type: 'bonus_points'
      });

      setShowModal(false);
    } catch (error) {
      console.error('Error marking notification as seen:', error);
      setShowModal(false);
    }
  };

  if (!showModal || !notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-3xl shadow-2xl max-w-md w-full mx-4 p-1 animate-scaleIn">
        <div className="bg-white rounded-3xl p-8 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200/30 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/30 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative z-10">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-4 shadow-lg animate-bounce">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {notification.title}
            </h2>

            {/* Points Badge */}
            {notification.points && (
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-full shadow-lg">
                  <span className="text-4xl font-bold">+{notification.points}</span>
                  <span className="text-lg ml-2">แต้ม</span>
                </div>
              </div>
            )}

            {/* Message */}
            <p className="text-gray-700 text-center mb-8 leading-relaxed px-4">
              {notification.message}
            </p>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95"
            >
              รับทราบ 🎉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
