# NES Tetris — Friends

A lightweight NES-inspired Tetris game that works for solo play, multiplayer rooms on one computer or a LAN, and deployment to any Node host.

## Run it

```powershell
npm install
npm start
```

Open `http://localhost:3000`. On the same Wi-Fi, share `http://YOUR-COMPUTER-IP:3000`; everyone enters the same room code to see each other's boards. The server listens on all network interfaces.

## Controls

Arrow keys move/soft-drop, `Up` or `X` rotates, and `Space` hard-drops. Use **Start / Restart** to start a new game.

## Share online

Deploy this repository as a normal Node web service (the host runs `npm start` and supplies `PORT`). The client and real-time room server are intentionally in one application, so no separate backend URL needs configuring.

This project uses original browser code and does not include Nintendo assets or ROMs.
