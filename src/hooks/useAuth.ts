import { useContext } from 'react';
// เช็คว่ามีการ import และ path ถูกต้องหรือไม่
import { AuthContext } from '../components/contexts/AuthContext'; 

export const useAuth = () => {
    return useContext(AuthContext);
};