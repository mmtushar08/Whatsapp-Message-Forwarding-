// Sets required environment variables before tests run.
// Uses mock/dummy values — no real credentials needed.
process.env['WHATSAPP_ACCESS_TOKEN'] = 'test_token';
process.env['WHATSAPP_PHONE_NUMBER_ID'] = '123456789';
process.env['FORWARD_TO_NUMBER'] = '9876543210';
process.env['WEBHOOK_VERIFY_TOKEN'] = 'test_verify_token';
process.env['ADMIN_TOKEN'] = 'test_admin_token';
process.env['LOG_LEVEL'] = 'silent';
// Use a temporary path for the SQLite DB during tests
process.env['DB_PATH'] = '/tmp/test-forwarder.db';
