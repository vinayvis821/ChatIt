// http://ec2-54-86-95-204.compute-1.amazonaws.com:3456/index.html
class Chatroom {
  constructor(room_name, room_id, password, owner) {
    this.room_name = room_name;
    this.rood_id = room_id;
    this.password = password;
    this.owner = owner;
  }
}

class User {
  constructor(name, avatar_id, socket_id) {
    this.name = name;
    this.avatar_id = avatar_id;
    this.socket_id = socket_id;
    this.current_room = null;
    this.owner_of = [];
    this.banned_from = [];
  }

  addOwnership(room_id) {
    this.owner_of.push(room_id);
  }

  removeOwnership(room_id) {
    const idx = this.owner_of.indexOf(room_id);
    if (idx != -1) {
      this.owner_of.splice(idx, 1);
    }
  }
}

// Require the packages we will use:
const http = require("http");
const url = require("url");
const path = require("path");
const mime = require("mime");
const fs = require("fs");

const port = 3456;
const file = "index.html";

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, resp) {
  // This callback runs when a new connection is made to our HTTP server.
  let filename = path.join(
    __dirname,
    "",
    url.parse(req.url).pathname
  );
  (fs.exists || path.exists)(filename, function (exists) {
    if (exists) {
      fs.readFile(filename, function (err, data) {
        if (err) {
          // File exists but is not readable (permissions issue?)
          resp.writeHead(500, {
            "Content-Type": "text/plain",
          });
          resp.write("Internal server error: could not read file");
          resp.end();
          return;
        }

        // File exists and is readable
        var mimetype = mime.getType(filename);
        resp.writeHead(200, {
          "Content-Type": mimetype,
        });
        resp.write(data);
        resp.end();
        return;
      });
    } else {
      // File does not exist
      resp.writeHead(404, {
        "Content-Type": "text/plain",
      });
      resp.write("ERROR 404 Requested file not found: " + filename);
      resp.end();
      return;
    }
  });
});
server.listen(port);

// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
  wsEngine: "ws",
});

