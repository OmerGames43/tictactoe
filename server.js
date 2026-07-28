const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// تخزين بيانات الغرف
const rooms = {};

app.get('/', (req, res) => {
    res.send("Tic-Tac-Toe Server is Running!");
});

// 1. إنشاء غرفة جديدة
app.post('/create_room.php', (req, res) => {
    const { roomId, player } = req.body;
    if (!roomId) return res.status(400).json({ success: false, error: "Room ID required" });

    rooms[roomId] = {
        player1: player || 1,
        player2: null,
        moves: [],      // حفظ كافة الحركات لضمان عدم ضياع أي حركة
        chats: [],      // حفظ الرسائل
        currentTurn: 1  // Player 1 يبدأ دائماً
    };

    console.log(`Room created: ${roomId}`);
    res.json({ success: true });
});

// 2. الانضمام للغرفة
app.post('/join_room.php', (req, res) => {
    const { roomId, player } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].player2 = player || 2;
        console.log(`Player joined room: ${roomId}`);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

// 3. تسجيل الحركة مع التحقق من الدور
app.post('/make_move.php', (req, res) => {
    const { roomId, board, pos, player } = req.body;
    if (rooms[roomId]) {
        const room = rooms[roomId];

        const moveObj = {
            board: parseInt(board),
            pos: parseInt(pos),
            player: parseInt(player),
            id: Date.now()
        };

        room.moves.push(moveObj);
        room.currentTurn = (parseInt(player) === 1) ? 2 : 1;

        console.log(`Move in ${roomId}: Board ${board}, Pos ${pos}, Player ${player}`);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

// 4. إرسال الشات
app.post('/send_chat.php', (req, res) => {
    const { roomId, message } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].chats.push({ message, id: Date.now() });
        return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

// 5. جلب التحديثات (Polling)
app.post('/get_updates.php', (req, res) => {
    const { roomId, lastMoveId, lastChatId } = req.body;
    if (rooms[roomId]) {
        const room = rooms[roomId];

        // تصفية الحركات والرسائل الجديدة فقط بالنسبة للهاتف المستعلم
        const newMoves = room.moves.filter(m => !lastMoveId || m.id > lastMoveId);
        const newChats = room.chats.filter(c => !lastChatId || c.id > lastChatId);

        return res.json({
            opponentConnected: room.player2 !== null,
            currentTurn: room.currentTurn,
            moves: newMoves,
            chats: newChats
        });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
