const express = require('express');
const app = express();

app.use(express.json());

// تخزين الغرف في الذاكرة
const rooms = {};

// 1. إنشاء غرفة جديدة (/create_room.php)
app.post('/create_room.php', (req, res) => {
    const { roomId, playerName, playerId, roomType } = req.body;

    if (rooms[roomId]) {
        return res.json({ status: "exists" });
    }

    rooms[roomId] = {
        player1_name: playerName,
        player1_id: playerId,
        player1_connected: true,
        player2_name: "الخصم",
        player2_id: null,
        player2_connected: false,
        spectators: [],
        boardHistory: [],
        lastMove: null,
        lastChat: null,
        newGameRequest: null,
        newGameAccepted: false,
        newGameDeclined: false,
        disconnectTimer: null,
        createdAt: Date.now(),
        lastEventMessage: null,
        roomType: roomType || "عامة",
        
        // متغيرات المؤقتات وإدارة الوقت الخادم
        timeLeftPlayer1: 180000,
        timeLeftPlayer2: 180000,
        lastTimerUpdate: Date.now(),
        timerRunning: false
    };

    return res.json({ status: "created" });
});

// 2. استعراض الغرف المتاحة (/get_rooms.php)
app.all('/get_rooms.php', (req, res) => {
    const now = Date.now();
    for (const rId in rooms) {
        if (!rooms[rId].player2_id && (now - rooms[rId].createdAt > 3600000)) {
            if (rooms[rId].disconnectTimer) clearTimeout(rooms[rId].disconnectTimer);
            delete rooms[rId];
        }
    }

    const roomsList = [];
    for (const rId in rooms) {
        const room = rooms[rId];
        
        // إظهار الغرف العامة فقط في القائمة العامة
        if (room.roomType === "خاصة" && room.player2_id) {
            continue;
        }

        roomsList.push({
            roomId: rId,
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            creatorPlayerId: room.player1_id,
            opponentPlayerId: room.player2_id,
            hasOpponent: !!(room.player2_id && room.player2_connected),
            spectatorsCount: room.spectators.length,
            roomType: room.roomType
        });
    }
    return res.json(roomsList);
});

// 3. انضمام غرفة (/join_room.php)
app.post('/join_room.php', (req, res) => {
    const { roomId, playerName, playerId } = req.body;

    if (!rooms[roomId]) {
        return res.json({ status: "room_not_found" });
    }

    const room = rooms[roomId];

    if (room.player1_id === playerId) {
        room.player1_connected = true;
        if (room.disconnectTimer) {
            clearTimeout(room.disconnectTimer);
            room.disconnectTimer = null;
        }
        room.lastEventMessage = `المنشئ "${room.player1_name}" عاد للغرفة`;

        return res.json({
            status: "rejoined_creator",
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            timeLeftPlayer1: room.timeLeftPlayer1,
            timeLeftPlayer2: room.timeLeftPlayer2,
            gameState: { boardHistory: room.boardHistory }
        });
    }

    if (room.player2_id === playerId) {
        room.player2_connected = true;
        if (room.disconnectTimer) {
            clearTimeout(room.disconnectTimer);
            room.disconnectTimer = null;
        }
        room.lastEventMessage = `اللاعب "${room.player2_name}" عاد للغرفة`;

        return res.json({
            status: "rejoined_player2",
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            timeLeftPlayer1: room.timeLeftPlayer1,
            timeLeftPlayer2: room.timeLeftPlayer2,
            gameState: { boardHistory: room.boardHistory }
        });
    }

    if (!room.player2_id || !room.player2_connected) {
        room.player2_id = playerId;
        room.player2_name = playerName;
        room.player2_connected = true;
        room.timerRunning = true; // بدء احتساب الوقت فور انضمام اللاعب الثاني
        room.lastTimerUpdate = Date.now();
        room.lastEventMessage = `اللاعب "${playerName}" انضم للغرفة`;

        return res.json({
            status: "joined",
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            timeLeftPlayer1: room.timeLeftPlayer1,
            timeLeftPlayer2: room.timeLeftPlayer2,
            gameState: { boardHistory: room.boardHistory }
        });
    }

    if (!room.spectators.includes(playerName)) {
        room.spectators.push(playerName);
    }
    return res.json({
        status: "spectator",
        creatorName: room.player1_name,
        opponentName: room.player2_name,
        timeLeftPlayer1: room.timeLeftPlayer1,
        timeLeftPlayer2: room.timeLeftPlayer2,
        gameState: { boardHistory: room.boardHistory }
    });
});

// 4. تنفيذ حركة (/make_move.php)
app.post('/make_move.php', (req, res) => {
    const { roomId, board, pos, player } = req.body;

    if (!rooms[roomId]) {
        return res.json({ status: "room_not_found" });
    }

    const room = rooms[roomId];
    
    // تحديث استهلاك الوقت عند كل حركة وقبل تبديل الدور
    if (room.timerRunning) {
        const now = Date.now();
        const elapsed = now - room.lastTimerUpdate;
        const currentTurn = (room.boardHistory.length % 2 === 0) ? 1 : 2;
        
        if (currentTurn === 1) {
            room.timeLeftPlayer1 = Math.max(0, room.timeLeftPlayer1 - elapsed);
        } else {
            room.timeLeftPlayer2 = Math.max(0, room.timeLeftPlayer2 - elapsed);
        }
        room.lastTimerUpdate = now;
    }

    room.lastMove = { board, pos, player };
    room.boardHistory.push({ board, pos, player });

    return res.json({ status: "ok" });
});

