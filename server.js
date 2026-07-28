const express = require('express');
const cors = require('cors');

const app = express();

// تفعيل CORS وقبول بيانات JSON
app.use(cors());
app.use(express.json());

// كائن لتخزين بيانات الغرف
const rooms = {};

// 1. إنشاء غرفة جديدة (/create_room.php)
app.post('/create_room.php', (req, res) => {
    const { roomId, player } = req.body;
    
    if (!roomId) {
        return res.status(400).json({ error: "roomId is required" });
    }

    rooms[roomId] = {
        player1Connected: true,
        player2Connected: false,
        lastMove: null,
        lastChat: null
    };

    console.log(`[CREATE] Room ${roomId} created by Player ${player}`);
    return res.json({ success: true, status: "created" });
});

// 2. الانضمام إلى غرفة (/join_room.php)
app.post('/join_room.php', (req, res) => {
    const { roomId, player } = req.body;

    if (rooms[roomId]) {
        rooms[roomId].player2Connected = true;
        console.log(`[JOIN] Player ${player} joined Room ${roomId}`);
        return res.json({ status: "joined", success: true });
    } else {
        console.log(`[JOIN FAIL] Room ${roomId} not found`);
        return res.status(404).json({ status: "error", message: "Room not found" });
    }
});

// 3. إرسال حركة جديدة (/make_move.php)
app.post('/make_move.php', (req, res) => {
    const { roomId, board, pos, player } = req.body;

    if (rooms[roomId]) {
        rooms[roomId].lastMove = { board, pos, player };
        console.log(`[MOVE] Room ${roomId} -> Player ${player} played at board:${board}, pos:${pos}`);
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: "Room not found" });
    }
});

// 4. جلب التحديثات دورياً (/get_updates.php)
app.post('/get_updates.php', (req, res) => {
    const { roomId } = req.body;

    if (rooms[roomId]) {
        return res.json({
            opponentConnected: rooms[roomId].player2Connected,
            lastMove: rooms[roomId].lastMove,
            lastChat: rooms[roomId].lastChat
        });
    } else {
        return res.json({
            opponentConnected: false,
            lastMove: null,
            lastChat: null
        });
    }
});

// 5. إرسال دردشة / إيموجي (/send_chat.php)
app.post('/send_chat.php', (req, res) => {
    const { roomId, message } = req.body;

    if (rooms[roomId]) {
        rooms[roomId].lastChat = message;
        console.log(`[CHAT] Room ${roomId}: ${message}`);
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: "Room not found" });
    }
});

// تشغيل الخادم على المنفذ المخصص من Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TicTacToe server is running on port ${PORT}`);
});
 
