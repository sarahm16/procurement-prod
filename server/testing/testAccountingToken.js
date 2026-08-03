import getAccountingToken from "../services/pandadoc/accountingToken.js";

const token = await getAccountingToken();
console.log("Fetched accounting token:", token);
