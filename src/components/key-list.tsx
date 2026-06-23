import { Box, Text } from "ink";
import type { SshKey } from "../types.js";

interface KeyListProps {
  keys: SshKey[];
  selectedIndex: number;
  activeKeyName?: string;
}

export default function KeyList({ keys, selectedIndex, activeKeyName }: KeyListProps) {
  if (keys.length === 0) {
    return (
      <Box paddingY={1} paddingX={2}>
        <Text dimColor>No SSH keys found in ~/.ssh/</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {keys.map((key, i) => {
        const isSelected = i === selectedIndex;
        const isActive = key.name === activeKeyName;

        let displayType = key.keyType || "unknown";
        if (key.bits) displayType = `${displayType} ${key.bits}`;

        const indicator = isActive ? "●" : "○";
        const comment = key.comment ? key.comment.slice(0, 30) : "";
        const fingerprint = key.fingerprint ? key.fingerprint.slice(0, 12) : "";

        return (
          <Box key={key.name} height={1}>
            <Box width={3}>
              <Text color={isActive ? "green" : "dim"}>{indicator}</Text>
            </Box>

            <Box width={2}>
              {isSelected ? <Text color="cyan">{">"}</Text> : <Text> </Text>}
            </Box>

            <Box width={25}>
              <Text
                bold={isActive || isSelected}
                color={isActive ? "green" : isSelected ? "cyan" : undefined}
              >
                {key.name.length > 24 ? key.name.slice(0, 21) + "..." : key.name}
              </Text>
            </Box>

            <Box width={14}>
              <Text dimColor>{displayType}</Text>
            </Box>

            <Box flexGrow={1}>
              <Text dimColor>
                {fingerprint}{comment ? ` — ${comment}` : ""}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
