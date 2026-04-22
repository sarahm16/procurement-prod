const services = {
  Snow: [
    "Lot Snow Removal Rate",
    "Lot Deicing",
    "Walkway Snow Removal Rate",
    "Walkway Deicing",
    "Municipal Snow Removal Rate",
    "Municipal Deicing",
    "Front Loader",
    "Hauling",
    "Bobcat",
    "Dump Truck",
    "Dump Trailer",
    "Skidsteer",
    "Roof/Gas Canopy Shoveling",
    "Snow Raking Roofline",
    "Snow Shoveling",
    "Snow Stacking",
    "Deicing Entire Grounds",
    "Material",
  ],
  "Lot Sweeping": [
    "Lot Sweeping Rate",
    "Portering Rate",
    "Lot Pressure Washing Rate",
    "Walkway Pressure Washing Rate",
  ],
  Landscaping: [
    "Routine Maintenance Rate",
    "Mulch Rate",
    "Fertilizer Rate",
    "Pruning Rate",
    "Irrigation On/Off (Includes Fall Blowout) Rate",
    "Spring Cleanup Rate",
    "Fall Cleanup Rate",
    "Aeration/Overseed (Fall) Rate",
    "Storm/Emergency Cleanup Rate",
    "Turf Management Rate",
    "Pre Emergent",
    "Wet Test",
    "Irrigation On Rate",
    "Irrigation Off Rate",
  ],
};

async function seedServices(prisma) {
  const serviceLines = await prisma.ServiceLines.findMany();
  console.log("Fetched service lines:", serviceLines);

  for (const [serviceLineName, serviceList] of Object.entries(services)) {
    const serviceLine = serviceLines.find((sl) => sl.name === serviceLineName);
    console.log("Matched service line:", serviceLine);

    if (!serviceLine) {
      console.warn(`Service line not found for name: ${serviceLineName}`);
      continue;
    }

    await prisma.ServiceLineServices.createMany({
      data: serviceList.map((serviceName) => ({
        name: serviceName,
        service_line_id: serviceLine.id,
      })),
    });
  }
}

export default seedServices;
