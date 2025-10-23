import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import BottomNav from "../components/BottomNav";

import { watchAuthState, getUserProfile, deductPointsFromUser } from "../firebaseApp";

const SUBMISSION_COST = 50; // แต้มที่ใช้ในการส่งวาร์ป

export default function Contact() {
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const MAX = 22; // จำกัดจำนวนผู้ส่งต่อรอบ
  const [currentCount, setCurrentCount] = useState(14); // mock data: คนที่ส่งแล้ว
  const [activeTab, setActiveTab] = useState<"status" | "schedule" | "rules">("status");


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

          // แสดง success modal แทน alert
          setSuccessMessage(result.message ?? "อัปโหลดสำเร็จแล้วค้าบ! (หักแต้มเรียบร้อย)");
          setShowSuccessModal(true);
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

  const schedule = [
    {
      date: "29 Oct.",
      rounds: [
        { name: "รอบ 19:XX", filled: true },
        { name: "รอบ 20:XX", filled: false },
      ],
    },
    {
      date: "30 Oct.",
      rounds: [
        { name: "รอบ 19:XX", filled: false },
        { name: "รอบ 20:XX", filled: false },
      ],
    },
    {
      date: "31 Oct.",
      rounds: [
        { name: "รอบ 19:XX", filled: false },
        { name: "รอบ 20:XX", filled: false },
      ],
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:justify-center md:p-6 gap-6">
      <BottomNav />

      {/* loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full border-4 border-t-blue-500 border-gray-200 animate-spin" />
            <div className="text-white font-medium">กำลังส่ง...</div>
          </div>
        </div>
      )}

      {user && (
        <div className="absolute top-5 right-5 bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-full shadow">
          แต้มของคุณ: {userPoints ?? "Loading..."}
        </div>
      )}

      {/* Status card - อยู่บนสุด, ปรับให้เหมาะกับมือถือ */}
      <div className="card bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 w-full max-w-md text-center">

        <h1 className="text-xl md:text-2xl font-bold mb-3">
          สถานะการส่งวาร์ป
        </h1>

        {/* ------------------------ */}

        {/* Tabs (mobile-friendly, centered large count) */}
        <div className="w-full">
          <div className="flex justify-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("status")}
              className={`tab rounded-full px-4 py-1 text-sm md:text-base ${activeTab === "status" ? "tab-active" : ""}`}
            >
              สถานะ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className={`tab rounded-full px-4 py-1 text-sm md:text-base ${activeTab === "schedule" ? "tab-active" : ""}`}
            >
              ตาราง
            </button>
            {/* <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`tab rounded-full px-4 py-1 text-sm md:text-base ${activeTab === "rules" ? "tab-active" : ""}`}
            >
              กติกา
            </button> */}
          </div>

          <div className="bg-base-100 border-base-300 p-4 rounded-lg">
            {/* Status panel */}
            {activeTab === "status" && (
              <div className="flex flex-col items-center justify-center">
                <div
                  className="text-6xl sm:text-7xl md:text-8xl font-extrabold text-blue-600 leading-none"
                  aria-live="polite"
                >
                  {currentCount}
                </div>
                <div className="text-sm text-gray-500 mt-1">/ {MAX} คน</div>

                {/* Progress bar */}
                <div className="w-full mt-4 px-2">
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (currentCount / MAX) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 text-center">
                  {currentCount >= MAX ? (
                    <p className="text-red-500 text-sm">❌ รอบนี้เต็มแล้ว! รอรอบถัดไปได้เลย</p>
                  ) : (
                    <p className="text-green-600 text-sm">✅ ยังสามารถส่งได้อีก {MAX - currentCount} คน</p>
                  )}
                </div>
              </div>
            )}

            {/* Schedule panel */}
            {activeTab === "schedule" && (
              <div className="space-y-3">
                {schedule.map((s) => (
                  <div key={s.date} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                    <div className="font-semibold mb-2">{s.date}</div>
                    <div className="flex flex-wrap gap-2">
                      {s.rounds.map((r) => (
                        <div
                          key={r.name}
                          className={`px-3 py-1 rounded-full text-sm ${r.filled ? "bg-red-100 text-red-700" : "bg-green-50 text-green-700"}`}
                        >
                          {r.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rules / info panel */}
            {activeTab === "rules" && (
              <div className="text-sm text-gray-600">
                <p className="mb-2">กติกาสั้น ๆ :</p>
                <ul className="list-disc list-inside text-left">
                  <li>ใช้แต้ม {SUBMISSION_COST} แต้มต่อการส่ง 1 วาร์ป</li>
                  <li>ห้ามส่งข้อความไม่เหมาะสม ทีมงานจะตัดสิทธิ์โดยไม่แจ้งล่วงหน้า</li>
                  <li>เมื่อส่งแล้ว กรุณารอทีมงานตรวจสอบและลงวาร์ป</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* -------------- */}

      </div>

      {/* Form card - อยู่ด้านล่าง */}
      <form
        onSubmit={handleSubmit}
        className="card bg-white/80 dark:bg-gray-900/80 p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200 max-w-sm w-full text-center backdrop-blur-md"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-[#FFFFFF] mb-4 md:mb-6 tracking-wide">
          แจกวาร์ปกันค้าบวัยรุ่น
        </h1>

        <div className="space-y-4 mb-4 md:mb-6">
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

        <div className="mb-4 md:mb-6">
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
          disabled={loading || !user}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "กำลังส่ง..." : `ส่งวาปเลย!! (ใช้ ${SUBMISSION_COST} แต้ม)`}
        </button>

        {!user && <p className="text-yellow-500 mt-4">กรุณาล็อกอินเพื่อใช้งาน</p>}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>

      {/* success modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 mb-4">
                <i className="ri-check-fill text-3xl text-green-500 "></i>
              </div>

              <h3 className="text-xl font-extrabold mb-2 ">ส่งวาร์ปสำเร็จ</h3>
              <p className="text-sm text-gray-600 mb-4">{successMessage ?? "ทีมงานจะตรวจสอบและลงวาร์ปให้เร็ว ๆ นี้"}</p>

              <button onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold"
              > Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules card */}
      <div className="card bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 w-full max-w-md mb-24">
        <div className="flex items-center gap-3 mb-6">
          <i className="ri-error-warning-line text-2xl text-red-500"></i>
          <h2 className="text-xl font-bold">ข้อห้ามในการส่งวาร์ป IG</h2>
        </div>

        <div className="w-full max-w-md space-y-4 mb-4 ">
          {[
            {
              title: "ห้ามส่งวาร์ป IG ที่เจ้าของบัญชีไม่ได้ยินยอม",
              desc: "เพื่อป้องกันการละเมิดสิทธิส่วนบุคคลและการนำข้อมูลไปใช้โดยไม่ได้รับอนุญาต"
            },
            {
              title: "ห้ามวาร์ป IG ที่มีเนื้อหาไม่เหมาะสม",
              desc: "เช่น เนื้อหา 18+, ลามก, ความรุนแรง, หรือละเมิดผู้อื่น"
            },
            {
              title: "ห้ามวาร์ปปลอม / บัญชีสวมรอย / phishing",
              desc: "เพื่อป้องกันการหลอกลวงและการโดนขโมยข้อมูลส่วนตัว"
            },
            {
              title: "ห้ามสแปมวาร์ปซ้ำหรือจำนวนมากเกินไป",
              desc: "ส่งได้เฉพาะเวลาที่เหมาะสมและไม่รบกวนคนอื่น"
            },
            {
              title: "ห้ามแนบข้อความดูหมิ่น หรือคอมเมนต์เชิงลบ",
              desc: "ต้องเคารพเจ้าของ IG ทุกคน"
            },
            {
              title: "ห้ามใช้วาร์ปในทางการค้าโดยไม่ได้รับอนุญาต",
              desc: "เช่น โปรโมตสินค้าหรือบริการแฝงโดยไม่ได้รับอนุมัติจากแอดมิน"
            },
            {
              title: "ห้ามวาร์ปบัญชีส่วนตัว / ปิดไว้ (Private)",
              desc: "เว้นแต่เจ้าของบัญชีอนุญาตให้เผยแพร่ได้"
            },
            {
              title: "ห้ามวาร์ปที่มีเนื้อหาทางการเมืองหรือศาสนา",
              desc: "เพื่อหลีกเลี่ยงความขัดแย้งในคอมมูนิตี้"
            }
          ].map((rule, index) => (
            <div key={index} className="flex gap-4 mb-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{rule.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}