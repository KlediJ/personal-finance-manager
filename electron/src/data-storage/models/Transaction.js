"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionSubtype = exports.TransactionStatus = exports.TransactionType = void 0;
var TransactionType;
(function (TransactionType) {
    TransactionType["INCOME"] = "income";
    TransactionType["EXPENSE"] = "expense";
    TransactionType["TRANSFER"] = "transfer";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["CLEARED"] = "cleared";
    TransactionStatus["RECONCILED"] = "reconciled";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionSubtype;
(function (TransactionSubtype) {
    TransactionSubtype["STANDARD"] = "standard";
    TransactionSubtype["CREDIT_CARD_PURCHASE"] = "credit_card_purchase";
    TransactionSubtype["CREDIT_CARD_PAYMENT"] = "credit_card_payment";
    TransactionSubtype["CREDIT_CARD_REFUND"] = "credit_card_refund";
    TransactionSubtype["LOAN_PAYMENT"] = "loan_payment";
    TransactionSubtype["LOAN_ADVANCE"] = "loan_advance";
    TransactionSubtype["INTERNAL_TRANSFER"] = "internal_transfer";
})(TransactionSubtype || (exports.TransactionSubtype = TransactionSubtype = {}));
//# sourceMappingURL=Transaction.js.map