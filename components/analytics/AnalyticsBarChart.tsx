type ChartDatum = {
  label: string;
  value: number;
  helper?: string;
};

export default function AnalyticsBarChart({
  title,
  data,
  suffix = "",
  emptyMessage = "No data yet.",
}: {
  title: string;
  data: ChartDatum[];
  suffix?: string;
  emptyMessage?: string;
}) {
  const safeData = data.filter((item) => Number.isFinite(item.value));
  const maxValue =
    safeData.length > 0 ? Math.max(...safeData.map((item) => item.value), 1) : 1;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="mt-6 space-y-4">
        {safeData.length === 0 ? (
          <p className="text-sm text-gray-600">{emptyMessage}</p>
        ) : (
          safeData.map((item, index) => {
            const width = Math.max((item.value / maxValue) * 100, item.value > 0 ? 6 : 0);

            return (
              <div key={`${item.label}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{item.label}</p>
                    {item.helper && (
                      <p className="truncate text-xs text-gray-500">{item.helper}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold text-gray-700">
                    {item.value.toFixed(2)}
                    {suffix}
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-black transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}