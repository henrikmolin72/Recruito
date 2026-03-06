// ============================================================
// Async/Await in JavaScript - A Practical Example
// ============================================================
// This file demonstrates the core patterns of async/await,
// which provide a cleaner way to work with Promises.
// Run with: node async-await-example.js
// ============================================================

// -- Helper: simulate an async operation (e.g., a network request) --
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// 1. Basic async function
// ============================================================
// Declaring a function with `async` makes it return a Promise
// automatically. The resolved value is whatever you return.

async function greet(name) {
  await delay(100);
  return `Hello, ${name}!`;
}

// ============================================================
// 2. Using await to handle promises
// ============================================================
// `await` pauses execution until the Promise settles, then
// unwraps its resolved value. This reads like synchronous code.

async function fetchUserProfile(userId) {
  console.log(`Fetching profile for user ${userId}...`);
  await delay(300); // simulate network latency

  // Simulate a response object
  const profile = {
    id: userId,
    name: "Alice",
    role: "Engineer",
  };

  console.log(`Profile fetched: ${profile.name}`);
  return profile;
}

// ============================================================
// 3. Error handling with try/catch
// ============================================================
// Wrapping awaited calls in try/catch lets you handle rejected
// Promises the same way you handle thrown errors.

async function fetchWithErrorHandling(shouldFail) {
  try {
    console.log("\nAttempting a request...");
    await delay(200);

    if (shouldFail) {
      throw new Error("Network timeout: server did not respond");
    }

    console.log("Request succeeded.");
    return { status: "ok", data: [1, 2, 3] };
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    // Return a fallback value instead of crashing
    return { status: "error", data: [] };
  }
}

// ============================================================
// 4. Running multiple async operations in parallel
// ============================================================
// Promise.all runs multiple promises concurrently and waits
// for all of them to resolve. This is faster than awaiting
// each one sequentially when they are independent.

async function fetchDashboardData() {
  console.log("\nLoading dashboard (parallel)...");
  const start = Date.now();

  // These three operations run at the same time
  const [users, orders, analytics] = await Promise.all([
    fetchResource("users", 400),
    fetchResource("orders", 300),
    fetchResource("analytics", 500),
  ]);

  const elapsed = Date.now() - start;
  console.log(`Dashboard loaded in ~${elapsed}ms (parallel)`);
  console.log(`  users: ${users.count}, orders: ${orders.count}, analytics: ${analytics.count}`);

  return { users, orders, analytics };
}

// Simulates fetching a named resource with a given latency
async function fetchResource(name, latencyMs) {
  await delay(latencyMs);
  return { name, count: Math.floor(Math.random() * 100) + 1 };
}

// ============================================================
// 5. Sequential async flow
// ============================================================
// Sometimes operations depend on each other and must run in
// order. Each `await` waits for the previous step to finish
// before starting the next one.

async function processOrder(orderId) {
  console.log(`\nProcessing order ${orderId} (sequential)...`);
  const start = Date.now();

  // Step 1: validate the order
  await delay(150);
  console.log("  Step 1: Order validated");

  // Step 2: charge payment (depends on validation)
  await delay(200);
  const paymentId = `PAY-${Date.now()}`;
  console.log(`  Step 2: Payment charged (${paymentId})`);

  // Step 3: reserve inventory (depends on payment)
  await delay(100);
  console.log("  Step 3: Inventory reserved");

  // Step 4: send confirmation (depends on all above)
  await delay(100);
  console.log("  Step 4: Confirmation sent");

  const elapsed = Date.now() - start;
  console.log(`Order ${orderId} completed in ~${elapsed}ms (sequential)`);

  return { orderId, paymentId, status: "confirmed" };
}

// ============================================================
// Main: run all demonstrations
// ============================================================

async function main() {
  // 1. Basic async function
  const message = await greet("World");
  console.log(message);

  // 2. Await a promise-based operation
  const profile = await fetchUserProfile(42);
  console.log(`User role: ${profile.role}`);

  // 3. Error handling - success case, then failure case
  const successResult = await fetchWithErrorHandling(false);
  console.log(`Result: ${successResult.status}`);

  const failResult = await fetchWithErrorHandling(true);
  console.log(`Result: ${failResult.status}`);

  // 4. Parallel execution with Promise.all
  await fetchDashboardData();

  // 5. Sequential async flow
  await processOrder("ORD-1001");

  console.log("\nAll demonstrations complete.");
}

main().catch(console.error);
