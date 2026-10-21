// portal/CodeInput.jsx
//
// Six boxes for the emailed code. Underneath it's one ordinary input, so
// typing, pasting the whole code, and phones offering the code from the
// email (autocomplete="one-time-code") all just work.
//
//   <CodeInput value={code} onChange={setCode} onComplete={submit} error={!!error} />
import { forwardRef, useState } from "react";
import { Box, alpha, useTheme } from "@mui/material";

const LENGTH = 6;

const CodeInput = forwardRef(function CodeInput(
  { value, onChange, onComplete, error = false, disabled = false, autoFocus },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, LENGTH - 1);

  const handleChange = (e) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, LENGTH);
    onChange(next);
    if (next.length === LENGTH && value.length !== LENGTH) onComplete?.(next);
  };

  const borderFor = (i) => {
    if (error) return theme.palette.error.main;
    if (focused && i === active) return theme.palette.primary.main;
    if (i < value.length) return alpha(theme.palette.text.primary, 0.35);
    return theme.palette.divider;
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Box
        aria-hidden
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${LENGTH}, 1fr)`,
          gap: { xs: 1, sm: 1.25 },
        }}
      >
        {Array.from({ length: LENGTH }, (_, i) => (
          <Box
            key={i}
            sx={{
              height: { xs: 54, sm: 58 },
              borderRadius: 1.5,
              border: "1.5px solid",
              borderColor: borderFor(i),
              bgcolor: "background.paper",
              boxShadow:
                focused && i === active && !error
                  ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`
                  : "none",
              display: "grid",
              placeItems: "center",
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              fontSize: "1.75rem",
              color: "text.primary",
              transition: "border-color .12s, box-shadow .12s",
              ...(disabled && { opacity: 0.6 }),
            }}
          >
            {value[i] ??
              (focused && i === active ? (
                <Box
                  sx={{
                    width: "2px",
                    height: 26,
                    bgcolor: "primary.main",
                    animation: "blink 1s steps(1) infinite",
                    "@keyframes blink": { "50%": { opacity: 0 } },
                  }}
                />
              ) : null)}
          </Box>
        ))}
      </Box>

      {/* The real input, invisible, over the boxes so a tap anywhere focuses it. */}
      <Box
        component="input"
        ref={ref}
        value={value}
        onChange={handleChange}
        onFocus={(e) => {
          setFocused(true);
          // keep the cursor at the end
          const len = e.target.value.length;
          requestAnimationFrame(() => e.target.setSelectionRange?.(len, len));
        }}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={LENGTH}
        aria-label="6-digit code"
        aria-invalid={error || undefined}
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          border: 0,
          fontSize: 16, // stops iPhone zooming in
          cursor: "text",
          caretColor: "transparent",
        }}
      />
    </Box>
  );
});

export default CodeInput;
