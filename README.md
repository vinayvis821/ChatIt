# CSE330

### Ethan Meitz

- Id: 455321
- Github: ejmeitz

### Vinay Viswanathan

- Id: 486208
- Github: vinayvis821

## About the site

- General note: You are not allowed to use a username that is currently in use by someone on the site. The same goes applies to chatroom names.
- If you wish to log out, hit refresh or exit out of the page.

## Creative Portion:

For our creative portion we allow users to also select a profile picture with their username. This option is presented at the login page and displays next to the user's name while chatting. If the user does not select a profile picture, one is chosen by default for them.

We also allow users to react to chat messages. To react to a message simply click on the chat you want to reach to. A modal window will appear prompting you to select a reaction. Once you choose a reaction your reaction will be added to other user's reactions below the message.

Lastly, we allow creators of the room to make other users in the room be a host. The user has to be a valid user and must currently be in the room to receive host.

## Using the Site:

First install the node packages from the package.json and run the start server on port 3456. In the URL request index.html e.g.. https://amazonaws.ip-address:3456/index.html

The initial page should give you a form to put a username and offer a selection of avatars. Click the login button to enable chat functionality. You will be presented with three columns.

- The left most column contains all of the active chatrooms and the ability to create new chatrooms. If a chatroom ends with a \* then it requires a password. To create a room with no password simply leave that field blank. Click on a room name to join the room.
- The middle column contains the actual chatroom. If no chatroom is joined nothing will display. In this column you can send messages to all in the chat room. You an see private messages, host notifications, and other people's messages.
- The right column shows the users currently in your room. If you are not in a room is shows all of the people in the "lobby". Once you are in a chatroom, you can click on a users name to private message them.

When in a chatroom the host can kick and ban people in the same room as you by typing commands in the chat:

- Type /kick <username> to kick the user from the room.
- Type /ban <username> to permanantly ban the user from the room.

Sending private messages:

- Once you are in a chatroom, you can click on a users name to private message them. Enter your message in quotation marks and hit send. The message will then only send to the user who the private message is sent to.
- The command for sending a private message is /pm <userToSendTo> 'message'. Private messaging only works if you enter a valid username to send to, and if the user is currently in the same room as you.

Giving host privileges:

- A creator of the room can grant host privileges (kick and ban) to other users in the room.
- Type /mh <username> and the person will be granted host privileges and can now kick and users as they please.
