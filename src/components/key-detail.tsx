import { Box, Text } from "ink";
import type { SshKey } from "../types.js";

interface KeyDetailProps {
  sshKey: SshKey;
  onBack: () => void;
}

export default function KeyDetail({ sshKey, onBack }: KeyDetailProps) {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold underline>Key Details</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <DetailRow label="Name" value={sshKey.name} />
        <DetailRow label="Type" value={sshKey.keyType ? `${sshKey.keyType}${sshKey.bits ? ` ${sshKey.bits}` : ""}` : "unknown"} />
        <DetailRow label="Status" value={sshKey.isActive ? "Active (loaded in agent)" : "Inactive"} valueColor={sshKey.isActive ? "green" : "dim"} />
        <DetailRow label="Private" value={sshKey.privatePath} />
        <DetailRow label="Public" value={sshKey.publicPath} />
        <DetailRow label="Fingerprint" value={sshKey.fingerprint || "unknown"} />
        <DetailRow label="Comment" value={sshKey.comment || "(none)"} />
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press any key to go back</Text>
      </Box>
    </Box>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box height={1}>
      <Box width={16}>
        <Text bold>{label}:</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={valueColor}>{value}</Text>
      </Box>
    </Box>
  );
}
