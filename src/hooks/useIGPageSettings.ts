import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseApp';

interface IGPageSettings {
    isOpen: boolean;
    message?: string;
}

export function useIGPageSettings() {
    const [settings, setSettings] = useState<IGPageSettings>({ isOpen: true });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'igPage');
        
        const unsubscribe = onSnapshot(
            settingsRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setSettings(snapshot.data() as IGPageSettings);
                } else {
                    // Default: เปิดใช้งาน - สร้าง document ถ้ายังไม่มี
                    const defaultSettings = { isOpen: true, message: '' };
                    setDoc(settingsRef, defaultSettings).catch(err => {
                        console.error('Error creating default IG settings:', err);
                    });
                    setSettings(defaultSettings);
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching IG page settings:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const toggleIGPage = async (isOpen: boolean) => {
        try {
            const settingsRef = doc(db, 'settings', 'igPage');
            await updateDoc(settingsRef, { isOpen });
            return true;
        } catch (err: any) {
            console.error('Error toggling IG page:', err);
            // ถ้า document ยังไม่มี ให้สร้างใหม่
            if (err.code === 'not-found') {
                try {
                    const settingsRef = doc(db, 'settings', 'igPage');
                    await setDoc(settingsRef, { isOpen, message: '' });
                    return true;
                } catch (createErr) {
                    console.error('Error creating IG settings:', createErr);
                    return false;
                }
            }
            return false;
        }
    };

    return { settings, loading, error, toggleIGPage };
}
