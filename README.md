# NES Tetris — Friends

A lightweight NES-inspired Tetris game that works for solo play, multiplayer rooms on one computer or a LAN, and deployment to any Node host.

## Run it

```powershell
npm install
npm start
```

Open `http://localhost:3000`. On the same Wi-Fi, share `http://YOUR-COMPUTER-IP:3000`; everyone enters the same room code to see each other's boards. The server listens on all network interfaces.

## Controls

Arrow keys move and soft-drop, `X` rotates clockwise, and `Z` rotates counterclockwise. Use **Start / Restart** to start a new game. Controls can be rebound in Settings.

The engine follows NTSC NES timing: 60.0988 Hz simulation, 16-frame DAS with six-frame repeats, the NES gravity curve, Nintendo rotation without wall kicks, immediate locking on a blocked downward step, height-dependent entry delay, line-clear delay, and classic scoring. NES Tetris has no hold or hard drop.

## Put it online

The app needs a **Node web service** because multiplayer rooms use Socket.IO; GitHub Pages cannot run that server.

1. Sign in to [Render](https://render.com/) and choose **New → Blueprint**.
2. Connect the `JulianAttemptsCoding/tetris-online` repository and approve the `render.yaml` blueprint.
3. Render will build and publish it. Its generated `https://...onrender.com` address is immediately shareable and supports multiplayer.
4. For your own `.io` address, buy a domain such as `your-name-tetris.io` from a registrar, then add it under the Render service's **Custom Domains** screen. Render shows the exact DNS record to add at the registrar.

`Dockerfile` and `Procfile` are included as alternatives for Railway, Fly.io, or other Node/Docker hosts. The client and room server are intentionally one application, so no separate backend URL needs configuring.

This project uses original browser code and does not include Nintendo assets or ROMs.
