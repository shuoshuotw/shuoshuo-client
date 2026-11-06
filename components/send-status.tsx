export type SendPhase = "idle" | "sending" | "done";

/**
 * M-08. Laid over the card being sent: a disc with a spinner comes in over the sentence, and when the server has it
 * the spinner gives way to a green disc that pops and draws its tick (transitions.dev's spinner to check).
 */
export function SendStatus({ phase }: { phase: SendPhase }) {
  return (
    <span className="send-status" data-phase={phase} aria-hidden="true">
      <span className="send-disc">
        <span className="send-ring" />
        <span className="send-arc" />
        <svg className="send-check" viewBox="0 0 24 24">
          <path d="M6.5 12.5 10.2 16 17.5 8.5" pathLength={1} />
        </svg>
      </span>
    </span>
  );
}
