const styles = {
  high: { bg: "bg-red-500", text: "High Risk" },
  medium: { bg: "bg-amber-500", text: "Medium Risk" },
  low: { bg: "bg-green-500", text: "Low Risk" },
};

export default function RiskBadge({
  level,
}: {
  level: "high" | "medium" | "low";
}) {
  const { bg, text } = styles[level];
  return (
    <span
      className={`${bg} text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm`}
    >
      {text}
    </span>
  );
}
