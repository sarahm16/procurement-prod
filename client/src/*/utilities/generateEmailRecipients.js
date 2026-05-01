export const generateEmailRecipients = (emailArray) => {
  return emailArray.map((email) => ({
    emailAddress: {
      address: email,
    },
  }));
};
