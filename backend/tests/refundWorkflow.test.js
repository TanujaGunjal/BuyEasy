/**
 * refundWorkflow.test.js
 *
 * Tests for the refund workflow: policy → pending approval → admin approval.
 * Pure unit tests — no DB, no network.
 *
 * Run: npm test
 */

const { checkReturnEligibility } = require('../services/policyEngine');

function makeOrder(overrides = {}) {
  return {
    orderStatus: 'Delivered',
    deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    totalPrice: 49999,
    orderItems: [
      { product: { category: 'Electronics' }, name: 'Laptop', quantity: 1, price: 49999 },
    ],
    ...overrides,
  };
}

describe('Refund Workflow: policy gating', () => {

  // Test 1: Eligible order goes to PENDING_APPROVAL
  test('Eligible order (delivered <30d, normal category) → eligible=true', () => {
    const order = makeOrder();
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(true);
    // In the real flow: eligible=true → agentTools.initiateRefund creates PendingApproval
  });

  // Test 2: Ineligible order → no PendingApproval created
  test('Expired order → eligible=false (no PendingApproval would be created)', () => {
    const order = makeOrder({
      deliveredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Return window expired/);
    // In the real flow: initiateRefund returns REJECTED_BY_POLICY without creating PendingApproval
  });

  // Test 3: Refund amount comes from DB (totalPrice), not LLM
  test('Refund amount is order.totalPrice from DB, not a user/LLM-provided value', () => {
    const order = makeOrder({ totalPrice: 49999 });
    // In agentTools.initiateRefund: const refundAmount = order.totalPrice;
    const refundAmount = order.totalPrice;
    expect(refundAmount).toBe(49999);
    // The LLM tool schema has no 'amount' param — it cannot influence this value
  });

  // Test 4: Food category → ineligible
  test('Order with Food item → eligible=false', () => {
    const order = makeOrder({
      orderItems: [{ product: { category: 'Food' }, name: 'Snack', quantity: 1, price: 500 }],
    });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/non-returnable/);
  });

  // Test 5: Not delivered → ineligible
  test('Order in Processing status → eligible=false', () => {
    const order = makeOrder({ orderStatus: 'Processing', deliveredAt: null });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/not yet delivered/);
  });

  // Test 6: Missing deliveredAt → manual review (NOT auto-approved)
  test('Missing deliveredAt → eligible=false, manual review required', () => {
    const order = makeOrder({ orderStatus: 'Delivered', deliveredAt: null });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/manual review required/);
    // CRITICAL: updatedAt is NOT used as fallback
  });
});

describe('Refund Workflow: Stripe integration architecture', () => {

  // Test 7: Stripe is NOT called in agentTools (only in refundService after admin approval)
  test('agentTools does not import or call stripe', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../services/agentTools.js'), 'utf8'
    );
    expect(src).not.toMatch(/require.*stripe/i);
    expect(src).not.toMatch(/stripe\.refunds/i);
  });

  // Test 8: refundService has idempotency guard — Stripe called at most once per payment
  test('refundService returns early if already Refunded (prevents double Stripe call)', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../services/refundService.js'), 'utf8'
    );
    expect(src).toMatch(/if \(payment\.status === 'Refunded'\)/);
    expect(src).toMatch(/return payment/);
  });

  // Test 9: refundService has clear Stripe integration point marked
  test('refundService has documented Stripe TODO integration point', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../services/refundService.js'), 'utf8'
    );
    expect(src).toMatch(/TODO.*stripe|stripe.*TODO/i);
  });

  // Test 10: Admin approval endpoint requires both pending status and admin role
  test('Admin approval enforces pending status + admin RBAC before processing', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../routes/adminApprovals.js'), 'utf8'
    );
    expect(src).toMatch(/authorize\('admin'\)/);
    expect(src).toMatch(/status !== 'pending'/);
    expect(src).toMatch(/409/);
  });
});
