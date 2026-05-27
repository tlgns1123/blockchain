import { useReadContract, useWriteContract, useChainId } from "wagmi";
import DirectSaleABI from "@/abi/DirectSale.json";
import BlockTokenABI from "@/abi/BlockToken.json";
import { getContracts } from "@/config/contracts";

const MAX_UINT256 = 2n ** 256n - 1n;

export function useDirectSaleState(address: `0x${string}`) {
  const price  = useReadContract({ address, abi: DirectSaleABI, functionName: "price" });
  const buyer  = useReadContract({ address, abi: DirectSaleABI, functionName: "buyer" });
  const seller = useReadContract({ address, abi: DirectSaleABI, functionName: "seller" });
  const state  = useReadContract({ address, abi: DirectSaleABI, functionName: "state" });
  return { price, buyer, seller, state };
}

export function useBktAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  const chainId = useChainId();
  const { blockToken } = getContracts(chainId);
  return useReadContract({
    address: blockToken,
    abi: BlockTokenABI,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!owner && !!spender },
  });
}

export function useApproveBkt(spender: `0x${string}`) {
  const chainId = useChainId();
  const { blockToken } = getContracts(chainId);
  const { writeContractAsync, ...rest } = useWriteContract();
  const approve = () =>
    writeContractAsync({ address: blockToken, abi: BlockTokenABI, functionName: "approve", args: [spender, MAX_UINT256] });
  return { approve, ...rest };
}

export function usePurchase(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const purchase = (gas?: bigint) =>
    writeContractAsync({ address, abi: DirectSaleABI, functionName: "purchase", ...(gas ? { gas } : {}) });
  return { purchase, ...rest };
}

export function useConfirmReceivedDirect(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const confirm = () =>
    writeContractAsync({ address, abi: DirectSaleABI, functionName: "confirmReceived" });
  return { confirm, ...rest };
}

export function useCancelSale(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const cancel = () =>
    writeContractAsync({ address, abi: DirectSaleABI, functionName: "cancel" });
  return { cancel, ...rest };
}

export function useAgreeCancel(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const agreeCancel = () =>
    writeContractAsync({ address, abi: DirectSaleABI, functionName: "agreeCancel" });
  return { agreeCancel, ...rest };
}

export function useMutualCancelState(address: `0x${string}`) {
  const sellerAgree = useReadContract({ address, abi: DirectSaleABI, functionName: "sellerAgreeCancel" });
  const buyerAgree  = useReadContract({ address, abi: DirectSaleABI, functionName: "buyerAgreeCancel" });
  return { sellerAgree, buyerAgree };
}

export function useRaiseDispute(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const raiseDispute = () =>
    writeContractAsync({ address, abi: DirectSaleABI, functionName: "raiseDispute" });
  return { raiseDispute, ...rest };
}

export function useAdminResolve(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const adminResolve = (refundBuyer: boolean) =>
    writeContractAsync({ address, abi: DirectSaleABI, functionName: "adminResolve", args: [refundBuyer] });
  return { adminResolve, ...rest };
}
