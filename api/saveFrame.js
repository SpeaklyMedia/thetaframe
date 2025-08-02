// api/saveFrame.js
const { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    view, identity, top3, micros, reward, reflection,
    weeklyTheme, weeklySteps, nonNegotiables, recovery,
    visionGoals, visionSteps
  } = req.body;

  const auth = new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });

  let range, values;

  if (view === 'daily') {
    const day = new Date().toLocaleString('en-US', { weekday: 'long' });
    range = `Daily Frame!A2:F2`;
    values = [[day, identity, top3.join('\n'), micros.join('\n'), reward, reflection]];
  } else if (view === 'weekly') {
    range = `Weekly Rhythm!A2:E2`;
    values = [["This Week", weeklyTheme, weeklySteps.join('\n'), nonNegotiables.join('\n'), recovery]];
  } else if (view === 'vision') {
    range = `Vision Tracker!A2:C2`;
    values = [["Vision", visionGoals.join('\n'), visionSteps.join('\n')]];
  }

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values }
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Sheets write error:", error);
    res.status(500).json({ error: 'Failed to write to sheet' });
  }
}
