// import { Server as IOServer } from "socket.io";
// import { Server as HttpServer } from "http";
// import jwt from "jsonwebtoken";

// let io: IOServer;

// export const initiateSocket = async (server: HttpServer) => {
//   io = new IOServer(server, {
//     cors: {
//       origin: (origin, callback) => {
//         callback(null, origin || "*");
//       },
//       methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     },
//   });

//   io.use((socket, next) => {
//     const token = socket.handshake.auth.token;
//     if (!token) return next(new Error("Unauthorized: No token provided"));

//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
//       socket.data.user = decoded;
//       next();
//     } catch (err) {
//       return next(new Error("Unauthorized: Invalid token"));
//     }
//   });

//   io.on("connection", (socket) => {
//     const user = socket.data.user;
//     console.log(`User connected (${socket.id}): ${user.email || user.id}`);

//     socket.join(`user_${user.email}`);

//     // socket.on("join_event", (eventSlug: string) => {
//     //   socket.join(`event_${eventSlug}`);
//     //   console.log(
//     //     `User ${user.email || user.id} joined room: event_${eventSlug}`
//     //   );
//     // });

//     // socket.on("join_request", (eventSlug: string) => {
//     //   socket.join(`request_${eventSlug}`);
//     //   console.log(
//     //     `User ${user.email || user.id} joined room: event_${eventSlug}`
//     //   );
//     // });

//     // socket.on("join_admin", () => {
//     //   if (user.role === "ADMIN") {
//     //     socket.join("admin");
//     //   }
//     // });

//     socket.on("disconnect", () => {
//       console.log(`User disconnected: ${user.email || socket.id}`);
//     });
//   });
// };

// export const getIO = (): IOServer => {
//   if (!io) throw new Error("Web Socket not initialized!");
//   return io;
// };
