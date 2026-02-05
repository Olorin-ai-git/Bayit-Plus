
/**
 * Feature Item - shows included/excluded feature in subscription plan
 */
export function FeatureItem({ included, text }: { included: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
          included ? 'bg-green-500/20' : 'bg-white/10'
        }`}
        aria-hidden="true"
      >
        {included ? (
          <svg
            className="w-3 h-3 text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-white/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>
      <span
        className={`text-sm ${
          included ? 'text-white' : 'text-white/50 line-through'
        }`}
      >
        {text}
      </span>
    </div>
  );
}
