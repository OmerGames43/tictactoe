const express = require('express');
const app = express();

app.use(express.json());

// تخزين الغرف في الذاكرة
const rooms = {};

// 1. إنشاء غرفة جديدة (/create_room.php)
app.post('/create_room.php', (req, res) => {
    const { roomId, playerName, playerId } = req.body;

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
        disconnectTimer: null // **[تمت الإضافة]** مؤقت مهلة خروج أحد اللاعبين
    };

    return res.json({ status: "created" });
});

// 2. استعراض الغرف المتاحة (/get_rooms.php)
app.all('/get_rooms.php', (req, res) => {
    const roomsList = [];
    for (const rId in rooms) {
        const room = rooms[rId];
        
        roomsList.push({
            roomId: rId,
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            creatorPlayerId: room.player1_id,
            opponentPlayerId: room.player2_id,
            hasOpponent: !!(room.player2_id && room.player2_connected),
            spectatorsCount: room.spectators.length
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

    // **[تم التعديل]** إعادة انضمام المنشئ وإلغاء مؤقت الحذف إن وجد
    if (room.player1_id === playerId) {
        room.player1_connected = true;
        if (room.disconnectTimer) {
            clearTimeout(room.disconnectTimer);
            room.disconnectTimer = null;
        }
        return res.json({
            status: "rejoined_creator",
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            gameState: { boardHistory: room.boardHistory }
        });
    }

    // **[تم التعديل]** إعادة انضمام اللاعب الثاني وإلغاء مؤقت الحذف إن وجد
    if (room.player2_id === playerId) {
        room.player2_connected = true;
        if (room.disconnectTimer) {
            clearTimeout(room.disconnectTimer);
            room.disconnectTimer = null;
        }
        return res.json({
            status: "rejoined_player2",
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            gameState: { boardHistory: room.boardHistory }
        });
    }

    // انضمام لاعب ثاني لأول مرة
    if (!room.player2_id || !room.player2_connected) {
        room.player2_id = playerId;
        room.player2_name = playerName;
        room.player2_connected = true;
        return res.json({
            status: "joined",
            creatorName: room.player1_name,
            opponentName: room.player2_name,
            gameState: { boardHistory: room.boardHistory }
        });
    }

    // المشاهدون
    if (!room.spectators.includes(playerName)) {
        room.spectators.push(playerName);
    }
    return res.json({
        status: "spectator",
        creatorName: room.player1_name,
        opponentName: room.player2_name,
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
    room.lastMove = { board, pos, player };
    room.boardHistory.push({ board, pos, player });

    return res.json({ status: "ok" });
});

// 5. جلب التحديثات دورياً (/get_updates.php)
app.post('/get_updates.php', (req, res) => {
    const { roomId } = req.body;

    if (!rooms[roomId]) {
        return res.json({ status: "room_deleted" });
    }

    const room = rooms[roomId];

    // **[تم التعديل بالكامل هنا]** إدارة مهلة الـ 30 ثانية عند انقطاع أحد اللاعبين الأساسيين
    const isPlayer1Active = room.player1_connected;
    const isPlayer2Active = room.player2_id && room.player2_connected;

    // إذا كان أحد اللاعبين الأساسيين قد انقطع اتصاله ولم تبدأ المهلة بعد
    if ((!isPlayer1Active || !isPlayer2Active) && !room.disconnectTimer) {
        room.disconnectTimer = setTimeout(() => {
            if (rooms[roomId]) {
                delete rooms[roomId]; // حذف الغرفة نهائياً بعد مرور 30 ثانية
            }
        }, 30000); // 30 ثانية
    } 
    // إذا عاد اللاعبان معاً قبل انتهاء الـ 30 ثانية، نلغي المؤقت
    else if (isPlayer1Active && isPlayer2Active && room.disconnectTimer) {
        clearTimeout(room.disconnectTimer);
        room.disconnectTimer = null;
    }

    const currentTurn = (room.boardHistory.length % 2 === 0) ? 1 : 2;

    const responseData = {
        status: "ok",
        turn: currentTurn,
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

// 6. إرسال دردشة أو إيموجي (/send_chat.php)
app.post('/send_chat.php', (req, res) => {
    const { roomId, message } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].lastChat = message;
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

// 7. طلب لعبة جديدة (/request_new_game.php)
app.post('/request_new_game.php', (req, res) => {
    const { roomId, senderTag, requestId } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].newGameRequest = { senderTag, requestId };
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

// 8. قبول لعبة جديدة (/accept_new_game.php)
app.post('/accept_new_game.php', (req, res) => {
    const { roomId } = req.body;
    if (rooms[roomId]) {
        rooms[roomId].newGameAccepted = true;
        rooms[roomId].newGameRequest = null;
        rooms[roomId].boardHistory = [];
        rooms[roomId].lastMove = null;
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

// 9. رفض لعبة جديدة (/decline_new_game.php)
app.post('/decline_new_game.php', (req, res) => {
    const { roomId } = req.body;
    if (rooms[roomId]) {
        delete rooms[roomId];
        return res.json({ status: "ok" });
    }
    return res.json({ status: "error" });
});

// 10. مغادرة الغرفة (/leave_room.php)
app.post('/leave_room.php', (req, res) => {
    const { roomId, playerTag, playerId } = req.body;
    
    if (rooms[roomId]) {
        const room = rooms[roomId];

        // **[تم التعديل]** تسجيل خروج اللاعب وتفعيل مؤقت الـ 30 ثانية فوراً
        if (playerTag === 1 || room.player1_id === playerId) {
            room.player1_connected = false;
        } else if (playerTag === 2 || room.player2_id === playerId) {
            room.player2_connected = false;
        }

        // إذا لم يبدأ المؤقت بعد، نبدأه عند مغادرة أحد اللاعبين الأساسيين
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
