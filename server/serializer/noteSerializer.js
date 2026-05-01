import serializeReply from "./replySerializer.js";

const serializeNote = (note) => {
  return {
    id: note.id,
    body: note.body,
    date: note.date,
    author_name: note.Author ? note.Author.name : "Unknown",
    tagged_users: note.NoteTaggedUsers.map((tu) =>
      tu.TaggedUser ? tu.TaggedUser.name : "Unknown",
    ),
    replies: (note.Replies || []).map(serializeReply),
  };
};

export default serializeNote;
