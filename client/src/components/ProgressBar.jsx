export default function ProgressBar({ percent, className = '', showLabel = false, color = 'bg-primary-600' }) {
  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-surface-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}
