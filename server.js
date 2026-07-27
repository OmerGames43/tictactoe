const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// إعداد Socket.io مع السماح بالاتصال من أي مصدر (CORS)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// تحديد البورت تلقائياً من Railway أو استخدام 3000 للتجربة المحلية
const PORT = process.env.PORT || 3000;

// مسار بسيط للتأكد من أن السيرفر يعمل عند فتحه في المتصفح
app.get('/', (req, res) => {
    res.send('XO Game Server is Running!');
});

// إدارة اتصالات اللعبة عبر Socket.io
io.on('connection', (socket) => {
    console.log('لاعب جديد اتصل:', socket.id);

    // استقبال حركة من لاعب (XO Move)
    socket.on('make_move', (data) => {
        // إرسال الحركة للاعب الآخر في نفس الغرفة أو للجميع
        socket.broadcast.emit('receive_move', data);
    });

    // عند قطع الاتصال
    socket.on('disconnect', () => {
        console.log('لاعب قطع الاتصال:', socket.id);
    });
});

// تشغيل السيرفر على البورت المحدد
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
