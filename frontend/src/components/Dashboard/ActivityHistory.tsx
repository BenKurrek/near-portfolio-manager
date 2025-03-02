import React, { useContext } from "react";
import { useTokenContext } from "@context/TokenContext";
import { PriceContext } from "@context/PriceContext";

interface Activity {
  agent_id: string;
  timestamp: number;
  diffs: { diff: { [tokenId: string]: string } };
}

interface ActivityHistoryProps {
  activities: string[] | undefined;
}

interface TokenDisplayData {
  tokenId: string;
  icon: string;
  name: string;
  symbol: string;
  amount: number;
  usdValue: number;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ activities }) => {
  const { getTokenByDefuseAssetId } = useTokenContext();
  const { prices } = useContext(PriceContext);

  // Fallback if activities is undefined
  const activitiesArray = activities || [];

  // Parse JSON safely, filter out invalid
  const parsedActivities: Activity[] = activitiesArray
    .map((activityStr) => {
      try {
        const parsed = JSON.parse(activityStr);
        if (!parsed?.agent_id || !parsed?.timestamp || !parsed?.diffs)
          return null;
        return parsed;
      } catch (error) {
        console.error("Failed to parse activity:", activityStr, error);
        return null;
      }
    })
    .filter((act): act is Activity => !!act);

  // Sort descending by timestamp
  parsedActivities.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <section className="max-w-4xl mx-auto my-8 p-4 bg-neutral-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-brandAccent">
        Activity History
      </h2>
      {parsedActivities.length === 0 ? (
        <p className="text-gray-400">No activities yet.</p>
      ) : (
        <ul className="space-y-4">
          {parsedActivities.map((activity, idx) => {
            // Convert “nano” timestamp to standard JavaScript Date
            const date = new Date(Number(activity.timestamp) / 1e6);

            // Separate diffs into incoming (positive) and outgoing (negative)
            const incoming: TokenDisplayData[] = [];
            const outgoing: TokenDisplayData[] = [];

            Object.entries(activity.diffs.diff).forEach(
              ([tokenId, amountStr]) => {
                const tokenMeta = getTokenByDefuseAssetId(tokenId);
                const rawAmount = parseFloat(amountStr);
                const decimals = tokenMeta?.decimals ?? 0;
                const amount = rawAmount / Math.pow(10, decimals);
                const price = tokenMeta ? prices[tokenMeta.symbol] || 0 : 0;
                const usdValue = Math.abs(amount) * price;

                if (amount > 0) {
                  incoming.push({
                    tokenId,
                    icon: tokenMeta?.icon || "",
                    name: tokenMeta?.name || tokenId,
                    symbol: tokenMeta?.symbol || "",
                    amount,
                    usdValue,
                  });
                } else if (amount < 0) {
                  outgoing.push({
                    tokenId,
                    icon: tokenMeta?.icon || "",
                    name: tokenMeta?.name || tokenId,
                    symbol: tokenMeta?.symbol || "",
                    amount: Math.abs(amount),
                    usdValue,
                  });
                }
              }
            );

            return (
              <li key={idx} className="bg-neutral-900 rounded-lg p-4 shadow">
                {/* Top row: Time + Agent */}
                <div className="flex flex-wrap justify-between items-center mb-2">
                  <div className="text-sm text-gray-300">
                    <span className="font-medium text-gray-400 mr-1">
                      Time:
                    </span>
                    {date.toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                    })}
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="font-medium text-gray-400 mr-1">
                      Agent ID:
                    </span>
                    {activity.agent_id}
                  </div>
                </div>

                {/* Negative -> Positive row */}
                {outgoing.length === 0 && incoming.length === 0 ? (
                  <div className="text-gray-400 italic">
                    No token changes in this activity.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                    {/* Outgoing tokens */}
                    <div className="flex flex-wrap items-center gap-2">
                      {outgoing.map((negToken, i) => (
                        <TokenBadge
                          key={i}
                          icon={negToken.icon}
                          amount={-negToken.amount} // negative
                          usdValue={negToken.usdValue}
                          symbol={negToken.symbol}
                          isPositive={false}
                        />
                      ))}
                    </div>

                    {/* Arrow icon in the middle */}
                    {(outgoing.length > 0 || incoming.length > 0) && (
                      <div className="text-gray-500 mx-2 text-xl">→</div>
                    )}

                    {/* Incoming tokens */}
                    <div className="flex flex-wrap items-center gap-2">
                      {incoming.map((posToken, i) => (
                        <TokenBadge
                          key={i}
                          icon={posToken.icon}
                          amount={posToken.amount}
                          usdValue={posToken.usdValue}
                          symbol={posToken.symbol}
                          isPositive={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// Helper function to format the token amount dynamically
const formatDynamicAmount = (amount: number): string => {
  if (amount >= 1) {
    // For amounts 1 or greater, show 2 decimals
    return amount.toFixed(2);
  }

  // Convert the amount to string (handle potential scientific notation)
  const amountStr = amount.toString();
  if (amountStr.indexOf("e") !== -1) {
    // Fallback for very small values in scientific notation
    return amount.toFixed(10);
  }

  // Split into integer and decimal parts
  const [, decimals = ""] = amountStr.split(".");

  // Count leading zeros in the decimal part
  let leadingZeros = 0;
  for (const char of decimals) {
    if (char === "0") {
      leadingZeros++;
    } else {
      break;
    }
  }

  // Set decimals: at least (leading zeros + 2) or a minimum of 4 decimal places
  const decimalsToShow = Math.max(leadingZeros + 2, 4);
  return amount.toFixed(decimalsToShow);
};

interface TokenBadgeProps {
  icon: string;
  amount: number;
  usdValue: number;
  symbol: string;
  isPositive: boolean;
}

const TokenBadge: React.FC<TokenBadgeProps> = ({
  icon,
  amount,
  usdValue,
  symbol,
  isPositive,
}) => {
  const sign = isPositive ? "+" : "-";
  const colorClass = isPositive ? "text-green-400" : "text-red-400";

  return (
    <div className="flex items-center space-x-1 bg-neutral-800 px-2 py-1 rounded-md">
      {icon && (
        <img src={icon} alt={symbol} className="w-5 h-5 object-contain" />
      )}
      <span className={`text-sm font-semibold ${colorClass}`}>
        {sign === "+" && sign}
        {formatDynamicAmount(amount)}
      </span>
      <span className="text-xs text-gray-400">
        {symbol} (~${usdValue.toFixed(2)})
      </span>
    </div>
  );
};

export default ActivityHistory;
