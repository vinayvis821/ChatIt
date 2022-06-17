function displayCreateRoom() {
  document.getElementById("create-chatroom-inputs").style.display = "block";
  document.getElementById("new-chatroom-btn").style.display = "none";
}

function createNewRoom() {
  document.getElementById("new-chatroom-btn").style.display = "block";
  document.getElementById("create-chatroom-inputs").style.display = "none";
  let name = document.getElementById("room-name").value;
  document.getElementById("room-name").value = "";
  let password = document.getElementById("room-password").value;
  document.getElementById("room-password").value = "";

  if (password == "") {
    password = null;
  }
  socketio.emit("create_new_chatroom", {
    chatroom_name: name,
    password: password,
  });
  document.getElementById("active-chatroom-status").innerHTML =
    "Active Chatrooms";
}

socketio.on("new_chatroom", function (data) {
  document.getElementById("active-chatroom-status").innerHTML =
    "Active Chatrooms";

  let roomList = document.getElementById("open-chatrooms-list");
  let newRoom = document.createElement("p");
  let roomName = data["name"];
  if (data["password"] !== "") {
    roomName += "*";
  }
  newRoom.innerHTML = roomName;
  newRoom.setAttribute("class", "chatroom-in-list");
  newRoom.setAttribute("id", data["id"]);
  roomList.appendChild(newRoom);

  newRoom.addEventListener("click", joinChatRoom, false);
});

socketio.on("chatroom_create_fail", function (data) {
  alert("Chatroom name already exists. Please use another name.");
});

function joinChatRoom(event) {
  let chats = document.getElementById("chats");
  while (chats.firstChild) {
    chats.removeChild(chats.firstChild);
  }

  let room = event.currentTarget;
  let roomName = String(room.innerHTML);
  let lastChar = roomName.charAt(roomName.length - 1);
  if (lastChar == "*") {
    let password = window.prompt("Please input room password", "");
    passwordValidation(roomName.substring(0, roomName.length - 1), password);
  } else {
    document.getElementById("chatroom-title").innerHTML = "Room: " + roomName;
    document.getElementById("chat-input-field").style.display = "block";
    document.getElementById("leave-room").style.display = "block";
    socketio.emit("join_chat_room", { name: roomName });
  }
}

function passwordValidation(roomName, password) {
  // console.log("roomName: " + roomName + " + " + password);
  socketio.emit("get_chat_room", { name: roomName, guess: password });
}

socketio.on("receive_chat_room", function (data) {
  let pass = data["password"];
  let guess = data["guess"];
  while (guess !== pass && guess !== null) {
    guess = window.prompt("Wrong password, please try again", "");
  }
  if (guess !== null) {
    document.getElementById("chatroom-title").innerHTML =
      "Room: " + data["name"];
    document.getElementById("chat-input-field").style.display = "block";
    document.getElementById("leave-room").style.display = "block";
    socketio.emit("join_chat_room", { name: data["name"] });
  }
});

socketio.on("get_users_in_room", function (data) {
  // console.log(data);
  listUsers = data["list"];
  // console.log("room users");
  // console.log(listUsers);
  //Delete old list
  document.getElementById("active-user-list").remove();
  //Create new list
  let ul = document.createElement("ul");
  ul.setAttribute("id", "active-user-list");
  for (let i = 0; i < listUsers.length; i++) {
    let li = document.createElement("li");
    li.setAttribute("id", listUsers[i]);
    li.setAttribute("class", "private-name");

    li.addEventListener(
      "click",
      (e) => {
        fillInPrivateMessage(listUsers[i]);
      },
      false
    );

    li.innerHTML = listUsers[i];
    ul.appendChild(li);
  }
  document.getElementById("list-user-ul-here").appendChild(ul);
});

function openHostBox(name) {
  document.getElementById("host-box").style.display = "block";
  document.getElementById("host-user-title").innerHTML = "User: " + name;
}

function closeHostBox() {
  document.getElementById("host-box").style.display = "none";
  document.getElementById("host-user-title").innerHTML = "User: ";
}

function kickUser() {
  // console.log("kick user");
  document.getElementById("host-box").style.display = "none";
  document.getElementById("host-user-title").innerHTML = "User: ";
}

function banUser() {
  // console.log("ban user");
  document.getElementById("host-box").style.display = "none";
  document.getElementById("host-user-title").innerHTML = "User: ";
}

function fillInPrivateMessage(name) {
  document.getElementById("chat-message-to-send").value = "/pm " + name + " ''";
}

function leaveChatRoom() {
  document.getElementById("send-chat-message").value = "";
  document.getElementById("chatroom-title").innerHTML =
    "Join a chatroom to chat!";
  document.getElementById("leave-room").style.display = "none";
  document.getElementById("chat-input-field").style.display = "none";
  let chats = document.getElementById("chats");
  while (chats.firstChild) {
    chats.removeChild(chats.firstChild);
  }
  socketio.emit("leave_chat_room", {});
}

socketio.on("get_users_in_lobby", function (data) {
  let listUsers = data["list"];
  //Delete old list
  document.getElementById("active-user-list").remove();
  //Create new list
  let ul = document.createElement("ul");
  ul.setAttribute("id", "active-user-list");
  for (let i = 0; i < listUsers.length; i++) {
    let li = document.createElement("li");
    li.setAttribute("id", listUsers[i]);
    li.innerHTML = listUsers[i];
    ul.appendChild(li);
  }
  document.getElementById("list-user-ul-here").appendChild(ul);
});

socketio.on("kicked_from_room", function (data) {
  leaveChatRoom();
  alert("You got kicked from room: " + data["name"] + "!");
});

socketio.on("user_kicked_from_room", function (data) {
  let user = data["user"];
  let p = document.createElement("p");
  p.innerHTML = "User: " + user + " was kicked from the room";
  p.setAttribute("class", "private");
  document.getElementById("chats").appendChild(p);
});

socketio.on("invalid_user", function (data) {
  alert("User is not in the room, or does not exist");
});

socketio.on("not_host_in_room", function (data) {
  alert("You are not the host in the room");
});

socketio.on("banned_from_room", function (data) {
  leaveChatRoom();
  alert("You got banned from room: " + data["name"] + "!");
});

socketio.on("user_banned_from_room", function (data) {
  let user = data["user"];
  let p = document.createElement("p");
  p.innerHTML = "User: " + user + " was banned from the room";
  p.setAttribute("class", "private");
  document.getElementById("chats").appendChild(p);
});

socketio.on("added_as_host", function (data) {
  alert("You were added as host to room: " + data["name"] + "!");
});

socketio.on("user_added_as_host", function (data) {
  let user = data["user"];
  let p = document.createElement("p");
  p.innerHTML = "User: " + user + " was added as host in this room";
  p.setAttribute("class", "private");
  document.getElementById("chats").appendChild(p);
});
