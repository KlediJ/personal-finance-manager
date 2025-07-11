"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillPaymentStatus = exports.BillFrequency = void 0;
var BillFrequency;
(function (BillFrequency) {
    BillFrequency["WEEKLY"] = "weekly";
    BillFrequency["BIWEEKLY"] = "biweekly";
    BillFrequency["MONTHLY"] = "monthly";
    BillFrequency["QUARTERLY"] = "quarterly";
    BillFrequency["ANNUAL"] = "annual";
})(BillFrequency || (exports.BillFrequency = BillFrequency = {}));
var BillPaymentStatus;
(function (BillPaymentStatus) {
    BillPaymentStatus["PENDING"] = "pending";
    BillPaymentStatus["PAID"] = "paid";
    BillPaymentStatus["OVERDUE"] = "overdue";
    BillPaymentStatus["PARTIAL"] = "partial";
})(BillPaymentStatus || (exports.BillPaymentStatus = BillPaymentStatus = {}));
//# sourceMappingURL=RecurringBill.js.map