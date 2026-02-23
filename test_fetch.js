require('dotenv').config();

async function testFetch() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/notification_settings?select=*';
  const apiKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const res = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': 'Bearer ' + apiKey
    }
  });
  const data = await res.json();
  console.log("DB DATA:", data);
}
testFetch();
