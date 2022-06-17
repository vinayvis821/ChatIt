function sendChatToRoom() {
  const message = document.getElementById("chat-message-to-send").value;
  document.getElementById("chat-message-to-send").value = "";
  // /pm is 3 characters long
  // check if it's a private message, then only send to that user
  if (String(message).substring(0, 3) === "/pm") {
    let privateUser = "";
    let index = 4;
    let tempChar = String(message).charAt(index);
    while (
      tempChar !== '"' &&
      tempChar !== "'" &&
      index < String(message).length
    ) {
      privateUser += tempChar;
      tempChar = String(message).charAt(++index);
    }
    privateUser = privateUser.substring(0, privateUser.length - 1);
    let chatMessage = String(message).substring(
      index + 1,
      String(message).length - 1
    );
    if (
      String(message).charAt(String(message).length - 1) == '"' ||
      String(message).charAt(String(message).length - 1) == "'"
    ) {
      socketio.emit("send_new_direct_message", {
        user: privateUser,
        message: chatMessage,
      });
    } else {
      alert("Invalid pm syntax. Usage: /pm <User> '<message>'");
    }
    // Kick user code
  } else if (String(message).substring(0, 5) === "/kick") {
    let kickUser = "";
    let index = 6;
    let tempChar = String(message).charAt(index);
    while (index < String(message).length) {
      kickUser += tempChar;
      tempChar = String(message).charAt(++index);
    }
    socketio.emit("kick_user", { user: kickUser });
  } // ban user code
  else if (String(message).substring(0, 4) === "/ban") {
    let banUser = "";
    let index = 5;
    let tempChar = String(message).charAt(index);
    while (index < String(message).length) {
      banUser += tempChar;
      tempChar = String(message).charAt(++index);
    }
    socketio.emit("ban_user", { user: banUser });
  } else if (String(message).substring(0, 3) === "/mh") {
    let makeHostUser = "";
    let index = 4;
    let tempChar = String(message).charAt(index);
    while (index < String(message).length) {
      makeHostUser += tempChar;
      tempChar = String(message).charAt(++index);
    }
    socketio.emit("make_host_user", { user: makeHostUser });
  } else {
    socketio.emit("send_new_chat", { message: message });
  }
}

socketio.on("display_new_chat", function (data) {
  let user = data["username"];
  let chat = data["message"];
  let avatar = data["avatar"];
  let id = data["id"];

  displayChat(user, chat, avatar, id);
});

socketio.on("invalid_user_direct_message", function (data) {
  alert(
    "Invalid user entered. User does not exist or is not in the room. Please try again"
  );
});

socketio.on("display_direct_message", function (data) {
  // console.log("receiving direct message");
  // console.log(data);
  let userTo = data["userTo"];
  let userFrom = data["userFrom"];
  let chat = data["message"];
  let avatar = data["avatar"];

  let startP = document.createElement("p");
  startP.innerHTML = "Private message from: " + userFrom + " to: " + userTo;
  startP.setAttribute("class", "private");

  let chatWindow = document.getElementById("chats");
  chatWindow.appendChild(startP);

  displayChat(userFrom, chat, avatar);

  let endP = document.createElement("p");
  endP.innerHTML = "End of private message";
  endP.setAttribute("class", "private");

  chatWindow.appendChild(endP);
  let br = document.createElement("br");
  chatWindow.appendChild(br);
});

let chat_id = 0;
function displayChat(user, chat, avatar, id = null) {
  let chatWindow = document.getElementById("chats");
  let newChat = document.createElement("div");
  let chatMessageDiv = document.createElement("div");
  let imageDiv = document.createElement("div");
  newChat.setAttribute("class", "chat-message-create");
  newChat.setAttribute("id", "message" + chat_id);
  chat_id += 1;
  chatMessageDiv.setAttribute("class", "chat-message-div");
  imageDiv.setAttribute("class", "chat-message-image");

  let userBold = document.createElement("p");
  userBold.setAttribute("class", "bold-text");
  userBold.innerHTML = user + ": ";
  let chatMessage = document.createElement("p");
  chatMessage.setAttribute("class", "chat-message");
  chatMessage.innerHTML = chat;
  let avatarIcon = document.createElement("img");
  let path = "./resources/avatars/" + avatar + ".png";
  avatarIcon.setAttribute("src", path);
  avatarIcon.setAttribute("alt", "avatar icon");

  //Create empty div for reactions
  let reaction_div = document.createElement("div");
  reaction_div.setAttribute("class", "chat-reactions-div");

  chatMessageDiv.appendChild(reaction_div);
  chatMessageDiv.appendChild(userBold);
  chatMessageDiv.appendChild(chatMessage);
  imageDiv.appendChild(avatarIcon);

  newChat.appendChild(imageDiv);
  newChat.appendChild(chatMessageDiv);

  newChat.addEventListener(
    "click",
    (e) => {
      showReactions(e);
    },
    false
  );

  chatWindow.appendChild(newChat);
}

//global variable for determing which message to put the reaction under
let lastClickedMessage = null;
function showReactions(event) {
  lastClickedMessage = event.currentTarget;
  let reaction_modal = document.getElementById("reactions-parent");
  reaction_modal.style.display = "block";
}

function addReaction(reaction_img, reaction_num) {
  lastClickedMessage.appendChild(reaction_img);
  socketio.emit("new_reaction", {
    reaction_num: reaction_num,
    message_id: lastClickedMessage.id,
  });
}

function init_reactions() {
  let reaction_modal = document.getElementById("reactions-parent");
  let reactions_cont = document.getElementById("reactions-container");
  let children = reactions_cont.children;
  for (let i = 0; i < children.length; ++i) {
    children[i].addEventListener(
      "click",
      () => {
        if (i != 4) {
          let reaction_img = document.createElement("img");
          reaction_img.src = "/resources/reactions/reaction" + i + ".png";
          reaction_img.setAttribute("class", "chat-reaction-icon");
          reaction_modal.style.display = "none";
          addReaction(reaction_img, i);
        } else if (i == 4) {
          //i == 4 is close button
          reaction_modal.style.display = "none";
        }
      },
      false
    );
  }
}

//when another user sends a reaction
socketio.on("user_reaction", function (data) {
  let message_id = data["message_id"];
  let reaction_num = data["reaction_num"];
  try {
    let msg = document.getElementById(message_id);
    let reaction_img = document.createElement("img");
    reaction_img.src = "/resources/reactions/reaction" + reaction_num + ".png";
    reaction_img.setAttribute("class", "chat-reaction-icon");
    msg.appendChild(reaction_img);
  } catch (error) {}
});
