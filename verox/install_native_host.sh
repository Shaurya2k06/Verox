#!/bin/bash

# Create the native messaging host directory for Chrome on macOS
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/

# Copy the manifest to the correct location
cp native_host_manifest.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.verox.native_host.json

echo "Native messaging host installed for Chrome"
echo "Extension ID will be generated when you load the extension in Chrome"
echo ""
echo "To load the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable Developer Mode"
echo "3. Click 'Load unpacked' and select: $(pwd)/verox-extension/dist"
echo "4. Copy the generated extension ID"
echo "5. Update native_host_manifest.json with the real extension ID"
echo "6. Run this script again to update the manifest"
