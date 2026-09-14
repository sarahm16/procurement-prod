const serializeContact = (contact) => ({
  id: contact.id,
  name: contact.name,
  email: contact.email,
  phone: contact.phone,
  contact_role_id: contact.contact_role_id,
  role_name: contact.ContactRole?.name ?? null, // ← flatten the role
});

export default serializeContact;