//List of active username strings
let active_usernames = [];
//List of active user objects
// let active_users = [];
let active_users = {};
//List of active chatroom names
let active_chatroom_names = [];
//List of active chatroom objects
let active_chatrooms = [];

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
  // This callback runs when a new Socket.IO connection is established.

  //Send all chatrooms to current connection
  io.to(socket.id).emit("active_chatrooms", { chatrooms: active_chatrooms });
  //Send all active users
  let users = [];
  for (key in active_users) {
    if (active_users[key].current_room == null) {
      users.push(active_users[key].name);
    }
  }
  io.to(socket.id).emit("active_users", { users: users });

  //Handles log-in event
  socket.on("login_info_to_server", function (data) {
    if (active_usernames.includes(data["username"])) {
      //HOW DO YOU MAKE THIS ONLY SEND TO THE CLIENT THAT REQUESTED IT
      io.to(socket.id).emit("login_response", { success: false });
    } else {
      active_usernames.push(data["username"]);

      let new_user = new User(data["username"], data["avatar"], socket.id);
      active_users[socket.id] = new_user;
      io.sockets.emit("login_response", {
        username: data["username"],
        avatar_id: data["avatar"],
        success: true,
      });
      io.to(socket.id).emit("toggle_display", {});
    }
  });

  socket.on("create_new_chatroom", function (data) {
    if (active_chatroom_names.includes(data["chatroom_name"])) {
      //HOW DO YOU MAKE THIS ONLY SEND TO THE CLIENT THAT REQUESTED IT
      io.to(socket.id).emit("chatroom_create_fail", {
        success: false,
        message: "Chatroom already exists",
      });
    } else {
      let tempPass = data["password"] == null ? "" : data["password"];
      active_chatroom_names.push(data["chatroom_name"]);
      let id = "room" + (active_chatrooms.length + 1);
      let new_chatroom = new Chatroom(
        data["chatroom_name"],
        id,
        tempPass,
        socket.id
      );
      active_chatrooms.push(new_chatroom);
      for (let key in active_users) {
        if (socket.id == key) {
          active_users[key].addOwnership(data["chatroom_name"]);
        }
      }
      io.sockets.emit("new_chatroom", {
        name: data["chatroom_name"],
        id: id,
        password: tempPass,
      });
    }
  });

  socket.on("new_reaction", function (data) {
    socket.broadcast.emit("user_reaction", {
      reaction_num: data["reaction_num"],
      message_id: data["message_id"],
    });
  });

  //Treat disconnect as log-out
  socket.on("disconnect", function () {
    let id = -1;
    for (let key in active_users) {
      if (socket.id == key) {
        console.log("User: " + active_users[key].name + " disconnected");
        id = key;
        break;
      }
    }

    if (id != -1) {
      //remove user from active user lists
      active_usernames = active_usernames.filter(function (value, index, arr) {
        return value != active_users[id].name;
      });
      delete active_users[id];

      //remove all chat rooms this user owned
      for (let j = 0; j < active_chatrooms.length; ++j) {
        if (active_chatrooms[j].owner == id) {
          active_chatroom_names = active_chatroom_names.filter(function (
            value,
            index,
            arr
          ) {
            return value != active_chatrooms[j].room_name;
          });
          active_chatrooms.splice(j, 1);
          break;
        }
      }
      //notify other users that this person has left
      socket.broadcast.emit("user_disconnect", {
        usernames: active_usernames,
        chatrooms: active_chatrooms,
      });
    }
  });

  // Sending a direct message. If user is invalid, alert is sent back
  socket.on("send_new_direct_message", function (data) {
    let chat = data["message"];
    let user = data["user"];
    let userSocketId = null;
    let userFrom = null;
    let currentRoom = null;
    let avatar = null;
    for (let key in active_users) {
      if (active_users[key].socket_id == socket.id) {
        currentRoom = active_users[key].current_room;
        userFrom = active_users[key].name;
        avatar = active_users[key].avatar_id;
      }
    }
    for (let key in active_users) {
      if (active_users[key].current_room == currentRoom) {
        if (active_users[key].name == user) {
          userSocketId = active_users[key].socket_id;
        }
      }
    }
    if (userSocketId == null) {
      io.to(socket.id).emit("invalid_user_direct_message", {});
    } else {
      io.to(userSocketId).emit("display_direct_message", {
        userFrom: userFrom,
        userTo: user,
        message: chat,
        avatar: avatar,
      });
      io.to(socket.id).emit("display_direct_message", {
        userFrom: userFrom,
        userTo: user,
        message: chat,
        avatar: avatar,
      });
    }
    console.log(data);
  });

  // Sending a new chat to the chat room
  socket.on("send_new_chat", function (data) {
    let chat = data["message"];

    let username = null;
    let avatar = null;
    for (let key in active_users) {
      if (socket.id == key) {
        username = active_users[key].name;
        avatar = active_users[key].avatar_id;
      }
    }
    let room = null;
    for (let key in active_users) {
      if (active_users[key].socket_id == socket.id) {
        room = active_users[key].current_room;
      }
    }

    //Send message to users in room
    for (let key in active_users) {
      user_current_room = active_users[key].current_room;
      if (user_current_room == room) {
        io.to(active_users[key].socket_id).emit("display_new_chat", {
          message: chat,
          username: username,
          avatar: avatar,
        });
      }
    }
  });

  socket.on("join_chat_room", function (data) {
    let roomName = data["name"];
    let listUsers = [];
    let listLobby = [];

    //check if user is banned from room
    if (active_users[socket.id].banned_from.includes(roomName)) {
      io.to(socket.id).emit("banned_from_room", { name: roomName });
    } else {
      for (let key in active_users) {
        //update user room
        if (active_users[key].socket_id == socket.id) {
          active_users[key].current_room = roomName;
        }
      }
      for (let key in active_users) {
        if (active_users[key].current_room == roomName) {
          listUsers.push(active_users[key].name);
        }
        if (active_users[key].current_room == null) {
          listLobby.push(active_users[key].name);
        }
      }

      for (let key in active_users) {
        if (active_users[key].current_room == roomName) {
          io.to(active_users[key].socket_id).emit("get_users_in_room", {
            list: listUsers,
          });
        }
        if (active_users[key].current_room == null) {
          io.to(active_users[key].socket_id).emit("get_users_in_lobby", {
            list: listLobby,
          });
        }
      }
    }
  });

  // send room and it's password
  socket.on("get_chat_room", function (data) {
    let roomName = String(data["name"]);
    for (let i = 0; i < active_chatrooms.length; i++) {
      if (active_chatrooms[i].room_name == roomName) {
        let pass = active_chatrooms[i].password;
        io.to(socket.id).emit("receive_chat_room", {
          password: pass,
          guess: data["guess"],
          name: active_chatrooms[i].room_name,
        });
      }
    }
  });

  socket.on("leave_chat_room", function (data) {
    let listUsers = [];
    let room = null;
    for (let key in active_users) {
      if (active_users[key].socket_id == socket.id) {
        room = active_users[key].current_room;
        active_users[key].current_room = null;
      }
      if (active_users[key].current_room == null) {
        listUsers.push(active_users[key].name);
      }
    }
    let roomUsers = [];
    for (let key in active_users) {
      if (active_users[key].current_room == room) {
        roomUsers.push(active_users[key].name);
      }
    }
    for (let key in active_users) {
      if (active_users[key].current_room == null) {
        io.to(active_users[key].socket_id).emit("get_users_in_lobby", {
          list: listUsers,
        });
      }
      if (active_users[key].current_room == room) {
        io.to(active_users[key].socket_id).emit("get_users_in_room", {
          list: roomUsers,
        });
      }
    }
  });

  socket.on("kick_user", function (data) {
    let user = data["user"];
    let hostName = active_users[socket.id].name;
    let currentRoom = active_users[socket.id].current_room;

    let host = false;
    let ownerListTemp = active_users[socket.id].owner_of;
    for (let i = 0; i < ownerListTemp.length; i++) {
      if (ownerListTemp[i] == currentRoom) {
        host = true;
      }
    }
    if (host) {
      let tempUser = null;
      for (let key in active_users) {
        if (active_users[key].name == user) {
          tempUser = active_users[key];
        }
      }
      if (tempUser != null) {
        if (tempUser.current_room == currentRoom) {
          io.to(tempUser.socket_id).emit("kicked_from_room", {
            name: currentRoom,
          });
          for (let key in active_users) {
            if (active_users[key].current_room == currentRoom) {
              io.to(active_users[key].socket_id).emit("user_kicked_from_room", {
                user: user,
              });
            }
          }
        } else {
          io.to(socket.id).emit("invalid_user", {});
        }
      } else {
        io.to(socket.id).emit("invalid_user", {});
      }
    } else {
      io.to(socket.id).emit("not_host_in_room", {});
    }
  });

  socket.on("ban_user", function (data) {
    let user = data["user"];
    let hostName = active_users[socket.id].name;
    let currentRoom = active_users[socket.id].current_room;

    let host = false;
    let ownerListTemp = active_users[socket.id].owner_of;
    for (let i = 0; i < ownerListTemp.length; i++) {
      if (ownerListTemp[i] == currentRoom) {
        host = true;
      }
    }
    if (host) {
      let tempUser = null;
      for (let key in active_users) {
        if (active_users[key].name == user) {
          tempUser = active_users[key];
        }
      }
      if (tempUser != null) {
        if (tempUser.current_room == currentRoom) {
          io.to(tempUser.socket_id).emit("banned_from_room", {
            name: currentRoom,
          });
          tempUser.banned_from.push(currentRoom);
          for (let key in active_users) {
            if (active_users[key].current_room == currentRoom) {
              io.to(active_users[key].socket_id).emit("user_banned_from_room", {
                user: user,
              });
            }
          }
        } else {
          io.to(socket.id).emit("invalid_user", {});
        }
      } else {
        io.to(socket.id).emit("invalid_user", {});
      }
    } else {
      io.to(socket.id).emit("not_host_in_room", {});
    }
  });

  socket.on("make_host_user", function (data) {
    let user = data["user"];
    let hostName = active_users[socket.id].name;
    let currentRoom = active_users[socket.id].current_room;

    let host = false;
    let ownerListTemp = active_users[socket.id].owner_of;
    for (let i = 0; i < ownerListTemp.length; i++) {
      if (ownerListTemp[i] == currentRoom) {
        host = true;
      }
    }
    if (host) {
      let tempUser = null;
      for (let key in active_users) {
        if (active_users[key].name == user) {
          tempUser = active_users[key];
        }
      }
      if (tempUser != null) {
        if (tempUser.current_room == currentRoom) {
          tempUser.owner_of.push(currentRoom);
          io.to(tempUser.socket_id).emit("added_as_host", {
            name: currentRoom,
          });
          tempUser.banned_from.push(currentRoom);
          for (let key in active_users) {
            if (active_users[key].current_room == currentRoom) {
              io.to(active_users[key].socket_id).emit("user_added_as_host", {
                user: user,
              });
            }
          }
        } else {
          io.to(socket.id).emit("invalid_user", {});
        }
      } else {
        io.to(socket.id).emit("invalid_user", {});
      }
    } else {
      io.to(socket.id).emit("not_host_in_room", {});
    }
  });
});
