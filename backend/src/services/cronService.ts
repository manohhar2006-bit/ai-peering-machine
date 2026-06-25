import cron from 'node-cron';
import { Doubt, Escalation } from '../models/Schemas';

export const initCronJobs = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running auto-escalation cron job...');
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find all doubts with status "open" created more than 24 hours ago
      const doubtsToEscalate = await Doubt.find({
        status: 'open',
        createdAt: { $lt: twentyFourHoursAgo }
      });

      for (const doubt of doubtsToEscalate) {
        doubt.status = 'escalated';
        doubt.escalatedAt = new Date();
        await doubt.save();

        // Check if an escalation record already exists
        const existingEscalation = await Escalation.findOne({ doubtId: doubt._id, status: 'pending' });
        if (!existingEscalation) {
          const escalation = new Escalation({
            doubtId: doubt._id,
            reason: 'timeout',
            status: 'pending',
            priority: 'medium'
          });
          await escalation.save();
        }
        console.log(`Doubt "${doubt.title}" auto-escalated to teacher (timeout).`);
      }
    } catch (error) {
      console.error('Error in auto-escalation cron job:', error);
    }
  });
  console.log('Auto-escalation cron job scheduled to run every 1 hour.');
};
