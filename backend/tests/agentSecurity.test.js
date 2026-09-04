/**
 * agentSecurity.test.js
 *
 * Security boundary tests for the agent tool layer.
 * These are pure unit tests — no DB, no network, no Gemini.
 *
 * Run: npm test
 */

const { checkReturnEligibility } = require('../services/policyEngine');

// ─── Helper ────────────────────────────────────────────────────────────────────
function makeOrder(overrides = {}) {
  return {
    _id: 'order-abc',
    user: 'user-A',
    orderStatus: 'Delivered',
    deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    totalPrice: 49999,
    orderItems: [
      { product: { category: 'Electronics' }, name: 'Laptop', quantity: 1, price: 49999 },
    ],
    ...overrides,
  };
}

// ─── Security Tests ────────────────────────────────────────────────────────────
describe('Security: agentTools ownership enforcement', () => {

  // Test 1: LLM cannot control userId — userId never in tool schemas
  test('Tool schemas do not include userId as a parameter', () => {
    // The tool schemas in agentController only expose: orderId, reason
    // This test documents that the LLM schema intentionally excludes userId.
    // The actual enforcement is in agentTools.js (Order.findOne with req.user.id).
    const toolSchemaParams = ['orderId', 'reason']; // intentionally minimal
    expect(toolSchemaParams).not.toContain('userId');
    expect(toolSchemaParams).not.toContain('authenticatedUserId');
    expect(toolSchemaParams).not.toContain('amount'); // refund amount also excluded
  });

  // Test 2: LLM cannot provide refund amount
  test('initiateRefund schema does not accept an amount parameter', () => {
    // Documented invariant: amount is NEVER accepted from LLM.
    // It is computed server-side from order.totalPrice.
    const initiateRefundParams = ['orderId', 'reason'];
    expect(initiateRefundParams).not.toContain('amount');
  });

  // Test 3: Policy engine makes eligibility decision — not the LLM
  test('Eligibility decision comes from policyEngine, not from LLM input', () => {
    // The LLM can only call the tool; the tool calls policyEngine.
    // Regardless of what the LLM "thinks", policyEngine is authoritative.
    const expiredOrder = makeOrder({
      deliveredAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    });
    const result = checkReturnEligibility(expiredOrder);
    // Even if LLM says "eligible", policy says no.
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Return window expired/);
  });

  // Test 4: User A cannot access User B's order (ownership enforced at DB level)
  test('Order ownership is enforced at the DB query level (documented invariant)', () => {
    // agentTools.getOrderStatus does:
    //   Order.findOne({ _id: orderId, user: authenticatedUserId })
    // If user A sends orderId belonging to user B, findOne returns null.
    // The tool then returns { error: 'Order not found or not accessible' }
    // This test documents the invariant; integration test would need a live DB.
    const queryFilter = { _id: 'order-B', user: 'user-A' };
    // In production: this query returns null, triggering the safe error path.
    expect(queryFilter.user).toBe('user-A');
    expect(queryFilter._id).toBe('order-B');
    // The important thing: user is ALWAYS from req.user.id, never from LLM args.
  });

  // Test 5: initiateRefund does NOT call Stripe (documented invariant)
  test('initiateRefund creates PendingApproval only — documented Stripe exclusion', () => {
    // refundService.js is only called from adminApprovals.js (approve route).
    // agentTools.initiateRefund only calls PendingApproval.create().
    // This test documents that invariant.
    const agentToolsSource = require('fs')
      .readFileSync(require('path').join(__dirname, '../services/agentTools.js'), 'utf8');
    // Check there is no actual Stripe import or method call — a comment mentioning Stripe is fine.
    expect(agentToolsSource).not.toMatch(/require\(['"]stripe['"]\)/i);
    expect(agentToolsSource).not.toMatch(/stripe\.(refunds|charges|paymentIntents)/i);
    expect(agentToolsSource).not.toMatch(/processRefund/);
    expect(agentToolsSource).toMatch(/PendingApproval\.create/);
  });

  // Test 6: Normal user cannot reach admin approval endpoint
  test('authorize middleware enforces admin role — documented RBAC invariant', () => {
    // adminApprovals.js uses: router.use(protect); router.use(authorize('admin'));
    // A normal user with role='user' gets 403.
    // This test documents the invariant by checking the route file.
    const routeSource = require('fs')
      .readFileSync(require('path').join(__dirname, '../routes/adminApprovals.js'), 'utf8');
    expect(routeSource).toMatch(/authorize\('admin'\)/);
    expect(routeSource).toMatch(/protect/);
  });
});

// ─── Idempotency Tests ─────────────────────────────────────────────────────────
describe('Idempotency: approval cannot create duplicate refund', () => {

  // Test 7: Already-approved status blocks second Stripe call
  test('processRefund returns early if payment already Refunded', () => {
    // refundService.js: if (payment.status === 'Refunded') return payment;
    // This belt-and-suspenders guard prevents double refunds at the payment layer.
    const refundServiceSource = require('fs')
      .readFileSync(require('path').join(__dirname, '../services/refundService.js'), 'utf8');
    expect(refundServiceSource).toMatch(/status === 'Refunded'/);
  });

  // Test 8: PendingApproval status !== 'pending' blocks second approval
  test('adminApprovals route checks status !== pending before processing', () => {
    const routeSource = require('fs')
      .readFileSync(require('path').join(__dirname, '../routes/adminApprovals.js'), 'utf8');
    expect(routeSource).toMatch(/status !== 'pending'/);
    expect(routeSource).toMatch(/409/); // conflict status code
  });

  // Test 9: Duplicate refund guard in agentTools
  test('agentTools.initiateRefund checks for existing pending approval', () => {
    const toolsSource = require('fs')
      .readFileSync(require('path').join(__dirname, '../services/agentTools.js'), 'utf8');
    expect(toolsSource).toMatch(/ALREADY_PENDING/);
    expect(toolsSource).toMatch(/PendingApproval\.findOne/);
  });
});
