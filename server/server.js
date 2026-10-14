const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await Promise.all(['User', 'AuthSession', 'AuthChallenge', 'Notification'].map(name => require(`./models/${name}`).init()));
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
start().catch(error => { console.error('Unable to initialize authentication:', error.name); process.exitCode = 1; });

// Publish scheduled classwork, check session reminders, and auto-grade missed materials every 30 seconds
const { publishDueMaterials } = require('./controllers/materialController');
const { checkUpcomingSessionReminders } = require('./services/sessionReminderService');
const { autoGradeMissedMaterials } = require('./services/autoGradeService');
const materialPublisher = setInterval(() => {
  if (require('mongoose').connection.readyState === 1) {
    publishDueMaterials().catch((error) => console.error('Classwork scheduler:', error.name));
    checkUpcomingSessionReminders().catch((error) => console.error('Session reminder scheduler:', error.name));
    autoGradeMissedMaterials().catch((error) => console.error('Auto grade scheduler:', error.name));
  }
}, 30000);
materialPublisher.unref();
