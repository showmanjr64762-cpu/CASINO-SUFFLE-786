// sockets/gameSocket.js

function gameSocket(io) {
  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // Player joins game
    socket.on("joinGame", (data) => {
      try {
        if (!data || !data.name) return;

        io.emit("adminUpdate", {
          action: "join",
          player: data.name,
        });
      } catch (err) {
        console.error("joinGame error:", err);
      }
    });

    // Player spins
    socket.on("spin", (data) => {
      try {
        if (!data || !data.name || typeof data.result === "undefined") return;

        io.emit("adminUpdate", {
          action: "spin",
          player: data.name,
          result: data.result,
        });
      } catch (err) {
        console.error("spin error:", err);
      }
    });

    // Player disconnects
    socket.on("disconnect", () => {
      try {
        io.emit("adminUpdate", {
          action: "leave",
          playerId: socket.id,
        });
      } catch (err) {
        console.error("disconnect error:", err);
      }
    });
  });
}
// server.js
const gameSocket = require("./sockets/gameSocket");
gameSocket(io); // instead of defining io.on(...) inline

module.exports = gameSocket;