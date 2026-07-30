import { PrismaClient } from "@prisma/client";
import existingEmployees from "./existingEmployees.js";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const prisma = new PrismaClient();
const groups = [
  {
    id: "fdd3110a-a585-4d2d-91ef-5f9d1f8f7fc2",
    deletedDateTime: null,
    classification: null,
    createdDateTime: "2022-05-06T00:58:48Z",
    creationOptions: ["Team", "ExchangeProvisioningFlags:3552"],
    description: "Evergreen Brands",
    displayName: "Evergreen Brands",
    expirationDateTime: null,
    groupTypes: ["Unified"],
    infoCatalogs: [],
    isAssignableToRole: null,
    mail: "EB-Employees@evergreenbrands.com",
    mailEnabled: true,
    mailNickname: "EB-Employees",
    membershipRule: null,
    membershipRuleProcessingState: null,
    onPremisesDomainName: null,
    onPremisesLastSyncDateTime: null,
    onPremisesNetBiosName: null,
    onPremisesSamAccountName: null,
    onPremisesSecurityIdentifier: null,
    onPremisesSyncEnabled: null,
    preferredDataLocation: null,
    preferredLanguage: null,
    proxyAddresses: [
      "SPO:SPO_2b24b7a8-5bcc-466d-89f6-8716d8dfda2d@SPO_bf798cec-bd0a-4b4a-9558-d9c441cac4d6",
      "smtp:EvergreenBrands@EvergreenBrandsLLC.onmicrosoft.com",
      "SMTP:EB-Employees@evergreenbrands.com",
    ],
    renewedDateTime: "2022-05-06T00:58:48Z",
    resourceBehaviorOptions: [
      "HideGroupInOutlook",
      "SubscribeMembersToCalendarEventsDisabled",
      "WelcomeEmailDisabled",
    ],
    resourceProvisioningOptions: ["Team"],
    securityEnabled: false,
    securityIdentifier: "S-1-12-1-4258468106-1294837125-2640310161-3263139615",
    theme: null,
    uniqueName: null,
    visibility: "Public",
    onPremisesProvisioningErrors: [],
    serviceProvisioningErrors: [],
  },
  {
    id: "6c31fb4f-9bab-4fb5-8dcc-bd6de185dcec",
    deletedDateTime: null,
    classification: null,
    createdDateTime: "2024-12-02T19:19:59Z",
    creationOptions: [],
    description: "EB employees to the NFC Domain",
    displayName: "EB-NFC - Access",
    expirationDateTime: null,
    groupTypes: [],
    infoCatalogs: [],
    isAssignableToRole: false,
    mail: null,
    mailEnabled: false,
    mailNickname: "00000000-0000-0000-0000-000000000000",
    membershipRule: null,
    membershipRuleProcessingState: null,
    onPremisesDomainName: null,
    onPremisesLastSyncDateTime: null,
    onPremisesNetBiosName: null,
    onPremisesSamAccountName: null,
    onPremisesSecurityIdentifier: null,
    onPremisesSyncEnabled: null,
    preferredDataLocation: null,
    preferredLanguage: null,
    proxyAddresses: [],
    renewedDateTime: "2024-12-02T19:19:59Z",
    resourceBehaviorOptions: [],
    resourceProvisioningOptions: [],
    securityEnabled: true,
    securityIdentifier: "S-1-12-1-1815214927-1337301931-1841155213-3973875169",
    theme: null,
    uniqueName: null,
    visibility: null,
    onPremisesProvisioningErrors: [],
    serviceProvisioningErrors: [],
  },
];

async function migrateExistingEmployees() {
  const filteredEmployees = existingEmployees
    .filter(
      (employee) =>
        !employee.displayName?.includes("-") &&
        employee.mail &&
        employee.displayName,
    )
    .map((employee) => ({
      name: employee.displayName,
      email: employee.mail,
      ms_user_id: employee.id,
    }));

  const createdEmployees = await prisma.employees.createMany({
    data: filteredEmployees,
  });
}

migrateExistingEmployees();
