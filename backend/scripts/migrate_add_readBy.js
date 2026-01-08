import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Message } from '../models/messageModel.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    console.log('Starting migration: initialize readBy for existing messages');

    const cursor = Message.find().cursor();
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      if (!doc.readBy || doc.readBy.length === 0) {
        // mark sender as having read their own message
        if (doc.sender) {
          doc.readBy = [doc.sender];
        } else {
          doc.readBy = [];
        }
        await doc.save();
        count++;
      }
    }

    console.log(`Migration complete. Initialized readBy on ${count} messages.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

run();
