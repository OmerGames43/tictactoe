const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// تخزين بيانات الغرف والحركات في الذاكرة المؤقتة
const rooms = {};

// 1. مسار التأكد من عمل السيرفر في المتصفح
app.get('/', (req, res) => {
    res.send("Tic-Tac-Toe Server is Running Perfectly!");
});

// 2. إنشاء غرفة جديدة
app.post('/create_room.php', (req, res) => {
    const { roomId, player } = req.body;
    if (!roomId) {
        return res.status(400).json({ success: false, error: "Room ID is required" });
    }

    rooms[roomId] = {
        player1: player || 1,
        player2: null,
        lastMove: null,
        lastChat: null
    };

    console.log(`Room created: ${roomId}`);
    res.json({ success: true, message: "Room created successfully" });
});

// 3. الانضمام لغرفة موجودة
app.post('/join_room.php', (req, res) => {
    const { roomId, player } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].player2 = player || 2;
        console.log(`Player 2 joined room: ${roomId}`);
        return res.json({ success: true, message: "Joined successfully" });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

// 4. إرسال حركة اللعب
app.post('/make_move.php', (req, res) => {
    const { roomId, board, pos, player } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].lastMove = { board, pos, player };
        return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

// 5. إرسال إيموجي / شات
app.post('/send_chat.php', (req, res) => {
    const { roomId, message } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].lastChat = message;
        return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

// 6. استلام التحديثات الدورية (Polling)
app.post('/get_updates.php', (req, res) => {
    const { roomId } = req.body;
    if (rooms[roomId]) {
        const room = rooms[roomId];
        return res.json({
            opponentConnected: room.player2 !== null,
            lastMove: room.lastMove,
            lastChat: room.lastChat
        });
    }
    res.status(404).json({ success: false, error: "Room not found" });
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
