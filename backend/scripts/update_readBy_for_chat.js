import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Message } from '../models/messageModel.js';
import { Chat } from '../models/chatModel.js';

dotenv.config();

const usage = () => {
  console.log('Usage: node scripts/update_readBy_for_chat.js --chatId=<CHAT_ID> [--add=USER_ID[,USER_ID...]] [--all] [--dry-run]');
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { dryRun: false, add: [] };
  for (const a of args) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--all') out.all = true;
    else if (a.startsWith('--chatId=')) out.chatId = a.split('=')[1];
    else if (a.startsWith('--add=')) out.add = a.split('=')[1].split(',').filter(Boolean);
  }
  if (!out.chatId) usage();
  return out;
};

const run = async () => {
  const { chatId, add, all, dryRun } = parseArgs();
  try {
    await connectDB();
    console.log(`Preparing to update messages in chat ${chatId}` + (dryRun ? ' (dry-run)' : ''));

    let toAdd = add.slice();
    if (all) {
      const chat = await Chat.findById(chatId).select('users');
      if (!chat) {
        console.error('Chat not found:', chatId);
        process.exit(1);
      }
      toAdd = Array.from(new Set([...toAdd, ...(chat.users || []).map(String)]));
    }

    if (toAdd.length === 0) {
      console.log('No user IDs provided to add. Use --add or --all.');
      usage();
    }

    // iterate messages in the chat
    const cursor = Message.find({ chat: chatId }).cursor();
    let scanned = 0;
    let changed = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      scanned++;
      const initial = Array.isArray(doc.readBy) ? doc.readBy.map(String) : [];
      const set = new Set(initial);
      for (const u of toAdd) set.add(String(u));
      const finalArr = Array.from(set);
      if (finalArr.length !== initial.length) {
        changed++;
        if (!dryRun) {
          doc.readBy = finalArr;
          await doc.save();
        }
      }
    }

    console.log(`Done. Messages scanned: ${scanned}. Messages changed: ${changed}.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
};

run();
