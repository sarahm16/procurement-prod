import getAccountingToken from "../services/pandadoc/tokens/accountingToken.js";

const token = await getAccountingToken();
console.log("Fetched accounting token:", token);
