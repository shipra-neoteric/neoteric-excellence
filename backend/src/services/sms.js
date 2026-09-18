// Sends the OTP via Fast2SMS when FAST2SMS_API_KEY is set; otherwise falls back to
// dev mode (logs the code and returns it in the API response) so OTP login stays
// testable without a provider account.
export async function sendOtp(phone, code) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.log(`[dev] OTP for ${phone}: ${code}`);
    return { devCode: code };
  }

  const body = new URLSearchParams({
    sender_id: process.env.FAST2SMS_SENDER_ID || 'NEOTER',
    message: process.env.FAST2SMS_MESSAGE_ID || '',
    variables_values: code,
    route: 'dlt',
    numbers: phone,
  });

  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok || data.return !== true) {
    throw new Error(`Fast2SMS send failed: ${JSON.stringify(data)}`);
  }
  return data;
}
