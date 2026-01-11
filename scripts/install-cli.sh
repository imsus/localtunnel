#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

echo "Building localtunnel CLI tools..."

# Build client and server binaries
echo "Building client..."
bun run compile --filter localtunnel-client

echo "Building server..."
bun run compile --filter localtunnel-server

# Register and link binaries
echo "Linking client..."
(cd packages/client && bun link)

echo "Linking server..."
(cd packages/server && bun link)

echo ""
echo "✅ localtunnel installed successfully!"
echo ""
echo "To use the CLI tools, add bun bin to your PATH:"
echo ""
echo '  # Add to ~/.zshrc or ~/.bashrc'
echo '  export PATH="$HOME/.bun/bin:$PATH"'
echo ""
echo "Then source your shell or restart terminal:"
echo "  source ~/.zshrc  # or ~/.bashrc"
echo ""
echo "Verify installation:"
echo "  lt --help"
echo "  localtunnel-server --help"
echo ""
echo "To unlink later:"
echo "  (cd packages/client && bun unlink)"
echo "  (cd packages/server && bun unlink)"
