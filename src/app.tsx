import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState, useEffect, useRef } from "react";
import KeyList from "./components/key-list.js";
import KeyDetail from "./components/key-detail.js";
import KeyForm from "./components/key-form.js";
import StatusBar from "./components/status-bar.js";
import * as ssh from "./lib/ssh.js";
import * as cfg from "./lib/config.js";
import type { SshKey, StatusMessage } from "./types.js";

type View = "list" | "detail" | "form" | "confirm-delete" | "rename-input";

export default function App() {
  const [view, setView] = useState<View>("list");
  const [keys, setKeys] = useState<SshKey[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeKeyName, setActiveKeyName] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<StatusMessage | undefined>();
  const [renameValue, setRenameValue] = useState("");

  const statusTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      const [config, discovered] = await Promise.all([
        cfg.readConfig(),
        ssh.listKeys(),
      ]);

      setKeys(discovered);

      const activePaths = await ssh.listAgentKeyPaths().catch(() => [] as string[]);
      const activeKey = discovered.find((k) =>
        activePaths.includes(k.privatePath),
      );

      if (activeKey) {
        setActiveKeyName(activeKey.name);
      } else if (config.lastActiveKey) {
        const lastKey = discovered.find(
          (k) => k.name === config.lastActiveKey,
        );
        if (lastKey) {
          try {
            await ssh.addKeyToAgent(lastKey.privatePath);
            setActiveKeyName(lastKey.name);
            showStatus(`Loaded key ${lastKey.name}`, "success");
          } catch {
            // passphrase needed or key missing
          }
        }
      }
    } catch (err) {
      showStatus(`Init error: ${err}`, "error");
    }
  }

  function showStatus(text: string, type: StatusMessage["type"]) {
    setStatusMessage(text ? { text, type } : undefined);
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    if (text) {
      statusTimeout.current = setTimeout(() => {
        setStatusMessage(undefined);
      }, 3000);
    }
  }

  async function refreshKeys() {
    const discovered = await ssh.listKeys();
    setKeys(discovered);
    setSelectedIndex((i) => Math.min(i, Math.max(0, discovered.length - 1)));
    return discovered;
  }

  async function handleActivate() {
    const key = keys[selectedIndex];
    if (!key) return;

    if (!(await ssh.isAgentRunning())) {
      showStatus("No ssh-agent running. Start it with `eval $(ssh-agent)`", "error");
      return;
    }

    try {
      await ssh.removeAllKeysFromAgent().catch(() => {});
      await ssh.addKeyToAgent(key.privatePath);
      setActiveKeyName(key.name);
      setKeys((prev) =>
        prev.map((k) => ({
          ...k,
          isActive: k.name === key.name,
        })),
      );
      await cfg.writeConfig({ lastActiveKey: key.name });
      showStatus(`Activated ${key.name}`, "success");
    } catch (err) {
      showStatus(`Failed: ${err}`, "error");
    }
  }

  async function handleGenerate(
    name: string,
    type: string,
    passphrase?: string,
    comment?: string,
  ) {
    try {
      await ssh.generateKey(name, type, passphrase, comment);
      await refreshKeys();
      setView("list");
      showStatus(`Key "${name}" generated`, "success");
    } catch (err) {
      showStatus(`Failed to generate: ${err}`, "error");
    }
  }

  async function handleDelete() {
    const key = keys[selectedIndex];
    if (!key) return;

    try {
      if (key.isActive) {
        await ssh.removeKeyFromAgent(key.privatePath).catch(() => {});
      }
      await ssh.deleteKey(key);
      await refreshKeys();
      setView("list");
      if (key.name === activeKeyName) {
        setActiveKeyName(undefined);
        await cfg.writeConfig({});
      }
      showStatus(`Deleted ${key.name}`, "success");
    } catch (err) {
      showStatus(`Failed to delete: ${err}`, "error");
      setView("list");
    }
  }

  async function handleRename(newName: string) {
    const key = keys[selectedIndex];
    const cleanName = newName.trim().replace(/\.pub$/i, "");
    if (!key || !cleanName || cleanName === key.name) {
      setView("list");
      return;
    }

    try {
      await ssh.renameKey(key, cleanName);
      await refreshKeys();
      if (key.name === activeKeyName) {
        setActiveKeyName(cleanName);
        await cfg.writeConfig({ lastActiveKey: cleanName });
      }
      setView("list");
      showStatus(`Renamed to ${cleanName}`, "success");
    } catch (err) {
      showStatus(`Failed to rename: ${err}`, "error");
      setView("list");
    }
  }

  useInput((input, key) => {
    switch (view) {
      case "list": {
        if (key.upArrow) {
          setSelectedIndex((i) => Math.max(0, i - 1));
        } else if (key.downArrow) {
          setSelectedIndex((i) => Math.min(keys.length - 1, i + 1));
        } else if (key.return) {
          handleActivate();
        } else if (input === "g") {
          setView("form");
        } else if (input === "d" && keys.length > 0) {
          setView("confirm-delete");
        } else if (input === "r" && keys.length > 0) {
          setRenameValue(keys[selectedIndex]!.name);
          setView("rename-input");
        } else if (input === "i" && keys.length > 0) {
          setView("detail");
        } else if (input === "q") {
          process.exit(0);
        }
        break;
      }
      case "confirm-delete": {
        if (input === "y" || input === "Y") {
          handleDelete();
        } else {
          setView("list");
        }
        break;
      }
      case "rename-input": {
        if (key.escape) {
          setView("list");
        }
        break;
      }
      case "detail": {
        setView("list");
        break;
      }
    }
  });

  function renderBody() {
    switch (view) {
      case "detail": {
        const key = keys[selectedIndex];
        if (!key) return null;
        return (
          <KeyDetail key={key.name} sshKey={key} onBack={() => setView("list")} />
        );
      }
      case "form":
        return (
          <KeyForm
            onGenerate={handleGenerate}
            onCancel={() => setView("list")}
            error={
              statusMessage?.type === "error" ? statusMessage.text : undefined
            }
          />
        );
      case "confirm-delete": {
        const key = keys[selectedIndex];
        return (
          <Box flexDirection="column" paddingX={2} paddingY={1}>
            <Box marginBottom={1}>
              <Text bold color="red">
                Delete SSH Key
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text>Are you sure you want to delete </Text>
              <Text bold>{key?.name}</Text>
              <Text>?</Text>
            </Box>
            <Box>
              <Text dimColor>Press Y to confirm, any other key to cancel</Text>
            </Box>
          </Box>
        );
      }
      case "rename-input":
        return (
          <Box flexDirection="column" paddingX={2} paddingY={1}>
            <Box marginBottom={1}>
              <Text bold>Rename Key</Text>
            </Box>
            <Box>
              <Box width={14}>
                <Text bold>New name:</Text>
              </Box>
              <Box flexGrow={1}>
                <TextInput
                  value={renameValue}
                  onChange={setRenameValue}
                  onSubmit={handleRename}
                />
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Press Enter to confirm, Escape to cancel</Text>
            </Box>
          </Box>
        );
      case "list":
      default:
        return (
          <KeyList
            keys={keys}
            selectedIndex={selectedIndex}
            activeKeyName={activeKeyName}
          />
        );
    }
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} flexDirection="column">
        <Box marginBottom={1} paddingX={1}>
          <Text bold>
            SSH Key Manager
          </Text>
        </Box>
        {renderBody()}
      </Box>
      <StatusBar
        activeKeyName={activeKeyName}
        statusMessage={statusMessage}
      />
    </Box>
  );
}
