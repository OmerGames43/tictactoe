const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// كائن لتخزين بيانات الغرف
const rooms = {};

// 1. إنشاء غرفة جديدة (/create_room.php)
app.post('/create_room.php', (req, res) => {
    const { roomId, player, playerName, playerId } = req.body;

    if (!roomId) {
        return res.status(400).json({ error: "roomId is required" });
    }

    if (rooms[roomId]) {
        return res.json({ status: "exists", message: "Room already exists" });
    }

    rooms[roomId] = {
        player1_id: playerId || "p1_default",
        player1_name: playerName || "اللاعب 1",
        player1_connected: true,
        
        player2_id: null,
        player2_name: "الخصم",
        player2_connected: false,

        boardHistory: [], // حفظ كل الحركات ليراها المشاهد
        lastMove: null,
        lastChat: null,
        lastActivity: Date.now()
    };

    console.log(`[CREATE] Room ${roomId} created by ${playerName} (${playerId})`);
    return res.json({ success: true, status: "created" });
});

// 2. الانضمام إلى غرفة (/join_room.php)
app.post('/join_room.php', (req, res) => {
    const { roomId, playerId, playerName } = req.body;

    if (!rooms[roomId]) {
        console.log(`[JOIN FAIL] Room ${roomId} not found`);
        return res.json({ status: "error", message: "room_not_found" });
    }

    const room = rooms[roomId];
    room.lastActivity = Date.now();

    // إعادة اتصال اللاعب الأول (المنشئ)
    if (room.player1_id === playerId) {
        room.player1_connected = true;
        console.log(`[REJOIN] Player 1 (${playerName}) re-joined ${roomId}`);
        return res.json({ status: "rejoined_creator", gameState: room });
    }

    // إعادة اتصال اللاعب الثاني
    if (room.player2_id === playerId) {
        room.player2_connected = true;
        console.log(`[REJOIN] Player 2 (${playerName}) re-joined ${roomId}`);
        return res.json({ status: "rejoined_player2", gameState: room });
    }

    // انضمام لاعب ثاني لأول مرة
    if (!room.player2_id) {
        room.player2_id = playerId;
        room.player2_name = playerName;
        room.player2_connected = true;
        console.log(`[JOIN] Player 2 (${playerName}) joined ${roomId}`);
        return res.json({ status: "joined", gameState: room });
    }

    // الغرفة ممتلئة -> الانضمام كمشاهد وإرسال حالة اللعبة والحركات المكتملة
    console.log(`[SPECTATE] Spectator (${playerName}) joined ${roomId}`);
    return res.json({
        status: "spectator",
        gameState: room
    });
});

// 3. إرسال حركة جديدة (/make_move.php)
app.post('/make_move.php', (req, res) => {
    const { roomId, board, pos, player } = req.body;

    if (rooms[roomId]) {
        const moveData = { board, pos, player };
        rooms[roomId].lastMove = moveData;
        rooms[roomId].boardHistory.push(moveData); // تسجيل الحركة لتاريخ اللوحة
        rooms[roomId].lastActivity = Date.now();

        console.log(`[MOVE] Room ${roomId} -> Player ${player} played at board:${board}, pos:${pos}`);
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: "Room not found" });
    }
});

// 4. جلب التحديثات دورياً والتحقق من حالة الاتصال وحذف الغرفة (/get_updates.php)
app.post('/get_updates.php', (req, res) => {
    const { roomId } = req.body;

    if (!rooms[roomId]) {
        // إذا حُذفت الغرفة يُبلغ التطبيق لإعادة الجميع للرئيسية
        return res.json({ status: "room_deleted" });
    }

    const room = rooms[roomId];

    // إذا خرج اللاعبان الأساسيان معاً بعد بدئهما اللعب -> حذف الغرفة فوراً
    if (!room.player1_connected && !room.player2_connected && room.player2_id) {
        delete rooms[roomId];
        console.log(`[DELETE] Room ${roomId} deleted because both players left.`);
        return res.json({ status: "room_deleted" });
    }

    return res.json({
        status: "ok",
        opponentName: room.player2_name || 'الخصم',
        opponentConnected: room.player2_connected,
        lastMove: room.lastMove,
        lastChat: room.lastChat,
        boardHistory: room.boardHistory
    });
});

// 5. مغادرة أو خروج لاعب (/leave_room.php)
app.post('/leave_room.php', (req, res) => {
    const { roomId, playerId } = req.body;

    if (rooms[roomId]) {
        if (rooms[roomId].player1_id === playerId) {
            rooms[roomId].player1_connected = false;
        } else if (rooms[roomId].player2_id === playerId) {
            rooms[roomId].player2_connected = false;
        }

        // تحريك فحص الحذف إذا خرق كلاهما
        if (!rooms[roomId].player1_connected && !rooms[roomId].player2_connected && rooms[roomId].player2_id) {
            delete rooms[roomId];
            console.log(`[DELETE LEAVE] Room ${roomId} deleted.`);
            return res.json({ status: "room_deleted" });
        }

        return res.json({ success: true });
    }
    return res.json({ success: false });
});

// 6. إرسال دردشة / إيموجي (/send_chat.php)
app.post('/send_chat.php', (req, res) => {
    const { roomId, message } = req.body;

    if (rooms[roomId]) {
        rooms[roomId].lastChat = message;
        rooms[roomId].lastActivity = Date.now();
        console.log(`[CHAT] Room ${roomId}: ${message}`);
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: "Room not found" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TicTacToe server is running on port ${PORT}`);
});
