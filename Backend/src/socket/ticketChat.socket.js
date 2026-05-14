const { DatabaseHandler } = require("../utils");
const oracledb = require("oracledb");

const db = new DatabaseHandler();
const socketUserMap = new Map();

module.exports = (io) => {
    io.on("connection", (socket) => {

        // ── join_ticket ───────────────────────────────────────────────────────
        socket.on("join_ticket", async ({ ticketId, userId }) => {
            try {
                if (!ticketId || !userId) {
                    return socket.emit("chat_error", { message: "Missing ticketId or userId" });
                }

                const room = `ticket_${ticketId}`;
                socket.join(room);
                socket.data.userId = String(userId);
                socket.data.ticketId = String(ticketId);
                socketUserMap.set(socket.id, { ticketId: String(ticketId), userId: String(userId) });

                const roomSockets = await io.in(room).fetchSockets();
                const onlineUserIds = roomSockets.map((s) => s.data?.userId).filter(Boolean);
                socket.emit("room_online_users", { userIds: onlineUserIds });

                socket.to(room).emit("user_joined", { userId: String(userId) });

                const result = await db.executeQuery(
                    `SELECT MESSAGE_ID, SENDER_ID, SENDER_TYPE, MESSAGE_TEXT,
                            CREATED_DATE, CREATED_TIME
                     FROM   TICKET_CHAT_MESSAGES
                     WHERE  TICKET_ID = :ticketId
                     ORDER  BY CREATED_DATE ASC, CREATED_TIME ASC`,
                    { ticketId },
                    "siri_db"
                );
                socket.emit("message_history", result.rows ?? []);

            } catch (err) {
                console.error("join_ticket error:", err);
                socket.emit("chat_error", { message: "Failed to join ticket chat" });
            }
        });

        // ── send_message ──────────────────────────────────────────────────────
        socket.on("send_message", async ({ ticketId, senderId, senderType, text }) => {
            try {
                if (!ticketId || !senderId || !text?.trim()) {
                    return socket.emit("chat_error", { message: "Missing required fields" });
                }

                const time = new Date().toTimeString().slice(0, 8);

                const result = await db.executeQuery(
                    `INSERT INTO TICKET_CHAT_MESSAGES
                         (TICKET_ID, SENDER_ID, SENDER_TYPE, MESSAGE_TEXT, CREATED_DATE, CREATED_TIME)
                     VALUES (:ticketId, :senderId, :senderType, :text, SYSDATE, :time)
                     RETURNING MESSAGE_ID INTO :messageId`,
                    {
                        ticketId, senderId, senderType, text, time,
                        messageId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    },
                    "siri_db"
                );

                const messageId = result.outBinds?.messageId?.[0];

                io.to(`ticket_${ticketId}`).emit("new_message", {
                    messageId, senderId, senderType, text, time,
                });
            } catch (err) {
                console.error("send_message error:", err);
                socket.emit("chat_error", { message: "Failed to send message" });
            }
        });

        // ── leave_ticket ──────────────────────────────────────────────────────
        socket.on("leave_ticket", ({ ticketId }) => {
            const room = `ticket_${ticketId}`;
            socket.leave(room);
            const { userId } = socketUserMap.get(socket.id) || {};
            if (userId) socket.to(room).emit("user_left", { userId });
            socketUserMap.delete(socket.id);
        });

        // ── disconnect ────────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            const { ticketId, userId } = socketUserMap.get(socket.id) || {};
            if (ticketId && userId) {
                socket.to(`ticket_${ticketId}`).emit("user_left", { userId });
            }
            socketUserMap.delete(socket.id);
        });
    });
};