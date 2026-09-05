export interface Feedback {
  kind: "success" | "error";
  text: string;
}

export function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  return (
    <p
      role={feedback.kind === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${
        feedback.kind === "error"
          ? "border-danger-200 bg-danger-50 text-danger-700"
          : "border-success-200 bg-success-50 text-success-700"
      }`}
    >
      {feedback.text}
    </p>
  );
}