const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    console.log('مستخدم جديد اتصل:', socket.id);

    // الانضمام للغرفة
    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`المستخدم ${socket.id} انضم للغرفة: ${roomId}`);
        
        // إبلاغ اللاعب الآخر بوجود منافس
        socket.to(roomId).emit('user_joined', socket.id);

        // --- إشارات نقل اللعب (TicTacToe Moves) ---
        socket.on('send_move', (data) => {
            socket.to(roomId).emit('receive_move', data);
        });

        // --- إشارات الصوت WebRTC ---
        socket.on('offer', (data) => {
            socket.to(roomId).emit('offer', { offer: data.offer, sender: socket.id });
        });

        socket.on('answer', (data) => {
            socket.to(roomId).emit('answer', { answer: data.answer, sender: socket.id });
        });

        socket.on('ice_candidate', (data) => {
            socket.to(roomId).emit('ice_candidate', { candidate: data.candidate, sender: socket.id });
        });

        // عند خروج اللاعب
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user_left', socket.id);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
