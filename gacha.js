// --- CONFIGURATION: ตั้งค่าต่างๆ ที่นี่ ---
const CONFIG = {
    spinCost: 20, // << คุณสามารถเปลี่ยนค่าแต้มที่ใช้ในการสุ่มได้ที่นี่
    prizes: [     // << คุณสามารถเพิ่ม/แก้ไข/ลบ ของรางวัลได้ที่นี่
        { 'fillStyle': '#7C3AED', 'text': 'เสื้อยืด EG-OKE' },
        { 'fillStyle': '#4F46E5', 'text': 'ส่วนลด 50 แต้ม' },
        { 'fillStyle': '#DB2777', 'text': 'โปสเตอร์ลายเซ็น' },
        { 'fillStyle': '#F97316', 'text': 'ลองอีกครั้ง' },
        { 'fillStyle': '#7C3AED', 'text': 'พวงกุญแจ' },
        { 'fillStyle': '#4F46E5', 'text': 'ส่วนลด 50 แต้ม' },
        { 'fillStyle': '#059669', 'text': 'บัตร VIP Pass', 'rarity': 'rare' }, // รางวัลพิเศษ
        { 'fillStyle': '#F97316', 'text': 'ลองอีกครั้ง' }
    ]
};

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyDCjt8DfkKCsjc73Oaay851FYu8pG1-3TY",
    authDomain: "egoke-7dae5.firebaseapp.com",
    projectId: "egoke-7dae5",
    storageBucket: "egoke-7dae5.appspot.com",
    messagingSenderId: "910235640821",
    appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global Variables ---
let gachaWheel;
let currentUser = null;
let userPoints = 0;

// --- UI Elements ---
const spinButton = document.getElementById('spinButton');
const userPointsEl = document.getElementById('userPoints');
const historyListEl = document.getElementById('historyList');
const resultModal = document.getElementById('resultModal');
const prizeTextEl = document.getElementById('prizeText');

document.addEventListener('DOMContentLoaded', () => {
    // ตั้งค่าข้อความราคาบนปุ่ม
    document.getElementById('spinCostText').textContent = CONFIG.spinCost;

    // สร้างวงล้อ
    gachaWheel = new Winwheel({
        'numSegments': CONFIG.prizes.length,
        'outerRadius': 200,
        'textFontSize': 16,
        'segments': CONFIG.prizes,
        'animation': {
            'type': 'spinToStop',
            'duration': 5,
            'spins': 8,
            'callbackFinished': handleSpinResult,
        }
    });

    // ตรวจสอบสถานะผู้ใช้
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            fetchUserData();
        } else {
            window.location.href = 'login_page.html';
        }
    });

    spinButton.addEventListener('click', handleSpin);
});

async function fetchUserData() {
    if (!currentUser) return;
    const userRef = db.collection('users').doc(currentUser.uid);
    
    // Fetch user points
    const doc = await userRef.get();
    if (doc.exists) {
        userPoints = doc.data().points;
        updatePointsUI();
    }

    // Fetch gacha history
    fetchGachaHistory();
}

async function fetchGachaHistory() {
    const historyRef = db.collection('users').doc(currentUser.uid).collection('gacha_history').orderBy('timestamp', 'desc').limit(5);
    const snapshot = await historyRef.get();

    historyListEl.innerHTML = ''; // Clear old history
    if (snapshot.empty) {
        historyListEl.innerHTML = '<li class="text-center p-4">ยังไม่มีประวัติการสุ่ม</li>';
        return;
    }

    snapshot.forEach(doc => {
        const item = doc.data();
        const date = item.timestamp.toDate().toLocaleString('th-TH');
        const li = document.createElement('li');
        li.innerHTML = `<a>คุณได้รับ <strong>${item.prize}</strong> <span class="text-xs opacity-60">${date}</span></a>`;
        historyListEl.appendChild(li);
    });
}

function updatePointsUI() {
    userPointsEl.textContent = userPoints;
    // เปิด/ปิดปุ่มตามแต้มที่มี
    if (userPoints < CONFIG.spinCost) {
        spinButton.disabled = true;
        spinButton.classList.add("btn-disabled");
    } else {
        spinButton.disabled = false;
        spinButton.classList.remove("btn-disabled");
    }
}

function handleSpin() {
    if (userPoints < CONFIG.spinCost) {
        alert("แต้มของคุณไม่พอ!");
        return;
    }

    // ปิดปุ่มกันการกดซ้ำ และเริ่มหมุน
    spinButton.disabled = true;
    spinButton.classList.add("btn-disabled");
    gachaWheel.startAnimation();
}

async function handleSpinResult(indicatedSegment) {
    const prize = indicatedSegment.text;

    // แสดงผลรางวัลใน Modal
    prizeTextEl.textContent = `คุณได้รับ "${prize}"!`;
    resultModal.showModal();

    // หักแต้มและบันทึกประวัติลง Firestore
    const userRef = db.collection('users').doc(currentUser.uid);
    const newPoints = userPoints - CONFIG.spinCost;

    try {
        await db.runTransaction(async (transaction) => {
            // 1. Update user points
            transaction.update(userRef, { points: newPoints });

            // 2. Add to gacha history
            const historyRef = userRef.collection('gacha_history').doc();
            transaction.set(historyRef, {
                prize: prize,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // อัปเดตข้อมูลล่าสุดหลัง Transaction สำเร็จ
        userPoints = newPoints;
        updatePointsUI();
        fetchGachaHistory();

    } catch (error) {
        console.error("Transaction failed: ", error);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล!");
    }

    // Reset วงล้อและเปิดปุ่ม
    gachaWheel.stopAnimation(false);
    gachaWheel.rotationAngle = 0;
    gachaWheel.draw();
    spinButton.disabled = false;
    updatePointsUI(); // เช็คแต้มอีกครั้งเพื่อเปิด/ปิดปุ่ม
}