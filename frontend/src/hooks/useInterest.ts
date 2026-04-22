import { useReadContract, useChainId } from "wagmi";
import InterestCalculatorABI from "@/abi/InterestCalculator.json";
import { getContracts } from "@/config/contracts";

/// 고정 2.5% 수수료 미리보기 (durationSeconds 무시)
export function useInterestPreview(principal: bigint) {
  const chainId = useChainId();
  const { interestCalculator } = getContracts(chainId);

  return useReadContract({
    address: interestCalculator,
    abi: InterestCalculatorABI,
    functionName: "calculate",
    args: [principal, 0n],
    query: { enabled: principal > 0n },
  });
}
