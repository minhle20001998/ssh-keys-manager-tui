import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";

const KEY_TYPES = [
  { label: "ED25519 (recommended)", value: "ed25519" },
  { label: "RSA 4096", value: "rsa" },
  { label: "ECDSA 256", value: "ecdsa" },
  { label: "ED25519-SK (hardware)", value: "ed25519-sk" },
];

interface KeyFormProps {
  onGenerate: (name: string, type: string, passphrase?: string, comment?: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function KeyForm({ onGenerate, onCancel, error }: KeyFormProps) {
  const [name, setName] = useState("");
  const [typeIndex, setTypeIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [step, setStep] = useState<"name" | "type" | "comment" | "passphrase" | "confirm">("name");

  const handleNameSubmit = () => {
    if (name.trim()) {
      setStep("type");
    }
  };

  const handleCommentSubmit = () => {
    setStep("passphrase");
  };

  const handlePassphraseSubmit = () => {
    setStep("confirm");
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (step === "name" && key.return) {
      handleNameSubmit();
    }

    if (step === "type") {
      if (key.downArrow) {
        setTypeIndex((i) => (i + 1) % KEY_TYPES.length);
      } else if (key.upArrow) {
        setTypeIndex((i) => (i - 1 + KEY_TYPES.length) % KEY_TYPES.length);
      } else if (key.return) {
        setStep("comment");
      }
    }

    if (step === "confirm") {
      if (input === "y" || input === "Y") {
        onGenerate(name, KEY_TYPES[typeIndex]!.value, passphrase || undefined, comment || undefined);
      } else {
        onCancel();
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold underline>Generate New SSH Key</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Box height={1}>
          <Box width={18}>
            <Text bold>Key name:</Text>
          </Box>
          {step === "name" ? (
            <Box flexGrow={1}>
              <TextInput
                value={name}
                onChange={setName}
                onSubmit={handleNameSubmit}
                placeholder="e.g. id_ed25519_github"
              />
            </Box>
          ) : (
            <Text>{name || "(not set)"}</Text>
          )}
        </Box>

        <Box height={1}>
          <Box width={18}>
            <Text bold>Key type:</Text>
          </Box>
          <Box flexDirection="column">
            {step === "type" ? (
              KEY_TYPES.map((t, i) => (
                <Box key={t.value}>
                  <Text color={i === typeIndex ? "cyan" : "dim"}>
                    {i === typeIndex ? "> " : "  "}{t.label}
                  </Text>
                </Box>
              ))
            ) : (
              <Text>{KEY_TYPES[typeIndex]!.label}</Text>
            )}
          </Box>
        </Box>

        <Box height={1}>
          <Box width={18}>
            <Text bold>Email / comment:</Text>
          </Box>
          {step === "comment" ? (
            <Box flexGrow={1}>
              <TextInput
                value={comment}
                onChange={setComment}
                onSubmit={handleCommentSubmit}
                placeholder="e.g. user@example.com"
              />
            </Box>
          ) : comment ? (
            <Text>{comment}</Text>
          ) : (
            <Text dimColor>defaults to user@hostname</Text>
          )}
        </Box>

        <Box height={1}>
          <Box width={18}>
            <Text bold>Passphrase:</Text>
          </Box>
          {step === "passphrase" ? (
            <Box flexGrow={1}>
              <TextInput
                value={passphrase}
                onChange={setPassphrase}
                onSubmit={handlePassphraseSubmit}
                placeholder="(optional)"
                mask="*"
              />
            </Box>
          ) : step === "confirm" ? (
            <Text>{passphrase ? "********" : "(none)"}</Text>
          ) : (
            <Text dimColor>(set in next step)</Text>
          )}
        </Box>
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        {step === "name" && name.trim() ? (
          <Text dimColor>Press Enter to continue</Text>
        ) : step === "name" ? (
          <Text dimColor>Type a name, then press Enter</Text>
        ) : step === "type" ? (
          <Text dimColor>Arrow keys to navigate, Enter to select</Text>
        ) : step === "comment" ? (
          <Text dimColor>Press Enter to continue (or leave empty for default)</Text>
        ) : step === "passphrase" ? (
          <Text dimColor>Press Enter to continue (leave empty for no passphrase)</Text>
        ) : (
          <Text dimColor>Press Y to confirm, any other key to cancel</Text>
        )}
      </Box>
    </Box>
  );
}
