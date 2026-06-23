import { Box, Text } from "ink";
import type { StatusMessage } from "../types.js";

interface StatusBarProps {
  activeKeyName?: string;
  statusMessage?: StatusMessage;
}

export default function StatusBar({ activeKeyName, statusMessage }: StatusBarProps) {
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Box flexGrow={1}>
        <Text bold>Active key: </Text>
        {activeKeyName ? (
          <Text color="green">{activeKeyName}</Text>
        ) : (
          <Text dimColor>none</Text>
        )}
      </Box>

      <Box>
        {statusMessage ? (
          <Text color={statusMessage.type === "error" ? "red" : statusMessage.type === "success" ? "green" : "yellow"}>
            {statusMessage.text}
          </Text>
        ) : (
          <Text dimColor>
            [{String.fromCharCode(8593)}/{String.fromCharCode(8595)}] navigate  [enter] activate  [g] new  [d] delete  [r] rename  [i] info  [q] quit
          </Text>
        )}
      </Box>
    </Box>
  );
}
