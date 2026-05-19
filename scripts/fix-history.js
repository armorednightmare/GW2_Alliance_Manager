const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.memberHistory.findMany({
    where: {
      eventType: { in: ['KICKED', 'LEFT'] }
    }
  });

  let fixedCount = 0;
  for (const event of events) {
    let needsUpdate = false;
    let newOldValue = event.oldValue;
    let newNewValue = event.newValue;

    // Case 1: Kicked (via API) - oldValue starts with "Aus "
    if (event.oldValue && event.oldValue.startsWith('Aus ') && event.newValue) {
      // It was: oldValue="Aus Guild [TAG] entfernt...", newValue="Guild [TAG]"
      // It should be: oldValue="Guild [TAG]", newValue="Entfernt (durch ...)"
      newOldValue = event.newValue;
      newNewValue = event.oldValue.replace(/^Aus .*? entfernt \(durch /, 'Entfernt (durch ').replace(/\)$/, ')');
      // If regex doesn't match perfectly, fallback to just swapping
      if (newNewValue === event.oldValue) {
         newNewValue = event.oldValue;
      }
      needsUpdate = true;
    } 
    // Case 2: Kicked (Manual) - oldValue starts with "Manuell entfernt"
    else if (event.oldValue && event.oldValue.startsWith('Manuell entfernt') && event.newValue) {
      newOldValue = event.newValue;
      newNewValue = event.oldValue;
      needsUpdate = true;
    }
    // Case 3: Left (via API) - oldValue is null/undefined, newValue has guild
    else if (event.eventType === 'LEFT' && !event.oldValue && event.newValue && event.newValue !== 'Verlassen') {
      newOldValue = event.newValue;
      newNewValue = 'Verlassen';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.memberHistory.update({
        where: { id: event.id },
        data: {
          oldValue: newOldValue,
          newValue: newNewValue
        }
      });
      fixedCount++;
    }
  }
  console.log(`Erfolgreich ${fixedCount} alte Historien-Einträge korrigiert.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
