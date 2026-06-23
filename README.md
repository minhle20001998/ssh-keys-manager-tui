# ssh-tui

SSH Keys Manager TUI — list, generate, rename, delete, and switch SSH keys right from your terminal.

Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI).

## Install

```bash
npm install -g ssh-keys-manager-tui
```

Then run:

```bash
sshtui
```

Or without installing globally:

```bash
npx ssh-keys-manager-tui
```

## Usage

`sshtui` scans `~/.ssh/` for existing key pairs, shows them in a list, and lets you manage them interactively.

### Key bindings

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate key list |
| `Enter` | Activate selected key (load into `ssh-agent`) |
| `g` | Generate new SSH key pair |
| `d` | Delete selected key |
| `r` | Rename selected key |
| `i` | Show key details (fingerprint, comment, type) |
| `q` / `Ctrl+C` | Quit |

### Generate a key

1. Press `g` to start
2. Enter a name (e.g. `id_ed25519_github`)
3. Select key type (ED25519, RSA 4096, ECDSA, ED25519-SK)
4. Optionally enter an email/comment
5. Optionally set a passphrase
6. Confirm with `Y`

### Activate a key

Select a key and press `Enter`. The key is loaded into `ssh-agent` (any previously active keys are removed). Your Git operations will now use this key.

The last active key is remembered in `~/.ssh-tui/config.json` and is auto-loaded on next launch.

## Uninstall

```bash
npm uninstall -g ssh-keys-manager-tui
```

## Requirements

- Node.js 18+
- `ssh-agent` running (most desktop environments start it automatically)

## How it works

- Discovers key pairs by scanning `~/.ssh/*` for private keys with matching `.pub` files
- Uses `ssh-add` / `ssh-add -D` to manage keys in `ssh-agent`
- Uses `ssh-keygen` for key generation, fingerprint inspection, and parsing
- Persists last active key to `~/.ssh-tui/config.json`
