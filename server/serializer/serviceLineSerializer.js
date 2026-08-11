const serializeServiceLineService = (serviceLineService) => {
  return {
    id: serviceLineService.id,
    name: serviceLineService.name,
    service_line_id: serviceLineService.service_line_id,
  };
};

const serializeServiceLine = (serviceLine) => {
  return {
    id: serviceLine.id,
    name: serviceLine.name,
    services: serviceLine.ServiceLineServices.map(serializeServiceLineService),
  };
};

export default serializeServiceLine;
