const serializeContact = (contact) => {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    contact_role: contact.ContactRole ? contact.ContactRole.name : null,
  };
};

export default serializeContact;
