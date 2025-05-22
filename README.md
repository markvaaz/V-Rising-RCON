# V Rising RCON

A modern, user-friendly RCON client for V Rising servers.

## Support & Donations

<a href='https://ko-fi.com/F2F21EWEM7' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' alt='Buy Me a Coffee at ko-fi.com' /></a>

---

## Features

- **Connect to V Rising servers** using RCON protocol
- **Send commands** directly to the server console
- **Command autocompletion** and suggestions
- **Command history navigation** (up/down arrows)
- **ANSI color output**: Server responses are rendered with color and formatting
- **Animated output** for better readability (can be toggled)
- **Secure communication**: Uses Electron's context isolation and preload scripts
- **Persistent command history** (stored locally)
- **Quick reconnect/disconnect** button
- **Custom client commands** (prefixed with `:`)
- **Responsive and clean UI**

### Client Commands

- `:animation <true|false>`: Enable/disable animation
- `:clear`: Clear the console
- `:exit`: Disconnect from the server

## How to Use

1. **Install dependencies**  
   ```
   npm install
   ```

2. **Build the project**  
   ```
   npm run build
   ```

3. **Start the app**  
   ```
   npm start
   ```

4. **Connect to your server**  
   - Enter your server's host, port, and RCON password.
   - Click "Connect".

5. **Send commands**  
   - Type a command and press Enter.
   - Use the up/down arrows to navigate command history.
   - Use Tab for autocompletion.


## Security

- The app uses Electron's [contextBridge](https://www.electronjs.org/docs/latest/api/context-bridge) and a strict [Content Security Policy](https://www.electronjs.org/docs/latest/tutorial/security) for improved security.
- No sensitive data is sent to third parties.

## License

AGPL-3.0

---

*This project is not affiliated with Stunlock Studios or the official V Rising team.*
