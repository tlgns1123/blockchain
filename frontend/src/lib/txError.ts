export function parseTxError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)) ?? "";

  if (msg.includes("rejected") || msg.includes("denied") || msg.includes("4001") || msg.includes("User rejected")) {
    return "트랜잭션이 취소되었습니다.";
  }
  if (msg.includes("insufficient funds") || msg.includes("Insufficient funds")) {
    return "잔액이 부족합니다.";
  }
  if (msg.includes("Insufficient ETH reserve")) {
    return "컨트랙트의 ETH 잔액이 부족합니다.";
  }
  if (msg.includes("Below reserve")) {
    return "최소 입찰가 이상으로 입력해 주세요.";
  }
  if (msg.includes("Bid too low")) {
    return "현재 최고가보다 높게 입력해 주세요.";
  }
  if (msg.includes("Not on sale")) {
    return "판매 중인 상품이 아닙니다.";
  }
  if (msg.includes("Seller cannot bid")) {
    return "판매자는 입찰할 수 없습니다.";
  }
  if (msg.includes("Already committed")) {
    return "이미 입찰을 제출했습니다.";
  }
  if (
    msg.includes("Token transfer failed") ||
    msg.includes("ERC20InsufficientAllowance") ||
    msg.includes("ERC20InsufficientBalance")
  ) {
    return "BKT 전송에 실패했습니다. 잔액과 승인 상태를 확인해 주세요.";
  }
  if (msg.includes("Deposit below reserve")) {
    return "보증금이 최소 입찰가보다 낮습니다.";
  }
  if (msg.includes("Commit phase ended")) {
    return "입찰 제출 기간이 종료되었습니다.";
  }
  if (msg.includes("execution reverted")) {
    return "컨트랙트 실행에 실패했습니다.";
  }

  return "트랜잭션에 실패했습니다.";
}
