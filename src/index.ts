import http from "http";
import app from "./app";
import { initiateSocket } from "./config/socket";

const port = process.env.PORT || 3000;

const server = http.createServer(app);
initiateSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port} [${process.env.NODE_ENV}]`);
});
