# Verox Wallet - Arc Browser Extension

A simple and secure cryptocurrency wallet extension for Arc browser with biometric authentication support.

## Features

- **Clean Interface**: Simple, modern design optimized for Arc browser
- **Biometric Authentication**: Touch ID support for secure access
- **Wallet Management**: View balance and wallet address
- **Quick Actions**: Send, receive, and biometric authentication buttons
- **Network Status**: Real-time connection status

## Installation for Arc Browser

1. Build the extension:
   ```bash
   cd verox-extension
   npm install
   npm run build
   ```

2. Load in Arc:
   - Open Arc browser
   - Go to `arc://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Visit `http://localhost:5173` to preview

4. Build for production:
   ```bash
   npm run build
   ```

## Features Included

### 🔒 Biometric Security
- Touch ID/Windows Hello integration via WebAuthn API
- Platform authenticator detection
- Secure credential storage

### 💰 Wallet Features
- Balance display (ETH and USD)
- Wallet address with copy functionality
- Network status indicator
- Clean transaction interface

### 🎨 Design
- Glassmorphism design with backdrop blur
- Gradient background
- Smooth animations and transitions
- Optimized for 320x480px popup

## Technical Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Icons**: Heroicons
- **Styling**: Custom CSS with glassmorphism effects
- **Authentication**: WebAuthn API for biometrics

## Architecture

```
verox-extension/
├── src/
│   ├── App.tsx           # Main extension popup
│   ├── extension.css     # Custom styling
│   └── main.tsx         # React entry point
├── public/
│   ├── background.js     # Extension background script
│   └── icons/           # Extension icons
├── dist/                # Built extension files
├── manifest.json        # Extension manifest v3
└── package.json         # Dependencies
```

## Extension Permissions

- `storage`: For storing wallet data and preferences
- `activeTab`: For interacting with current tab if needed
- Host permissions for Ethereum API calls

## Browser Compatibility

- ✅ Arc Browser (Chromium-based)
- ✅ Chrome
- ✅ Edge
- ✅ Brave
- ⚠️ Safari (limited WebAuthn support)

## Security Features

1. **No Private Key Storage**: Extension doesn't store sensitive keys
2. **Biometric Verification**: WebAuthn platform authenticators only
3. **Secure Communication**: HTTPS-only API calls
4. **Isolated Storage**: Chrome extension storage APIs

## Quick Start

The extension provides a simple interface with:

1. **Header**: Verox branding and status
2. **Balance Card**: Current ETH balance and USD equivalent
3. **Address Section**: Wallet address with copy button
4. **Action Grid**: Send, Receive, and Touch ID buttons
5. **Status Info**: Network and connection status

## Future Enhancements

- [ ] Real Etherscan API integration
- [ ] Transaction history
- [ ] Multiple wallet support
- [ ] DApp connection interface
- [ ] NFT display
- [ ] Swap functionality

---

Built with security and simplicity in mind for Arc browser users.
