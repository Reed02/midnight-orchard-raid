# Midnight Orchard Raid — GitHub Pages version

This version removes the Claude-only room API and uses PeerJS/WebRTC for two-player browser multiplayer.

## Publish it with GitHub Pages

1. Sign in to GitHub and create a new repository named `midnight-orchard-raid`.
2. For the simplest free setup, make the repository **Public**. The game itself is client-side, and this file contains no passwords or API keys.
3. On the new repository page, choose **Add file → Upload files**.
4. Upload `index.html` from this folder and `README.md`, then commit the files to the `main` branch.
5. Open the repository's **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select branch `main` and folder `/(root)`, then click **Save**.
8. Wait a minute or two. GitHub will show the published URL in the Pages section, usually `https://YOUR-USERNAME.github.io/midnight-orchard-raid/`.
9. Open that URL in your browser. Click **Multiplayer → Host as raccoon** or **Host as farmer**.
10. Send your friend the same website URL. They click **Multiplayer**, enter the four-letter room code, and click **Join**. Once connected, the host clicks **Start raid**.

## Important notes

- Both players need an internet connection and a modern browser. The page loads PeerJS from a public CDN.
- GitHub Pages only hosts the game files. PeerJS's public signaling service helps browsers establish a direct WebRTC connection; game messages are sent over that connection.
- This is a prototype using public infrastructure, not a private or guaranteed-uptime multiplayer service. A firewall or network that blocks WebRTC may prevent a connection.
- The host's browser runs the simulation. If the host closes the page or disconnects, the game ends for both players.
- If you update `index.html`, commit the updated file to GitHub and wait for Pages to redeploy.

## Local testing

Opening `index.html` locally can test single-player gameplay, but multiplayer is intended to be tested from the published HTTPS GitHub Pages URL.
