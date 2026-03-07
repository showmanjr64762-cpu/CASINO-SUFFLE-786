function gameSocket(io) {

  io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);

    socket.on("joinGame", (data) => {
      io.emit("adminUpdate", {
        action: "join",
        player: data.name
      });
    });

    socket.on("spin", (data) => {
      io.emit("adminUpdate", {
        action: "spin",
        player: data.name,
        result: data.result
      });
    });

    socket.on("disconnect", () => {
      io.emit("adminUpdate", {
        action: "leave",
        playerId: socket.id
      });
    });

  });

}

module.exports = gameSocket;