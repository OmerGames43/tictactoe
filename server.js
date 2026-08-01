const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// كائن لتخزين بيانات الغرف
const rooms = {};

// فحص دوري كل دقيقة لحذف الغرف التي لم تحدث فيها أي نشاط منذ أكثر من 5 دقائق (300000 مللي ثانية)
setInterval(() => {
    const now = Date.now();
    const TIMEOUT_LIMIT = 5 * 60 * 1000; // 5 دقائق

    for (const roomId in rooms) {
        if (now - rooms[roomId].lastActivity > TIMEOUT_LIMIT) {
            console.log(`[AUTO-DELETE] Room ${roomId} deleted due to inactivity.`);
            delete rooms[roomId];
        }
    }
}, 60 * 1000);

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
        player1_name: playerName || "المنشئ",
        player1_connected: true,
        
        player2_id: null,
        player2_name: "الخصم",
        player2_connected: false,

        spectators: [], // قائمة المشاهدين

        boardHistory: [],
        lastMove: null,
        lastChat: null,
        
        newGameRequest: null,
        newGameAccepted: false,
        newGameDeclined: false,
        lastAcceptedRequestId: null,

        lastActivity: Date.now()
    };

    console.log(`[CREATE] Room ${roomId} created by ${playerName} (${playerId})`);
    return res.json({ success: true, status: "created" });
});

// 2. الانضمام إلى غرفة (/join_room.php) - (تم تعديل الاستجابة لتشمل الأسماء صراحة)
app.post('/join_room.php', (req, res) => {
    const { roomId, playerId, playerName } = req.body;

    if (!rooms[roomId]) {
        console.log(`[JOIN FAIL] Room ${roomId} not found`);
        return res.json({ status: "error", message: "room_not_found" });
    }

    const room = rooms[roomId];
    room.lastActivity = Date.now();

    if (room.player1_id === playerId) {
        room.player1_connected = true;
        return res.json({ 
            status: "rejoined_creator", 
            gameState: room,
            creatorName: room.player1_name,
            opponentName: room.player2_name
        });
    }

    if (room.player2_id === playerId) {
        room.player2_connected = true;
        return res.json({ 
            status: "rejoined_player2", 
            gameState: room,
            creatorName: room.player1_name,
            opponentName: room.player2_name
        });
    }

    if (!room.player2_id) {
        room.player2_id = playerId;
        room.player2_name = playerName || "الخصم";
        room.player2_connected = true;
        return res.json({ 
            status: "joined", 
            gameState: room,
            creatorName: room.player1_name,
            opponentName: room.player2_name
        });
    }

    const specName = playerName || "مشاهد";
    if (!room.spectators.includes(specName)) {
        room.spectators.push(specName);
    }

    return res.json({
        status: "spectator",
        gameState: room,
        creatorName: room.player1_name,
        opponentName: room.player2_name
    });
});

// 3. إرسال حركة جديدة (/make_move.php)
app.post('/make_move.php', (req, res) => {
    const { roomId, board, pos, player } = req.body;

    if (rooms[roomId]) {
        const moveData = { board, pos, player };
        rooms[roomId].lastMove = moveData;
        rooms[roomId].boardHistory.push(moveData);
        rooms[roomId].lastActivity = Date.now();
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: "Room not found" });
    }
});

// 4. جلب التحديثات دورياً (/get_updates.php)
app.post('/get_updates.php', (req, res) => {
    const { roomId } = req.body;

    if (!rooms[roomId]) {
        return res.json({ status: "room_deleted" });
    }

    const room = rooms[roomId];

    if (!room.player1_connected && !room.player2_connected && room.player2_id) {
        delete rooms[roomId];
        return res.json({ status: "room_deleted" });
    }

    const responseData = {
        status: "ok",
        creatorName: room.player1_name,
        opponentName: room.player2_name,
        opponentConnected: room.player2_connected,
        spectators: room.spectators,
        lastMove: room.lastMove,
        lastChat: room.lastChat,
        newGameRequest: room.newGameRequest,
        newGameAccepted: room.newGameAccepted,
        newGameDeclined: room.newGameDeclined,
        boardHistory: room.boardHistory
    };

    if (room.newGameAccepted) {
        setTimeout(() => {
            if (rooms[roomId]) {
                rooms[roomId].newGameAccepted = false;
            }
        }, 2000);
    }

    if (room.newGameDeclined) {
        room.newGameDeclined = false;
    }

    return res.json(responseData);
});

// 5. طلب لعبة جديدة (/request_new_game.php)
app.post('/request_new_game.php', (req, res) => {
    const { roomId, senderTag, requestId } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].newGameRequest = { senderTag, requestId };
        rooms[roomId].newGameAccepted = false;
        rooms[roomId].newGameDeclined = false;
        rooms[roomId].lastActivity = Date.now();
        return res.json({ success: true });
    }
    return res.status(404).json({ error: "Room not found" });
});

// 6. قبول لعبة جديدة (/accept_new_game.php)
app.post('/accept_new_game.php', (req, res) => {
    const { roomId } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].newGameAccepted = true;
        rooms[roomId].newGameDeclined = false;
        rooms[roomId].newGameRequest = null;
        rooms[roomId].boardHistory = [];
        rooms[roomId].lastMove = null; 
        rooms[roomId].lastActivity = Date.now();
        console.log(`[NEW GAME] Room ${roomId} accepted a new game.`);
        return res.json({ success: true });
    }
    return res.status(404).json({ error: "Room not found" });
});

// 7. رفض لعبة جديدة (/decline_new_game.php)
app.post('/decline_new_game.php', (req, res) => {
    const { roomId } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].newGameDeclined = true;
        rooms[roomId].newGameAccepted = false;
        rooms[roomId].newGameRequest = null;
        rooms[roomId].lastActivity = Date.now();
        return res.json({ success: true });
    }
    return res.status(404).json({ error: "Room not found" });
});

// 8. مغادرة الغرفة (/leave_room.php)
app.post('/leave_room.php', (req, res) => {
    const { roomId, playerId, playerTag, playerName } = req.body;

    if (rooms[roomId]) {
        if (playerTag === 3 || playerName) {
            const specName = playerName ? playerName.replace("👁️", "").trim() : "";
            if (specName) {
                rooms[roomId].spectators = rooms[roomId].spectators.filter(name => {
                    const cleanExisting = name.replace("👁️", "").trim();
                    return cleanExisting !== specName;
                });
                console.log(`[SPECTATOR LEFT] Spectator ${specName} left room ${roomId}`);
            }
        } else if (playerTag === 1) {
            rooms[roomId].player1_connected = false;
        } else if (playerTag === 2) {
            rooms[roomId].player2_connected = false;
        }

        if (!rooms[roomId].player1_connected && !rooms[roomId].player2_connected && rooms[roomId].player2_id) {
            delete rooms[roomId];
            return res.json({ status: "room_deleted" });
        }

        return res.json({ success: true });
    }
    return res.json({ success: false });
});

// 9. إرسال الدردشة (/send_chat.php)
app.post('/send_chat.php', (req, res) => {
    const { roomId, message } = req.body;

    if (rooms[roomId]) {
        rooms[roomId].lastChat = message;
        rooms[roomId].lastActivity = Date.now();
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: "Room not found" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TicTacToe server is running on port ${PORT}`);
});
