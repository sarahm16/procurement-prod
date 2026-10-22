# Ops work order page — wiring the Messages tab

1. Copy `tabs/MessagesTab/` into `workorder-detail/tabs/`.

2. Delete `tabs/FieldActivityTab/CommunicationsThread.jsx`, and in
   `FieldActivityTab.jsx` remove its import and the
   `{/* 3. Communications thread */} <CommunicationsThread />` lines.
   Field Activity keeps check-in/out and before/after photos.

3. In `WorkorderDetail.jsx`, import the tab and add it after Field Activity:

   ```js
   import MessagesTab from "./tabs/MessagesTab/MessagesTab";
   ```

   ```js
   {
     label: "Messages",
     content: <MessagesTab />,
   },
   ```

4. In `WorkOrderDetailProvider.jsx`, `addCommunication` catches its own
   errors, so the thread can't show "Couldn't send". Re-throw after logging:

   ```js
       } catch (error) {
         console.error("error saving communication", error);
         throw error;           // ← add
       }
   ```

Nothing else in the provider changes: it already passes `{ channel, content }`
through with `user_id` and appends the reply to `fieldActivity.communications`.