// 5. جلب التحديثات دورياً (/get_updates.php)
app.post('/get_updates.php', (req, res) => {
    const { roomId, myTag } = req.body;

    if (!rooms[roomId]) {
        return res.json({ status: "room_deleted" });
    }

    const room = rooms[roomId];

    if (myTag === 1) {
        room.player1_connected = true;
    } else if (myTag === 2) {
        room.player2_connected = true;
    }

    const isPlayer1Active = room.player1_connected;
    const isPlayer2Active = room.player2_id && room.player2_connected;

    if (room.player2_id && (!isPlayer1Active || !isPlayer2Active) && !room.disconnectTimer) {
        room.disconnectTimer = setTimeout(() => {
            if (rooms[roomId]) {
                delete rooms[roomId];
            }
        }, 30000); 
    } 
    else if (isPlayer1Active && isPlayer2Active && room.disconnectTimer) {
        clearTimeout(room.disconnectTimer);
        room.disconnectTimer = null;
    }

    // حساب الوقت المتبقي في الخلفية بناءً على خادم الوقت إذا كان اللعب جارياً
    if (room.timerRunning && room.player2_id) {
        const now = Date.now();
        const elapsed = now - room.lastTimerUpdate;
        room.lastTimerUpdate = now;

        const currentTurn = (room.boardHistory.length % 2 === 0) ? 1 : 2;
        if (currentTurn === 1) {
            room.timeLeftPlayer1 = Math.max(0, room.timeLeftPlayer1 - elapsed);
        } else {
            room.timeLeftPlayer2 = Math.max(0, room.timeLeftPlayer2 - elapsed);
        }
    }

    const currentTurn = (room.boardHistory.length % 2 === 0) ? 1 : 2;

    const responseData = {
        status: "ok",
        turn: currentTurn,
        creatorName: room.player1_name,
        opponentName: room.player2_name,
        opponentConnected: !!(room.player2_id && room.player2_connected),
        spectators: room.spectators,
        lastMove: room.lastMove,
        lastChat: room.lastChat,
        newGameRequest: room.newGameRequest,
        newGameAccepted: room.newGameAccepted,
        newGameDeclined: room.newGameDeclined,
        boardHistory: room.boardHistory,
        lastEventMessage: room.lastEventMessage,
        timeLeftPlayer1: room.timeLeftPlayer1,
        timeLeftPlayer2: room.timeLeftPlayer2
    };

    if (room.lastEventMessage) {
        room.lastEventMessage = null;
    }

    if (room.newGameAccepted) {
        setTimeout(() => {
            if (rooms[roomId]) {
                rooms[roomId].newGameAccepted = false;
                rooms[roomId].timeLeftPlayer1 = 180000;
                rooms[roomId].timeLeftPlayer2 = 180000;
                rooms[roomId].lastTimerUpdate = Date.now();
                rooms[roomId].timerRunning = true;
            }
        }, 2000);
    }

    if (room.newGameDeclined) {
        room.newGameDeclined = false;
    }

    return res.json(responseData);
});

app.post('/send_chat.php', (req, res) => {
    const { roomId, message } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].lastChat = message;
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

app.post('/request_new_game.php', (req, res) => {
    const { roomId, senderTag, requestId } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].newGameRequest = { senderTag, requestId };
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

app.post('/accept_new_game.php', (req, res) => {
    const { roomId } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].newGameAccepted = true;
        rooms[roomId].newGameRequest = null;
        rooms[roomId].boardHistory = [];
        rooms[roomId].lastMove = null;
        rooms[roomId].timeLeftPlayer1 = 180000;
        rooms[roomId].timeLeftPlayer2 = 180000;
        rooms[roomId].timerRunning = true;
        rooms[roomId].lastTimerUpdate = Date.now();
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

app.post('/decline_new_game.php', (req, res) => {
    const { roomId } = req.body;
    if (rooms[roomId]) {
        delete rooms[roomId];
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

app.post('/leave_room.php', (req, res) => {
    const { roomId, playerTag, playerId } = req.body;
    
    if (rooms[roomId]) {
        const room = rooms[roomId];

        if (playerTag === 1 || room.player1_id === playerId) {
            room.player1_connected = false;
            room.lastEventMessage = `المنشئ "${room.player1_name}" غادر الغرفة`;
        } else if (playerTag === 2 || room.player2_id === playerId) {
            room.player2_connected = false;
            room.lastEventMessage = `اللاعب "${room.player2_name}" غادر الغرفة`;
        }

        if (!room.player2_id) {
            return res.json({ status: "ok" });
        }

        if (!room.disconnectTimer) {
            room.disconnectTimer = setTimeout(() => {
                if (rooms[roomId]) {
                    delete rooms[roomId];
                }
            }, 30000);
        }

        return res.json({ status: "ok" });
    }
    return res.json({ status: "room_not_found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
