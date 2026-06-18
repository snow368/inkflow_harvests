import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const app = initializeApp({
    projectId: 'gen-lang-client-0029855360',
    databaseURL: 'https://gen-lang-client-0029855360.firebaseio.com'
  });
  const db = getFirestore(app, 'ai-studio-fdd43a35-6e73-47fa-8125-b804dd3f9ad5');

  // Read artists collection
  const snap = await db.collection('artists').limit(5).get();
  console.log(`Found ${snap.size} docs (limit 5)`);
  snap.forEach(d => console.log('  doc:', d.id, '-> uid:', d.data()?.uid));

  console.log('Done');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
