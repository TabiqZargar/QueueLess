export interface Feedback {
  kind: "success" | "error";
  text: string;
}

export function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  return (
    <p
      role={feedback.kind === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-body-sm ${
        feedback.kind === "error"
          ? "border-danger-200 bg-error-container text-on-error-container"
          : "border-success-200 bg-tertiary-container text-on-tertiary-container"
      }`}
    >
      {feedback.text}
    </p>
  );
}