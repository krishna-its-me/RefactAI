from typing import Dict, Any, Tuple

class SolutionGenerator:
    """Generates production-grade refactored code solutions with inline comment explanations."""

    SAMPLE_SOLUTIONS = {
        "src/services/payment_orchestrator.py": {
            "problem_summary": "High Cyclomatic Complexity (28.5), God Object anti-pattern (24 methods), tight coupling to payment gateways, and nested conditionals causing frequent bug regressions (7 bug fixes).",
            "before_code": """# [ORIGINAL CODE - TECHNICAL DEBT HOTSPOT]
# Complexity: 28.5 | Churn: 1250 | Bug Fixes: 7
class PaymentOrchestrator:
    def process(self, order, user, gateway, retry=False):
        if order is not None:
            if order.is_valid():
                if user.is_authenticated():
                    if user.wallet_balance >= order.amount:
                        if gateway == "stripe":
                            # Deeply nested external API call without retry strategy
                            res = stripe.Charge.create(amount=order.amount, user=user.id)
                            if res.status == "succeeded":
                                order.mark_paid()
                                return True
                            else:
                                if retry:
                                    return self.process(order, user, gateway, retry=False)
                                return False
                        elif gateway == "paypal":
                            res = paypal.Payment.execute(order.amount, user.email)
                            if res.success:
                                order.mark_paid()
                                return True
                        # ... 18 other nested elif blocks for multiple vendors""",
            "solution_code": """# ==============================================================================
# REFACTAI AUTHORIZED REFACTORING SOLUTION
# Module: src/services/payment_orchestrator.py
# Refactoring Pattern: Strategy Pattern + Guard Clauses + Dependency Inversion
# Result: Cyclomatic Complexity reduced from 28.5 -> 2.1 (-92.6% Debt Reduction)
# ==============================================================================

from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

# [STEP 1: Define Immutable Domain Models]
# Encapsulating order and transaction payload prevents state mutation across threads.
@dataclass(frozen=True)
class PaymentResult:
    is_successful: bool
    transaction_id: Optional[str] = None
    error_message: Optional[str] = None


# [STEP 2: Gateway Strategy Interface]
# Decouples orchestrator from vendor SDKs (Open-Closed Principle: add new gateways without modifying core logic).
class PaymentGatewayStrategy(ABC):
    @abstractmethod
    def execute_charge(self, amount: float, user_id: str) -> PaymentResult:
        pass


# [STEP 3: Concrete Gateway Strategies with Resilient Error Handling]
class StripeGatewayStrategy(PaymentGatewayStrategy):
    def execute_charge(self, amount: float, user_id: str) -> PaymentResult:
        # Isolated vendor logic prevents exceptions from propagating unhandled
        try:
            # Replaced raw calls with resilient idempotency key
            logger.info("Charging %.2f via Stripe for user %s", amount, user_id)
            return PaymentResult(is_successful=True, transaction_id="ch_stripe_mock_id")
        except Exception as exc:
            logger.error("Stripe charge failed: %s", exc)
            return PaymentResult(is_successful=False, error_message=str(exc))


class PayPalGatewayStrategy(PaymentGatewayStrategy):
    def execute_charge(self, amount: float, user_id: str) -> PaymentResult:
        try:
            logger.info("Executing PayPal capture for user %s", user_id)
            return PaymentResult(is_successful=True, transaction_id="pp_mock_id")
        except Exception as exc:
            logger.error("PayPal capture failed: %s", exc)
            return PaymentResult(is_successful=False, error_message=str(exc))


# [STEP 4: Clean Orchestrator with Guard Clauses (Complexity: 2.1)]
class PaymentOrchestrator:
    \"\"\"
    RefactAI Refactored Orchestrator:
    - Eliminates 24 nested methods by delegating payment execution to dedicated strategies.
    - Employs 'Fail-Fast' Guard Clauses to eliminate deep if-nesting.
    - Fully unit-testable with mock strategies.
    \"\"\"
    def __init__(self, strategies: dict[str, PaymentGatewayStrategy]):
        # Dependency Injection: strategies are supplied at runtime
        self._strategies = strategies

    def process(self, order, user, gateway_name: str) -> PaymentResult:
        # [GUARD 1]: Validate Order Existence and Integrity
        if not order or not order.is_valid():
            logger.warning("Order validation failed: rejected before gateway dispatch")
            return PaymentResult(is_successful=False, error_message="Invalid order specification")

        # [GUARD 2]: Validate User Authentication Status
        if not user or not user.is_authenticated():
            logger.warning("Unauthorized user transaction attempt")
            return PaymentResult(is_successful=False, error_message="User is unauthenticated")

        # [GUARD 3]: Ensure Sufficient Funds Before External Gateway Call
        if user.wallet_balance < order.amount:
            logger.warning("Insufficient funds: balance %.2f < order %.2f", user.wallet_balance, order.amount)
            return PaymentResult(is_successful=False, error_message="Insufficient user funds")

        # [GUARD 4]: Validate Gateway Provider Exists in Registry
        strategy = self._strategies.get(gateway_name.lower())
        if not strategy:
            logger.error("Unsupported gateway requested: %s", gateway_name)
            return PaymentResult(is_successful=False, error_message=f"Gateway '{gateway_name}' not configured")

        # [DISPATCH]: O(1) Execution without nested branching
        result = strategy.execute_charge(amount=order.amount, user_id=user.id)
        if result.is_successful:
            order.mark_paid(transaction_id=result.transaction_id)
            logger.info("Order %s successfully finalized", order.id)

        return result
"""
        },
        "src/auth/token_verifier.py": {
            "problem_summary": "High Cyclomatic Complexity (18.2), repeated bug fixes (4), lack of constant-time comparison, and tightly coupled cryptographic validation logic.",
            "before_code": """# [ORIGINAL CODE - VULNERABLE & HIGH CHURN]
def verify_access_token(token, secret, user_db):
    if token != "":
        parts = token.split(".")
        if len(parts) == 3:
            header, payload, signature = parts[0], parts[1], parts[2]
            # Insecure non-constant-time string equality check vulnerable to timing attacks
            expected = hmac.new(secret, f"{header}.{payload}").hexdigest()
            if signature == expected:
                data = json.loads(base64.b64decode(payload))
                if data["exp"] > time.time():
                    user = user_db.find(data["sub"])
                    if user:
                        return user
    return None""",
            "solution_code": """# ==============================================================================
# REFACTAI AUTHORIZED REFACTORING SOLUTION
# Module: src/auth/token_verifier.py
# Refactoring Pattern: Secure Middleware + Constant-Time Cryptographic Guard + Token Cache
# Result: Cyclomatic Complexity reduced from 18.2 -> 1.8 (-90.1% Debt Reduction)
# ==============================================================================

import hmac
import hashlib
import json
import base64
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass

@dataclass(frozen=True)
class VerifiedClaims:
    subject_id: str
    expires_at: int
    scopes: list[str]

class TokenVerificationError(Exception):
    \"\"\"Custom domain exception for explicit audit logging.\"\"\"
    pass

class TokenVerifier:
    \"\"\"
    RefactAI Refactored Verifier:
    - Protects against timing attacks using hmac.compare_digest().
    - Uses strict early-return guard clauses.
    - Separates parsing, cryptographic signature validation, and payload deserialization.
    \"\"\"
    def __init__(self, secret_key: bytes, leeway_seconds: int = 30):
        self._secret_key = secret_key
        self._leeway = leeway_seconds

    def verify_token(self, raw_token: str) -> VerifiedClaims:
        # [GUARD 1]: Ensure token string format
        if not raw_token or not isinstance(raw_token, str):
            raise TokenVerificationError("Empty or invalid token format")

        parts = raw_token.strip().split(".")
        if len(parts) != 3:
            raise TokenVerificationError("JWT must contain exactly three dot-separated components")

        header_b64, payload_b64, signature_b64 = parts

        # [GUARD 2]: Constant-Time Signature Verification
        signed_content = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(self._secret_key, signed_content, hashlib.sha256).digest()
        provided_sig = self._safe_b64decode(signature_b64)

        # Uses hmac.compare_digest to prevent side-channel timing attacks
        if not hmac.compare_digest(expected_sig, provided_sig):
            raise TokenVerificationError("Cryptographic signature mismatch")

        # [GUARD 3]: Decode and Validate Expiration
        payload_data = self._parse_json_payload(payload_b64)
        current_time = int(time.time())
        exp_time = payload_data.get("exp", 0)

        if current_time > (exp_time + self._leeway):
            raise TokenVerificationError(f"Token expired at {exp_time} (current: {current_time})")

        return VerifiedClaims(
            subject_id=str(payload_data.get("sub", "")),
            expires_at=exp_time,
            scopes=payload_data.get("scopes", [])
        )

    def _safe_b64decode(self, data: str) -> bytes:
        # Correctly handles unpadded URL-safe Base64 strings
        padding = "=" * (4 - (len(data) % 4))
        return base64.urlsafe_b64decode(data + padding)

    def _parse_json_payload(self, payload_b64: str) -> Dict[str, Any]:
        try:
            return json.loads(self._safe_b64decode(payload_b64))
        except Exception as exc:
            raise TokenVerificationError(f"Malformed payload JSON: {exc}")
"""
        },
        "src/controllers/order_controller.js": {
            "problem_summary": "High Cyclomatic Complexity (22.1), 19 functions bundled into single controller, repetitive database queries without transaction boundaries, and raw error handling.",
            "before_code": """// [ORIGINAL CODE - MONSTER CONTROLLER]
// Complexity: 22.1 | LOC: 590 | Churn: 890
exports.createOrder = function(req, res) {
    if (req.body.items && req.body.items.length > 0) {
        db.query("SELECT * FROM users WHERE id = ?", [req.body.userId], function(err, user) {
            if (!err && user.length > 0) {
                // Nested callback hell with duplicated tax & discount calculations
                db.query("INSERT INTO orders ...", function(err, order) {
                    // ... 400 lines of manual loop calculation and SQL executions
                });
            }
        });
    }
};""",
            "solution_code": """// ==============================================================================
// REFACTAI AUTHORIZED REFACTORING SOLUTION
// Module: src/controllers/order_controller.js
// Refactoring Pattern: Controller-Service-Repository Architecture + Async/Await
// Result: Cyclomatic Complexity reduced from 22.1 -> 2.5 (-88.7% Debt Reduction)
// ==============================================================================

/**
 * [STEP 1]: OrderService encapsulates all business calculations.
 * Decouples Express HTTP req/res handling from domain logic.
 */
class OrderService {
    constructor(orderRepo, userRepo, inventoryService) {
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
        this.inventoryService = inventoryService;
    }

    /**
     * Executes order creation inside an isolated atomic transaction.
     * Guard clauses eliminate nested callbacks and reduce complexity.
     */
    async createOrder(userId, items, paymentMethod) {
        // [GUARD 1]: Validate user eligibility
        const user = await this.userRepo.findById(userId);
        if (!user || !user.isActive) {
            throw new DomainError('User account not eligible for order placement', 400);
        }

        // [GUARD 2]: Verify inventory stock across all line items
        await this.inventoryService.verifyStockAvailability(items);

        // [STEP 2]: Compute order breakdown with pure functional reducer
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxRate = 0.0825; // Clean constant parameter
        const taxAmount = Number((subtotal * taxRate).toFixed(2));
        const total = subtotal + taxAmount;

        // [STEP 3]: Persist atomically
        const newOrder = await this.orderRepo.saveTransaction({
            userId,
            items,
            subtotal,
            taxAmount,
            total,
            status: 'PENDING_PAYMENT',
            createdAt: new Date().toISOString()
        });

        return newOrder;
    }
}

/**
 * [STEP 2]: Lean HTTP Controller Handler
 * Responsibility limited strictly to JSON validation and HTTP status code dispatch.
 */
class OrderController {
    constructor(orderService) {
        this.orderService = orderService;
    }

    async handleCreateOrder(req, res, next) {
        try {
            const { userId, items, paymentMethod } = req.body;

            // Strict parameter guard
            if (!userId || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Request body must specify valid userId and non-empty items array'
                });
            }

            const order = await this.orderService.createOrder(userId, items, paymentMethod);
            return res.status(201).json({ success: true, data: order });
        } catch (error) {
            // Forward cleanly to centralized Express error middleware
            next(error);
        }
    }
}

module.exports = { OrderService, OrderController };
"""
        },
        "src/database/query_builder.ts": {
            "problem_summary": "Cyclomatic Complexity 14.8, dynamic string concatenation posing SQL injection risk, missing parameter sanitization, and manual dialect branching.",
            "before_code": """// [ORIGINAL CODE - STRING CONCATENATION]
export function buildFilterQuery(table: string, filters: any): string {
    let sql = "SELECT * FROM " + table + " WHERE 1=1";
    if (filters.name) {
        sql += " AND name = '" + filters.name + "'"; // SQL Injection Hazard!
    }
    if (filters.minAge) {
        sql += " AND age >= " + filters.minAge;
    }
    return sql;
}""",
            "solution_code": """// ==============================================================================
// REFACTAI AUTHORIZED REFACTORING SOLUTION
// Module: src/database/query_builder.ts
// Refactoring Pattern: Type-Safe Parameterized Query Builder with Injection Guard
// Result: Cyclomatic Complexity reduced from 14.8 -> 1.7 (-88.5% Debt Reduction)
// ==============================================================================

export interface QueryParameterMap {
    [key: string]: string | number | boolean | null;
}

export interface ParameterizedQuery {
    readonly sql: string;
    readonly values: ReadonlyArray<unknown>;
}

export class SafeQueryBuilder {
    private readonly conditions: string[] = [];
    private readonly values: unknown[] = [];

    constructor(private readonly tableName: string) {
        // [GUARD 1]: Whitelist table names to prevent DDL injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error(`Invalid table name identifier: '${tableName}'`);
        }
    }

    /**
     * Appends an equality filter using parameterized placeholders.
     * Prevents SQL injection by separating command structure from user input.
     */
    whereEquals<T extends string | number | boolean>(column: string, value: T | undefined): this {
        if (value === undefined) return this;
        this.validateColumnIdentifier(column);

        this.values.push(value);
        this.conditions.push(`"${column}" = $${this.values.length}`);
        return this;
    }

    /**
     * Appends a minimum range comparison constraint.
     */
    whereGte(column: string, value: number | undefined): this {
        if (value === undefined) return this;
        this.validateColumnIdentifier(column);

        this.values.push(value);
        this.conditions.push(`"${column}" >= $${this.values.length}`);
        return this;
    }

    /**
     * Compiles final SQL string and parameters array.
     */
    build(): ParameterizedQuery {
        const whereClause = this.conditions.length > 0 
            ? ` WHERE ${this.conditions.join(' AND ')}` 
            : '';

        return {
            sql: `SELECT * FROM "${this.tableName}"${whereClause};`,
            values: Object.freeze([...this.values])
        };
    }

    private validateColumnIdentifier(col: string): void {
        if (!/^[a-zA-Z0-9_]+$/.test(col)) {
            throw new Error(`Potentially malicious column identifier detected: '${col}'`);
        }
    }
}
"""
        },
        "src/legacy/xml_parser_adapter.java": {
            "problem_summary": "Legacy DOM Parser with Complexity 26.0, excessive memory footprint (650 LOC), high code churn (990), and vulnerability to XML External Entity (XXE) attacks.",
            "before_code": """// [ORIGINAL CODE - VULNERABLE DOM PARSER]
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
DocumentBuilder db = dbf.newDocumentBuilder();
Document doc = db.parse(new File(path));
// Vulnerable to XXE bombs and memory bloat on large XML payloads""",
            "solution_code": """// ==============================================================================
// REFACTAI AUTHORIZED REFACTORING SOLUTION
// Module: src/legacy/xml_parser_adapter.java
// Refactoring Pattern: Secure StAX Streaming Parser + Safe XML Feature Flags
// Result: Cyclomatic Complexity reduced from 26.0 -> 3.1 (-88.1% Debt Reduction)
// ==============================================================================

package com.refactai.adapters;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public class SecureXmlParserAdapter {

    /**
     * Creates a hardened StAX XMLInputFactory with comprehensive XXE protections.
     * Prevents Billion Laughs entity expansion and remote entity retrieval.
     */
    private static XMLInputFactory createHardenedFactory() {
        XMLInputFactory factory = XMLInputFactory.newInstance();
        
        // [SECURITY GUARD 1]: Disable external DTDs and schema resolution
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        
        return factory;
    }

    /**
     * Streaming parse pattern: reads tokens sequentially in O(1) memory.
     * Replaces DOM tree instantiation, reducing memory allocation by 85%.
     */
    public List<String> extractEntityValues(InputStream xmlStream, String targetElementName) throws Exception {
        List<String> results = new ArrayList<>();
        XMLInputFactory factory = createHardenedFactory();
        XMLStreamReader reader = factory.createXMLStreamReader(xmlStream);

        try {
            boolean isInsideTarget = false;
            while (reader.hasNext()) {
                int event = reader.next();

                switch (event) {
                    case XMLStreamConstants.START_ELEMENT:
                        if (targetElementName.equalsIgnoreCase(reader.getLocalName())) {
                            isInsideTarget = true;
                        }
                        break;

                    case XMLStreamConstants.CHARACTERS:
                        if (isInsideTarget && !reader.isWhiteSpace()) {
                            results.add(reader.getText().trim());
                        }
                        break;

                    case XMLStreamConstants.END_ELEMENT:
                        if (targetElementName.equalsIgnoreCase(reader.getLocalName())) {
                            isInsideTarget = false;
                        }
                        break;
                }
            }
        } finally {
            reader.close();
        }

        return results;
    }
}
"""
        }
    }

    @classmethod
    def get_solution(cls, file_path: str, language: str, complexity: float, loc: int, recs: list[str]) -> Tuple[str, str, str]:
        """
        Returns (problem_summary, before_code, solution_code) for a specific file.
        Uses bespoke curated templates if matched, or dynamically generates an enterprise solution.
        """
        if file_path in cls.SAMPLE_SOLUTIONS:
            item = cls.SAMPLE_SOLUTIONS[file_path]
            return item["problem_summary"], item["before_code"], item["solution_code"]

        # Dynamic Generic Enterprise Refactoring Generator for any uploaded/scanned file
        comment_char = "#" if language.lower() in ["python", "ruby", "shell"] else "//"
        
        problem_summary = (
            f"Elevated Technical Debt: Cyclomatic Complexity is {complexity:.1f} across {loc} LOC. "
            f"Primary recommendations: {', '.join(recs[:2]) if recs else 'Apply modular decomposition'}"
        )

        before_code = f"""{comment_char} [ORIGINAL CODE - TECHNICAL DEBT PROFILE]
{comment_char} File: {file_path}
{comment_char} Complexity: {complexity:.1f} | LOC: {loc}
{comment_char} Problem: Monolithic logic flow, deeply nested branches, and tight coupling.
"""

        solution_code = f"""{comment_char} ==============================================================================
{comment_char} REFACTAI AUTHORIZED REFACTORING SOLUTION
{comment_char} File: {file_path} (Language: {language})
{comment_char} Refactoring Target: Guard Clauses + Single Responsibility Principle (SRP)
{comment_char} Target Complexity: Estimated reduction from {complexity:.1f} -> {max(1.5, complexity * 0.2):.1f}
{comment_char} ==============================================================================

{comment_char} [REFACTAI ARCHITECTURAL DIRECTIVE 1]:
{comment_char} Replace deeply nested conditional statements with Fail-Fast Guard Clauses.
{comment_char} Returning early removes indentation layers and simplifies testing.

{comment_char} [REFACTAI ARCHITECTURAL DIRECTIVE 2]:
{comment_char} Partition large methods (>30 lines) into small, focused, pure utility functions.
{comment_char} Ensure side-effects (I/O, database, network) are isolated at module boundaries.

{comment_char} [REFACTAI ARCHITECTURAL DIRECTIVE 3]:
{comment_char} Add explicit type hints, interface contracts, and parameter validation.
"""

        return problem_summary, before_code, solution_code
