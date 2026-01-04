import { AppDataSource } from './src/database/data-source';

async function checkEvents() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected\n');

    // Check analytics events table
    const analyticsEvents = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM analytics_events
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    console.log('=== ANALYTICS EVENTS (Last 24 hours) ===');
    console.log('Total events:', analyticsEvents[0].total);

    if (analyticsEvents[0].total > 0) {
      const recentEvents = await AppDataSource.query(`
        SELECT event_name, event_type, session_id, timestamp
        FROM analytics_events
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      console.log('\nRecent events:');
      recentEvents.forEach((evt: any, idx: number) => {
        console.log('  ' + (idx + 1) + '. ' + evt.event_name + ' (' + evt.event_type + ')');
        console.log('     Session: ' + evt.session_id);
        console.log('     Time: ' + evt.timestamp);
      });
    }

    // Check RUM events table
    const rumEvents = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM rum_events
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    console.log('\n\n=== RUM EVENTS (Last 24 hours) ===');
    console.log('Total events:', rumEvents[0].total);

    if (rumEvents[0].total > 0) {
      const recentRumEvents = await AppDataSource.query(`
        SELECT event_name, event_type, session_id, timestamp
        FROM rum_events
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      console.log('\nRecent RUM events:');
      recentRumEvents.forEach((evt: any, idx: number) => {
        console.log('  ' + (idx + 1) + '. ' + evt.event_name + ' (' + evt.event_type + ')');
        console.log('     Session: ' + evt.session_id);
        console.log('     Time: ' + evt.timestamp);
      });
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEvents();
