"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountClass = exports.AccountType = void 0;
var AccountType;
(function (AccountType) {
    AccountType["CHECKING"] = "checking";
    AccountType["SAVINGS"] = "savings";
    AccountType["CREDIT_CARD"] = "credit_card";
    AccountType["INVESTMENT"] = "investment";
    AccountType["LOAN"] = "loan";
    AccountType["CASH"] = "cash";
})(AccountType || (exports.AccountType = AccountType = {}));
var AccountClass;
(function (AccountClass) {
    AccountClass["ASSET"] = "Asset";
    AccountClass["LIABILITY"] = "Liability";
    AccountClass["EQUITY"] = "Equity";
    AccountClass["INCOME"] = "Income";
    AccountClass["EXPENSE"] = "Expense";
})(AccountClass || (exports.AccountClass = AccountClass = {}));
//# sourceMappingURL=Account.js.map