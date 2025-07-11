"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentFrequency = exports.LoanType = void 0;
var LoanType;
(function (LoanType) {
    LoanType["MORTGAGE"] = "mortgage";
    LoanType["AUTO"] = "auto";
    LoanType["PERSONAL"] = "personal";
    LoanType["STUDENT"] = "student";
    LoanType["BUSINESS"] = "business";
    LoanType["HOME_EQUITY"] = "home_equity";
})(LoanType || (exports.LoanType = LoanType = {}));
var PaymentFrequency;
(function (PaymentFrequency) {
    PaymentFrequency["MONTHLY"] = "monthly";
    PaymentFrequency["BIWEEKLY"] = "biweekly";
    PaymentFrequency["WEEKLY"] = "weekly";
    PaymentFrequency["QUARTERLY"] = "quarterly";
})(PaymentFrequency || (exports.PaymentFrequency = PaymentFrequency = {}));
//# sourceMappingURL=LoanDetails.js.map