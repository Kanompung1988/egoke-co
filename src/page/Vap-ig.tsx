import BottomNav from "../components/BottomNav";
import { useState } from "react";

export default function Contact() {
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleSubtitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubtitle(event.target.value);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title || !imageFile) {
      setError("กรุณากรอกไอจีและเลือกรูปภาพด้วยครับ");
      return;
    }

    setLoading(true);
    setError(null);

    // แปลงไฟล์เป็น base64 (data URL)
    const toBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

    try {
      const base64Image = await toBase64(imageFile);
      // ตัด prefix "data:image/...;base64," ออก เพื่อส่งเฉพาะ payload
      const imageData = base64Image.replace(/^data:[^;]+;base64,/, "");

      // ใช้ form-encoded เพื่อเลี่ยง CORS preflight
      const form = new URLSearchParams();
      form.append("title", title);
      form.append("subtitle", subtitle);
      form.append("mimeType", imageFile.type);
      form.append("imageData", imageData);

      const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwtkGGR-l8gzx4-2rXZUAFk1SGxijnuwrSSIZkhiDzi5WG1HqaX8ROzjXCXefHzbaEgpw/exec";

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: form, // ❗ ห้ามใส่ headers Content-Type เอง
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        alert("อัปโหลดสำเร็จแล้วค้าบ!");
        // เคลียร์ฟอร์ม
        setTitle("");
        setSubtitle("");
        setImageFile(null);
        const fileInput = document.querySelector(
          'input[type="file"]'
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
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

      <form
        onSubmit={handleSubmit}
        className="card bg-white/80 dark:bg-gray-900/80 p-8 rounded-2xl shadow-lg border border-gray-200 max-w-sm w-full text-center backdrop-blur-md"
      >
        <h1 className="text-3xl font-bold text-[#FFFFFF] mb-6 tracking-wide">
          แจกวาร์ปกันค้าบวัยรุ่น
        </h1>

        <div className="space-y-4 mb-6">
          {/* IG / Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IG
            </label>
            <input
              type="text"
              placeholder="แปะชื่อไอจี"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white"
              value={title}
              onChange={handleTitleChange}
            />
          </div>

          {/* Caption / Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Caption
            </label>
            <input
              type="text"
              placeholder="ใส่แคปชั่นที่ต้องการ"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white"
              value={subtitle}
              onChange={handleSubtitleChange}
            />
          </div>
        </div>

        {/* File Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            เลือกรูปภาพ
          </label>
          <input
            type="file"
            accept="image/*"
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-white dark:hover:file:bg-blue-800 block w-full text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-700/50 rounded-lg border border-gray-300 dark:border-gray-600 p-2"
            onChange={handleFileChange}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "กำลังส่ง..." : "ส่งวาปเลย!!"}
        </button>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
    </main>
  );
}
