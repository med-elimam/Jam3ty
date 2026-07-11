export function normalizeManualTransactionReference(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateManualSettlement(input: { expectedAmountMru: number; receivedAmountMru: number; currency: string; transactionReference: string; recipientAccount: string; verificationNote: string; receivedAt: Date }) {
  const reference = normalizeManualTransactionReference(input.transactionReference);
  if (!reference) throw new Error("VERIFIED_TRANSACTION_REFERENCE_REQUIRED");
  if (!input.recipientAccount.trim()) throw new Error("RECIPIENT_ACCOUNT_REQUIRED");
  if (!input.verificationNote.trim()) throw new Error("VERIFICATION_NOTE_REQUIRED");
  if (input.currency !== "MRU") throw new Error("PAYMENT_CURRENCY_MISMATCH");
  if (!Number.isInteger(input.receivedAmountMru) || input.receivedAmountMru <= 0) throw new Error("INVALID_RECEIVED_AMOUNT");
  if (input.expectedAmountMru !== input.receivedAmountMru) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  if (Number.isNaN(input.receivedAt.getTime()) || input.receivedAt > new Date()) throw new Error("INVALID_RECEIVED_DATE");
  return reference;
}

export function isManualOrderReviewable(status: string, reviewStatus: string) {
  return status === "pending" && ["under_review", "needs_more_information"].includes(reviewStatus);
}
