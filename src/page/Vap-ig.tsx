
import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import BottomNav from "../components/BottomNav";

import { watchAuthState, getUserProfile, deductPointsFromUser } from "../firebaseApp"; 

const SUBMISSION_COST = 10; 

export default function Contact() {
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setUserPoints(profile.points);
        }
      } else {
        setUser(null);
        setUserPoints(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      setError("กรุณาล็อกอินก่อนส่งวาร์ปครับ");
      return;
    }
    if (!title || !imageFile) {
      setError("กรุณากรอกไอจีและเลือกรูปภาพด้วยครับ");
      return;
    }
    if (userPoints === null || userPoints < SUBMISSION_COST) {
      setError(`แต้มของคุณไม่พอ (ต้องใช้ ${SUBMISSION_COST} แต้ม)`);
      return;
    }

    setLoading(true);
    setError(null);

    const toBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

    try {
      const base64Image = await toBase64(imageFile);
      const imageData = base64Image.replace(/^data:[^;]+;base64,/, "");

      const form = new URLSearchParams();
      form.append("title", title);
      form.append("subtitle", subtitle);
      form.append("mimeType", imageFile.type);
      form.append("imageData", imageData);

      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtkGGR-l8gzx4-2rXZUAFk1SGxijnuwrSSIZkhiDzi5WG1HqaX8ROzjXCXefHzbaEgpw/exec";

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();

      if (result.status === "success") {
        try {
            await deductPointsFromUser(user.uid, SUBMISSION_COST);
            setUserPoints(prevPoints => (prevPoints !== null ? prevPoints - SUBMISSION_COST : null));
            
            alert("อัปโหลดสำเร็จแล้วค้าบ! (หัก 10 แต้ม)");
            setTitle("");
            setSubtitle("");
            setImageFile(null);
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = "";

        } catch (deductError) {
            console.error("Upload success, but failed to deduct points:", deductError);
            setError("อัปโหลดสำเร็จ แต่เกิดปัญหาในการหักแต้ม กรุณาติดต่อแอดมิน");
        }
      } else {
        throw new Error(result.message || "เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์");
      }
    } catch (err: any) {
      setError(err.message || "อัปโหลดไม่สำเร็จ");
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <BottomNav />

      {user && (
        <div className="absolute top-5 right-5 bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-full shadow">
            แต้มของคุณ: {userPoints ?? "Loading..."}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="card bg-white/80 dark:bg-gray-900/80 p-8 rounded-2xl shadow-lg border border-gray-200 max-w-sm w-full text-center backdrop-blur-md"
      >
        <h1 className="text-3xl font-bold text-[#FFFFFF] mb-6 tracking-wide">
          แจกวาร์ปกันค้าบวัยรุ่น
        </h1>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IG
            </label>
            <input
              type="text"
              placeholder="แปะชื่อไอจี"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading || !user}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Caption
            </label>
            <input
              type="text"
              placeholder="ใส่แคปชั่นที่ต้องการ"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              disabled={loading || !user}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            เลือกรูปภาพ
          </label>
          <input
            type="file"
            accept="image/*"
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-white dark:hover:file:bg-blue-800 block w-full text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-700/50 rounded-lg border border-gray-300 dark:border-gray-600 p-2"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImageFile(e.target.files[0]);
              }
            }}
            disabled={loading || !user}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !user} // ปิดปุ่มถ้า loading หรือยังไม่ล็อกอิน
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "กำลังส่ง..." : `ส่งวาปเลย!! (ใช้ ${SUBMISSION_COST} แต้ม)`}
        </button>

        {!user && <p className="text-yellow-500 mt-4">กรุณาล็อกอินเพื่อใช้งาน</p>}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
    </main>
  );
}