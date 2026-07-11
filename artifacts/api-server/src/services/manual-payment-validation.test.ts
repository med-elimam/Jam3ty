import assert from "node:assert/strict";
import test from "node:test";
import { isManualOrderReviewable, normalizeManualTransactionReference, validateManualSettlement } from "./manual-payment-validation";

const valid = { expectedAmountMru: 500, receivedAmountMru: 500, currency: "MRU", transactionReference: " tx 123 ", recipientAccount: "22200000", verificationNote: "Checked merchant statement", receivedAt: new Date(Date.now() - 1000) };

test("normalizes transaction references for uniqueness", () => assert.equal(normalizeManualTransactionReference(" tx 12 3 "), "TX123"));
test("accepts exact MRU settlement", () => assert.equal(validateManualSettlement(valid), "TX123"));
test("rejects a wrong received amount", () => assert.throws(() => validateManualSettlement({ ...valid, receivedAmountMru: 499 }), /PAYMENT_AMOUNT_MISMATCH/));
test("requires the verified transaction reference", () => assert.throws(() => validateManualSettlement({ ...valid, transactionReference: " " }), /VERIFIED_TRANSACTION_REFERENCE_REQUIRED/));
test("rejects non-MRU settlement", () => assert.throws(() => validateManualSettlement({ ...valid, currency: "USD" }), /PAYMENT_CURRENCY_MISMATCH/));
test("only pending review states are reviewable", () => {
  assert.equal(isManualOrderReviewable("pending", "under_review"), true);
  assert.equal(isManualOrderReviewable("pending", "needs_more_information"), true);
  assert.equal(isManualOrderReviewable("paid", "verified"), false);
  assert.equal(isManualOrderReviewable("pending", "awaiting_evidence"), false);
});
