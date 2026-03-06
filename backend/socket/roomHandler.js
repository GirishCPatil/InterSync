const roomHandler = (io) => {
    // Track online users: { userId: socketId } map
    const onlineUsers = new Map();
    // Track socket to user info: { socketId: { userId, userName } } map
    const socketToUser = new Map();

    // Active calls: { callerId: receiverId }
    const activeCalls = new Map();

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // 1. User comes online
        socket.on('register_online', (data) => {
            const { userId, userName } = data;

            onlineUsers.set(userId, socket.id);
            socketToUser.set(socket.id, { userId, userName });

            console.log(`${userName} (${userId}) is now online`);

            // Broadcast to everyone that this user is online
            io.emit('user_status_change', { userId, status: 'online' });

            // Send the new user the list of currently online users
            const onlineList = Array.from(onlineUsers.keys());
            socket.emit('online_users_list', onlineList);
        });

        // 2. Peer matching queries for online status
        socket.on('check_online_status', (data) => {
            const { peerId } = data;
            const isOnline = onlineUsers.has(peerId);
            socket.emit('online_status_result', { peerId, isOnline });
        });

        // 3. Call Request Flow
        socket.on('request_call', (data) => {
            const { targetUserId, callerName, callerId } = data;
            const targetSocketId = onlineUsers.get(targetUserId);

            if (targetSocketId) {
                // Send ring to receiver
                io.to(targetSocketId).emit('incoming_call', {
                    callerId,
                    callerName,
                    signalData: data.signalData // Initial WebRTC offer from caller
                });
            } else {
                // User is offline
                socket.emit('call_failed', { message: 'User is offline or unavailable' });
            }
        });

        // 4. Call Answered
        socket.on('accept_call', (data) => {
            const { callerId, receiverId, signalData } = data;
            const callerSocketId = onlineUsers.get(callerId);

            if (callerSocketId) {
                activeCalls.set(callerId, receiverId);
                activeCalls.set(receiverId, callerId);

                // Send answer back to the caller
                io.to(callerSocketId).emit('call_accepted', {
                    signalData,
                    receiverId
                });
            }
        });

        // 5. Call Rejected
        socket.on('reject_call', (data) => {
            const { callerId } = data;
            const callerSocketId = onlineUsers.get(callerId);

            if (callerSocketId) {
                io.to(callerSocketId).emit('call_rejected', { message: 'Call was declined' });
            }
        });

        // 6. WebRTC Signaling (ICE candidates)
        socket.on('webrtc_signal', (data) => {
            const { targetUserId, signal } = data;
            const targetSocketId = onlineUsers.get(targetUserId);

            if (targetSocketId) {
                io.to(targetSocketId).emit('webrtc_signal', {
                    senderId: socketToUser.get(socket.id)?.userId,
                    signal
                });
            }
        });

        // 7. End Call
        socket.on('end_call', (data) => {
            const { targetUserId } = data;
            const targetSocketId = onlineUsers.get(targetUserId);

            const myUserId = socketToUser.get(socket.id)?.userId;

            if (myUserId) {
                activeCalls.delete(myUserId);
                activeCalls.delete(targetUserId);
            }

            if (targetSocketId) {
                io.to(targetSocketId).emit('call_ended', { message: 'Peer ended the call' });
            }
        });

        // 8. Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);

            const userInfo = socketToUser.get(socket.id);
            if (userInfo) {
                const { userId } = userInfo;

                onlineUsers.delete(userId);
                socketToUser.delete(socket.id);

                // Check if they were in a call and notify the peer
                const peerId = activeCalls.get(userId);
                if (peerId) {
                    const peerSocketId = onlineUsers.get(peerId);
                    if (peerSocketId) {
                        io.to(peerSocketId).emit('call_ended', { message: 'Peer disconnected' });
                    }
                    activeCalls.delete(userId);
                    activeCalls.delete(peerId);
                }

                // Broadcast offline status
                io.emit('user_status_change', { userId, status: 'offline' });
            }
        });
    });
};

module.exports = roomHandler;
