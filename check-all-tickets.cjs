const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAllTickets() {
  console.log('🔍 กำลังเช็คตั๋วทั้งหมดในระบบ...\n');

  try {
    // 1. เช็คตั๋วใน tickets collection (ตั๋วใหม่)
    console.log('📊 1. ตั๋วใน tickets collection (ระบบใหม่):');
    const ticketsSnapshot = await db.collection('tickets').get();
    console.log(`   ✅ พบตั๋วใหม่: ${ticketsSnapshot.size} ตั๋ว\n`);

    let newTicketsCount = 0;
    let claimedNewTickets = 0;
    ticketsSnapshot.forEach(doc => {
      newTicketsCount++;
      const data = doc.data();
      if (data.claimed) claimedNewTickets++;
    });

    console.log(`   📈 สถิติตั๋วใหม่:`);
    console.log(`      - ยังไม่เคลม: ${newTicketsCount - claimedNewTickets} ตั๋ว`);
    console.log(`      - เคลมแล้ว: ${claimedNewTickets} ตั๋ว\n`);

    // 2. เช็คตั๋วเก่าใน users/*/history (ก่อนอัปเดตระบบ)
    console.log('📊 2. ตั๋วเก่าใน users/*/history (ก่อนอัปเดต):');
    const usersSnapshot = await db.collection('users').get();
    
    let totalOldTickets = 0;
    let claimedOldTickets = 0;
    let userWithTickets = 0;
    const oldTicketsList = [];

    for (const userDoc of usersSnapshot.docs) {
      const historySnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('history')
        .get();

      if (historySnapshot.size > 0) {
        userWithTickets++;
        const userData = userDoc.data();
        
        historySnapshot.forEach(ticket => {
          const ticketData = ticket.data();
          totalOldTickets++;
          if (ticketData.claimed) claimedOldTickets++;
          
          oldTicketsList.push({
            ticketId: ticketData.ticketId || ticket.id,
            userId: userDoc.id,
            userName: userData.displayName || userData.email,
            prize: ticketData.prize,
            claimed: ticketData.claimed || false,
            timestamp: ticketData.timestamp
          });
        });
      }
    }

    console.log(`   ✅ พบผู้ใช้ที่มีตั๋วเก่า: ${userWithTickets} คน`);
    console.log(`   ✅ พบตั๋วเก่า: ${totalOldTickets} ตั๋ว\n`);

    console.log(`   📈 สถิติตั๋วเก่า:`);
    console.log(`      - ยังไม่เคลม: ${totalOldTickets - claimedOldTickets} ตั๋ว`);
    console.log(`      - เคลมแล้ว: ${claimedOldTickets} ตั๋ว\n`);

    // 3. สรุปรวม
    console.log('📊 3. สรุปรวมทั้งหมด:');
    console.log(`   🎫 ตั๋วทั้งหมด: ${newTicketsCount + totalOldTickets} ตั๋ว`);
    console.log(`   ✅ เคลมแล้ว: ${claimedNewTickets + claimedOldTickets} ตั๋ว`);
    console.log(`   ⏳ รอเคลม: ${(newTicketsCount - claimedNewTickets) + (totalOldTickets - claimedOldTickets)} ตั๋ว\n`);

    // 4. แสดงรายละเอียดตั๋วเก่าที่ต้อง migrate
    if (oldTicketsList.length > 0) {
      console.log('⚠️  ตั๋วเก่าที่ควร Migrate:');
      console.log('─'.repeat(80));
      oldTicketsList.forEach((ticket, index) => {
        const status = ticket.claimed ? '✅ เคลมแล้ว' : '⏳ รอเคลม';
        console.log(`${index + 1}. ${status} | ${ticket.prize} | ${ticket.userName}`);
        console.log(`   Ticket ID: ${ticket.ticketId}`);
        console.log(`   User ID: ${ticket.userId}\n`);
      });
    }

    console.log('✅ เช็คตั๋วเสร็จสิ้น!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

checkAllTickets()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
